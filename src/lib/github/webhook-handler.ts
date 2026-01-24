/**
 * GitHub Webhook Handler
 *
 * Processes incoming GitHub webhook events, validates signatures,
 * and dispatches events to appropriate handlers.
 */

import { EventEmitter } from 'events';
import type {
  GitHubWebhookEvent,
  WebhookEvent,
  WebhookConfig,
  PullRequestWebhookPayload,
  PRAction,
  SignatureVerificationResult,
} from './webhook';
import { validateWebhookConfig, shouldTriggerReview, extractPRInfo, isPRWebhookEvent } from './webhook';
import type { DetectedPullRequest } from '../../worker/pr-monitor';
import type { ProcessPRParams, ProcessPRResult } from '../../worker/review-processor';
import { ReviewProcessor } from '../../worker/review-processor';
import { log } from '../remote-log';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration for the webhook handler
 */
export interface WebhookHandlerConfig {
  /** Webhook configuration */
  webhook: WebhookConfig;
  /** Review processor configuration (optional) */
  reviewProcessor?: ReviewProcessor;
  /** Whether to automatically process PR reviews */
  autoProcess?: boolean;
  /** Repository whitelist (empty means all repositories) */
  allowedRepositories?: Array<{ owner: string; repo: string }>;
}

/**
 * Webhook processing result
 */
export interface WebhookProcessResult {
  success: boolean;
  eventId: string;
  eventType: GitHubWebhookEvent;
  action?: string;
  repository?: string;
  reviewResult?: ProcessPRResult;
  error?: string;
  processedAt: string;
}

/**
 * Event types emitted by the webhook handler
 */
export type WebhookHandlerEventType = 'webhook_received' | 'pr_event' | 'error' | 'review_completed';

/**
 * Event data for webhook received
 */
export interface WebhookReceivedEvent {
  type: 'webhook_received';
  event: WebhookEvent;
}

/**
 * Event data for PR event
 */
export interface PREventData {
  type: 'pr_event';
  action: PRAction;
  pr: DetectedPullRequest;
  repository: { owner: string; repo: string };
}

/**
 * Event data for error
 */
export interface WebhookErrorEvent {
  type: 'error';
  error: string;
  event?: WebhookEvent;
}

/**
 * Event data for review completed
 */
export interface ReviewCompletedEvent {
  type: 'review_completed';
  result: ProcessPRResult;
  repository: { owner: string; repo: string };
  prNumber: number;
}

/**
 * Union type for all handler events
 */
export type WebhookHandlerEvent = WebhookReceivedEvent | PREventData | WebhookErrorEvent | ReviewCompletedEvent;

// ============================================================================
// Webhook Handler Class
// ============================================================================

/**
 * Webhook Handler - Processes incoming GitHub webhook events
 *
 * Handles signature verification, event parsing, and dispatches
 * to appropriate handlers. Supports both sync and async processing.
 *
 * @example
 * ```typescript
 * const handler = new WebhookHandler({
 *   webhook: {
 *     secret: process.env.GITHUB_WEBHOOK_SECRET!,
 *     processAsync: true,
 *   },
 *   autoProcess: true,
 * });
 *
 * handler.on('pr_event', (event) => {
 *   console.log(`PR ${event.action}: ${event.pr.title}`);
 * });
 *
 * handler.on('review_completed', (event) => {
 *   console.log(`Review completed: ${event.result.reviewId}`);
 * });
 *
 * const result = await handler.handleRequest(payload, signature, deliveryId);
 * ```
 */
export class WebhookHandler extends EventEmitter {
  private config: Required<WebhookHandlerConfig>;
  private reviewProcessor: ReviewProcessor;

  /**
   * Creates a new Webhook Handler instance
   * @param config - Configuration for the handler
   */
  constructor(config: WebhookHandlerConfig) {
    super();

    const webhookValidation = validateWebhookConfig(config.webhook);
    if (webhookValidation) {
      throw new Error(`Invalid webhook config: ${webhookValidation}`);
    }

    this.config = {
      webhook: {
        secret: config.webhook.secret,
        path: config.webhook.path || '/api/webhook/github',
        allowedEvents: config.webhook.allowedEvents,
        processAsync: config.webhook.processAsync ?? true,
      },
      reviewProcessor: config.reviewProcessor || new ReviewProcessor(),
      autoProcess: config.autoProcess ?? true,
      allowedRepositories: config.allowedRepositories || [],
    };

    this.reviewProcessor = this.config.reviewProcessor;
  }

  /**
   * Creates a Webhook Handler from environment variables
   * @returns WebhookHandler instance
   */
  static fromEnv(): WebhookHandler {
    return new WebhookHandler({
      webhook: {
        secret: process.env.GITHUB_WEBHOOK_SECRET || '',
        path: process.env.WEBHOOK_PATH,
        allowedEvents: process.env.WEBHOOK_ALLOWED_EVENTS?.split(',') as GitHubWebhookEvent[],
        processAsync: process.env.WEBHOOK_PROCESS_ASYNC !== 'false',
      },
      autoProcess: process.env.WEBHOOK_AUTO_PROCESS !== 'false',
    });
  }

  /**
   * Handles an incoming webhook request
   *
   * @param payload - The raw request body
   * @param signature - The X-Hub-Signature-256 header value
   * @param deliveryId - The X-GitHub-Delivery header value
   * @param eventType - The X-GitHub-Event header value
   * @returns WebhookProcessResult indicating success/failure
   */
  async handleRequest(
    payload: string,
    signature: string | null,
    deliveryId: string,
    eventType: string
  ): Promise<WebhookProcessResult> {
    const startTime = Date.now();

    // Verify signature
    const verification = this.verifySignature(payload, signature);
    if (!verification.valid) {
      await log.warn('Webhook signature verification failed', {
        deliveryId,
        error: verification.error,
      });

      return {
        success: false,
        eventId: deliveryId,
        eventType: 'ping' as GitHubWebhookEvent,
        error: verification.error,
        processedAt: new Date().toISOString(),
      };
    }

    // Parse the event type
    const parsedEventType = this.parseEventType(eventType);
    if (!parsedEventType) {
      await log.warn('Unknown webhook event type', { deliveryId, eventType });

      return {
        success: false,
        eventId: deliveryId,
        eventType: 'ping' as GitHubWebhookEvent,
        error: `Unknown event type: ${eventType}`,
        processedAt: new Date().toISOString(),
      };
    }

    // Check if event type is allowed
    if (!this.isEventAllowed(parsedEventType)) {
      await log.info('Webhook event type not allowed', {
        deliveryId,
        eventType: parsedEventType,
      });

      return {
        success: false,
        eventId: deliveryId,
        eventType: parsedEventType,
        error: `Event type not allowed: ${parsedEventType}`,
        processedAt: new Date().toISOString(),
      };
    }

    // Parse the payload
    let parsedPayload: PullRequestWebhookPayload;
    try {
      parsedPayload = JSON.parse(payload) as PullRequestWebhookPayload;
    } catch (error) {
      await log.warn('Invalid webhook payload', {
        deliveryId,
        error: error instanceof Error ? error.message : 'Parse error',
      });

      return {
        success: false,
        eventId: deliveryId,
        eventType: parsedEventType,
        error: 'Invalid JSON payload',
        processedAt: new Date().toISOString(),
      };
    }

    // Create the webhook event
    const event: WebhookEvent = {
      type: parsedEventType,
      id: deliveryId,
      payload: parsedPayload,
      deliveredAt: new Date().toISOString(),
      isRetry: false,
      attempt: 1,
    };

    // Emit received event
    this.emit('webhook_received', { type: 'webhook_received', event });

    // Check if repository is allowed
    const repository = parsedPayload.repository;
    if (!this.isRepositoryAllowed(repository.fullName)) {
      await log.info('Webhook from non-allowed repository', {
        deliveryId,
        repository: repository.fullName,
      });

      return {
        success: false,
        eventId: deliveryId,
        eventType: parsedEventType,
        repository: repository.fullName,
        error: `Repository not allowed: ${repository.fullName}`,
        processedAt: new Date().toISOString(),
      };
    }

    // Handle different event types
    let result: WebhookProcessResult;

    switch (parsedEventType) {
      case 'ping':
        result = await this.handlePing(event, repository.fullName);
        break;
      case 'pull_request':
        result = await this.handlePullRequest(event, startTime);
        break;
      default:
        await log.info('Unhandled webhook event type', {
          deliveryId,
          eventType: parsedEventType,
        });
        result = {
          success: true,
          eventId: deliveryId,
          eventType: parsedEventType,
          repository: repository.fullName,
          processedAt: new Date().toISOString(),
        };
    }

    return result;
  }

  /**
   * Handles a ping event
   */
  private async handlePing(event: WebhookEvent, repository: string): Promise<WebhookProcessResult> {
    await log.info('Webhook ping received', {
      eventId: event.id,
      repository,
      zen: (event.payload as { zen?: string }).zen || 'No message',
    });

    return {
      success: true,
      eventId: event.id,
      eventType: 'ping',
      repository,
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Handles a pull_request event
   */
  private async handlePullRequest(event: WebhookEvent, startTime: number): Promise<WebhookProcessResult> {
    const payload = event.payload as PullRequestWebhookPayload;
    const action = payload.action as PRAction;
    const repository = payload.repository;

    await log.info('Pull request webhook received', {
      eventId: event.id,
      action,
      repository: repository.fullName,
      prNumber: payload.number,
    });

    // Emit PR event
    const prInfo = extractPRInfo(
      payload.pullRequest,
      repository.owner.login,
      repository.name
    );

    this.emit('pr_event', {
      type: 'pr_event',
      action,
      pr: prInfo,
      repository: { owner: repository.owner.login, repo: repository.name },
    });

    // Check if we should trigger a review
    if (this.config.autoProcess && shouldTriggerReview(action)) {
      const processParams: ProcessPRParams = {
        owner: repository.owner.login,
        repo: repository.name,
        pullNumber: payload.number,
        prTitle: payload.pullRequest.title,
        prDescription: payload.pullRequest.body || undefined,
        authorName: payload.pullRequest.user.login,
      };

      const reviewResult = await this.processReview(processParams);

      return {
        success: reviewResult.success,
        eventId: event.id,
        eventType: 'pull_request',
        action,
        repository: repository.fullName,
        reviewResult,
        processedAt: new Date().toISOString(),
      };
    }

    return {
      success: true,
      eventId: event.id,
      eventType: 'pull_request',
      action,
      repository: repository.fullName,
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Processes a PR review
   */
  private async processReview(params: ProcessPRParams): Promise<ProcessPRResult> {
    try {
      const result = await this.reviewProcessor.processPR(params);

      if (result.success) {
        this.emit('review_completed', {
          type: 'review_completed',
          result,
          repository: { owner: params.owner, repo: params.repo },
          prNumber: params.pullNumber,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', {
        type: 'error',
        error: `Review processing failed: ${errorMessage}`,
      });

      return {
        success: false,
        error: errorMessage,
        errorCode: 'UNKNOWN',
        durationMs: 0,
      };
    }
  }

  /**
   * Verifies webhook signature
   */
  private verifySignature(
    payload: string,
    signature: string | null
  ): SignatureVerificationResult {
    return this.verifySignatureWithSecret(payload, signature, this.config.webhook.secret);
  }

  /**
   * Verifies signature with a specific secret (allows testing with different secrets)
   */
  verifySignatureWithSecret(
    payload: string,
    signature: string | null,
    secret: string
  ): SignatureVerificationResult {
    // Import the verify function dynamically to avoid circular imports
    // or use inline implementation
    if (!signature) {
      return { valid: false, error: 'Missing signature header (X-Hub-Signature-256)' };
    }

    if (!payload || typeof payload !== 'string') {
      return { valid: false, error: 'Invalid payload' };
    }

    try {
      const { createHmac, timingSafeEqual } = require('crypto');
      const hmac = createHmac('sha256', secret);
      hmac.update(payload, 'utf8');
      const expectedSignature = `sha256=${hmac.digest('hex')}`;

      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (signatureBuffer.length !== expectedBuffer.length) {
        return { valid: false, error: 'Signature length mismatch' };
      }

      const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);

      if (!isValid) {
        return { valid: false, error: 'Signature verification failed' };
      }

      return { valid: true };
    } catch (error) {
      if (error instanceof Error) {
        return { valid: false, error: `Signature verification error: ${error.message}` };
      }
      return { valid: false, error: 'Unknown signature verification error' };
    }
  }

  /**
   * Parses event type from header
   */
  private parseEventType(eventType: string | null): GitHubWebhookEvent | null {
    if (!eventType) {
      return null;
    }

    const validTypes: GitHubWebhookEvent[] = [
      'ping',
      'pull_request',
      'pull_request_review',
      'pull_request_review_comment',
      'push',
      'check_run',
      'check_suite',
    ];

    return validTypes.includes(eventType as GitHubWebhookEvent)
      ? (eventType as GitHubWebhookEvent)
      : null;
  }

  /**
   * Checks if an event type is allowed
   */
  private isEventAllowed(eventType: GitHubWebhookEvent): boolean {
    if (!this.config.webhook.allowedEvents) {
      return true;
    }
    return this.config.webhook.allowedEvents.includes(eventType);
  }

  /**
   * Checks if a repository is allowed
   */
  private isRepositoryAllowed(fullName: string): boolean {
    if (this.config.allowedRepositories.length === 0) {
      return true;
    }

    const [owner, repo] = fullName.split('/');
    return this.config.allowedRepositories.some(
      (r) => r.owner === owner && r.repo === repo
    );
  }

  /**
   * Gets the current configuration
   * @returns Current handler configuration (without secrets)
   */
  getConfig() {
    return {
      autoProcess: this.config.autoProcess,
      allowedRepositories: this.config.allowedRepositories,
      allowedEvents: this.config.webhook.allowedEvents,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a Webhook Handler with default configuration
 * @param config - Optional configuration overrides
 * @returns WebhookHandler instance
 */
export function createWebhookHandler(config?: Partial<WebhookHandlerConfig>): WebhookHandler {
  return new WebhookHandler(config || {});
}

/**
 * Creates a Webhook Handler configured for testing (auto-process disabled)
 * @param config - Optional configuration overrides
 * @returns WebhookHandler instance in test mode
 */
export function createTestWebhookHandler(
  config?: Partial<WebhookHandlerConfig>
): WebhookHandler {
  return new WebhookHandler({
    ...config,
    autoProcess: false,
  });
}
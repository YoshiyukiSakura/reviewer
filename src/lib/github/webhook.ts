/**
 * GitHub Webhook Types and Signature Verification
 *
 * Provides types for GitHub webhook events and utilities for verifying
 * webhook signatures to ensure request authenticity.
 */

import { createHmac, timingSafeEqual } from 'crypto';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * GitHub webhook event types
 */
export type GitHubWebhookEvent =
  | 'ping'
  | 'pull_request'
  | 'pull_request_review'
  | 'pull_request_review_comment'
  | 'push'
  | 'check_run'
  | 'check_suite';

/**
 * Pull request webhook action types
 */
export type PRAction =
  | 'opened'
  | 'edited'
  | 'closed'
  | 'reopened'
  | 'synchronize'
  | 'assigned'
  | 'unassigned'
  | 'review_requested'
  | 'review_request_removed'
  | 'labeled'
  | 'unlabeled'
  | 'converted_to_draft'
  | 'ready_for_review';

/**
 * GitHub repository information from webhook
 */
export interface WebhookRepository {
  id: number;
  name: string;
  fullName: string;
  owner: {
    login: string;
    id: number;
  };
  htmlUrl: string;
  defaultBranch: string;
  private: boolean;
}

/**
 * GitHub user information from webhook
 */
export interface WebhookUser {
  id: number;
  login: string;
  email?: string;
  name?: string;
}

/**
 * GitHub pull request from webhook
 */
export interface WebhookPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  draft: boolean;
  htmlUrl: string;
  diffUrl: string;
  head: {
    ref: string;
    sha: string;
    repo?: WebhookRepository;
  };
  base: {
    ref: string;
    sha: string;
    repo?: WebhookRepository;
  };
  user: WebhookUser;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  merged: boolean;
  mergeable: boolean | null;
}

/**
 * Generic webhook payload structure
 */
export interface WebhookPayload<T = unknown> {
  action?: string;
  repository: WebhookRepository;
  sender: WebhookUser;
  installation?: {
    id: number;
    nodeId: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Pull request webhook payload
 */
export interface PullRequestWebhookPayload extends WebhookPayload {
  action: PRAction;
  number: number;
  pullRequest: WebhookPullRequest;
  changes?: {
    title?: { from: string };
    body?: { from: string };
    base?: { ref: { from: string } };
  };
}

/**
 * Webhook event with decoded payload
 */
export interface WebhookEvent {
  /** The GitHub event type (X-GitHub-Event header) */
  type: GitHubWebhookEvent;
  /** Unique identifier for this delivery */
  id: string;
  /** The webhook payload */
  payload: WebhookPayload;
  /** Timestamp when the webhook was delivered */
  deliveredAt: string;
  /** Whether this is a retry of a previous delivery */
  isRetry: boolean;
  /** GitHub's attempt number for this delivery */
  attempt: number;
}

/**
 * Result of signature verification
 */
export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Configuration for webhook processing
 */
export interface WebhookConfig {
  /** Webhook secret for signature verification */
  secret: string;
  /** Path prefix for the webhook endpoint */
  path?: string;
  /** List of allowed event types */
  allowedEvents?: GitHubWebhookEvent[];
  /** Whether to process events in the background */
  processAsync?: boolean;
}

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Gets the webhook secret from environment variables
 * @returns The webhook secret
 * @throws Error if WEBHOOK_SECRET is not set
 */
export function getWebhookSecret(): string {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('GITHUB_WEBHOOK_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Creates a signature for a payload
 *
 * @param payload - The request body as a string
 * @param secret - The webhook secret
 * @returns The SHA-256 HMAC signature
 */
export function createSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verifies the GitHub webhook signature
 *
 * GitHub signs webhook payloads using HMAC-SHA256 with the webhook secret.
 * The signature is sent in the X-Hub-Signature-256 header.
 *
 * @param payload - The raw request body as a string
 * @param signature - The signature from X-Hub-Signature-256 header
 * @param secret - The webhook secret
 * @returns SignatureVerificationResult indicating if the signature is valid
 *
 * @example
 * ```typescript
 * const payload = await request.text();
 * const signature = request.headers.get('X-Hub-Signature-256');
 * const result = verifyWebhookSignature(payload, signature, 'your-secret');
 *
 * if (!result.valid) {
 *   return new Response('Invalid signature', { status: 401 });
 * }
 * ```
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): SignatureVerificationResult {
  if (!signature) {
    return { valid: false, error: 'Missing signature header' };
  }

  if (!payload || typeof payload !== 'string') {
    return { valid: false, error: 'Invalid payload' };
  }

  if (!secret || typeof secret !== 'string') {
    return { valid: false, error: 'Invalid webhook secret' };
  }

  try {
    const expectedSignature = createSignature(payload, secret);

    // Use timing-safe comparison to prevent timing attacks
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
 * Creates a webhook configuration from environment variables
 * @returns WebhookConfig object
 */
export function createWebhookConfigFromEnv(): WebhookConfig {
  return {
    secret: getWebhookSecret(),
    path: process.env.WEBHOOK_PATH || '/api/webhook/github',
    allowedEvents: parseAllowedEvents(process.env.WEBHOOK_ALLOWED_EVENTS),
    processAsync: process.env.WEBHOOK_PROCESS_ASYNC !== 'false',
  };
}

/**
 * Parses allowed events from environment variable
 * @param envValue - Comma-separated list of events
 * @returns Array of allowed event types
 */
function parseAllowedEvents(envValue: string | undefined): GitHubWebhookEvent[] | undefined {
  if (!envValue) {
    return undefined;
  }

  const events = envValue
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  if (events.length === 0) {
    return undefined;
  }

  return events as GitHubWebhookEvent[];
}

/**
 * Validates webhook configuration
 * @param config - Configuration to validate
 * @returns Error message if validation fails, null otherwise
 */
export function validateWebhookConfig(config: WebhookConfig): string | null {
  if (!config.secret || typeof config.secret !== 'string') {
    return 'Invalid webhook secret: must be a non-empty string';
  }

  if (config.path !== undefined && typeof config.path !== 'string') {
    return 'Invalid path: must be a string';
  }

  if (config.allowedEvents !== undefined && !Array.isArray(config.allowedEvents)) {
    return 'Invalid allowedEvents: must be an array';
  }

  if (config.processAsync !== undefined && typeof config.processAsync !== 'boolean') {
    return 'Invalid processAsync: must be a boolean';
  }

  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if an event type is a pull request related event
 * @param eventType - The GitHub event type
 * @returns True if the event is PR-related
 */
export function isPRWebhookEvent(eventType: GitHubWebhookEvent): boolean {
  return eventType === 'pull_request' || eventType.startsWith('pull_request_');
}

/**
 * Checks if a PR action should trigger a review
 * @param action - The PR action type
 * @returns True if the action should trigger a review
 */
export function shouldTriggerReview(action: PRAction): boolean {
  const reviewActions: PRAction[] = [
    'opened',
    'edited',
    'synchronize',
    'reopened',
    'ready_for_review',
  ];
  return reviewActions.includes(action);
}

/**
 * Extracts PR info from a webhook pull request payload
 * @param pr - The pull request from webhook
 * @param owner - Repository owner (from repository payload)
 * @param repo - Repository name (from repository payload)
 * @returns Normalized PR info compatible with DetectedPullRequest
 */
export function extractPRInfo(
  pr: WebhookPullRequest,
  owner: string,
  repo: string
) {
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    draft: pr.draft,
    owner,
    repo,
    htmlUrl: pr.htmlUrl,
    diffUrl: pr.diffUrl,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
    authorLogin: pr.user.login,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
  };
}

/**
 * Creates a mock webhook payload for testing
 * @param overrides - Fields to override in the payload
 * @returns A mock webhook payload
 */
export function createMockWebhookPayload(
  overrides: Partial<PullRequestWebhookPayload> = {}
): PullRequestWebhookPayload {
  const now = new Date().toISOString();

  return {
    action: 'opened',
    number: 1,
    repository: {
      id: 1,
      name: 'test-repo',
      fullName: 'test-owner/test-repo',
      owner: {
        login: 'test-owner',
        id: 1,
      },
      htmlUrl: 'https://github.com/test-owner/test-repo',
      defaultBranch: 'main',
      private: false,
    },
    sender: {
      id: 1,
      login: 'test-user',
    },
    pullRequest: {
      id: 1,
      number: 1,
      title: 'Test PR',
      body: 'Test body',
      state: 'open',
      draft: false,
      htmlUrl: 'https://github.com/test-owner/test-repo/pull/1',
      diffUrl: 'https://github.com/test-owner/test-repo/pull/1.diff',
      head: {
        ref: 'feature-branch',
        sha: 'abc123',
      },
      base: {
        ref: 'main',
        sha: 'def456',
      },
      user: {
        id: 1,
        login: 'test-user',
      },
      createdAt: now,
      updatedAt: now,
      mergedAt: null,
      merged: false,
      mergeable: true,
    },
    ...overrides,
  };
}
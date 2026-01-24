/**
 * Webhook Handler Tests
 */

import { WebhookHandler } from '../webhook-handler';
import { createMockWebhookPayload } from '../webhook';
import type { ReviewProcessor, ProcessPRResult } from '../../worker/review-processor';

// Mock ReviewProcessor for testing
const createMockReviewProcessor = (): ReviewProcessor => {
  return {
    processPR: jest.fn().mockResolvedValue({
      success: true,
      reviewId: 'test-review-id',
      durationMs: 100,
    } as ProcessPRResult),
  } as unknown as ReviewProcessor;
};

describe('WebhookHandler', () => {
  const testSecret = 'test-webhook-secret';

  describe('constructor', () => {
    it('should create a handler with valid config', () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
      });

      expect(handler).toBeInstanceOf(WebhookHandler);
    });

    it('should throw for invalid webhook config', () => {
      expect(() => {
        new WebhookHandler({
          webhook: { secret: '' },
          reviewProcessor: createMockReviewProcessor(),
        });
      }).toThrow('Invalid webhook config');
    });

    it('should throw for missing secret', () => {
      expect(() => {
        new WebhookHandler({
          webhook: { secret: '' as string },
          reviewProcessor: createMockReviewProcessor(),
        });
      }).toThrow();
    });
  });

  describe('verifySignatureWithSecret', () => {
    it('should verify valid signature', () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
      });

      const payload = JSON.stringify({ action: 'opened' });
      const { createHmac } = require('crypto');
      const hmac = createHmac('sha256', testSecret);
      hmac.update(payload, 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = handler.verifySignatureWithSecret(payload, signature, testSecret);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
      });

      // Use a valid-length signature with wrong hash
      const invalidSig = 'sha256=' + 'a'.repeat(64);
      const result = handler.verifySignatureWithSecret(
        '{"action":"opened"}',
        invalidSig,
        testSecret
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signature verification failed');
    });

    it('should reject missing signature', () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
      });

      const result = handler.verifySignatureWithSecret(
        '{"action":"opened"}',
        null,
        testSecret
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing signature header (X-Hub-Signature-256)');
    });

    it('should reject empty payload', () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
      });

      const result = handler.verifySignatureWithSecret('', 'sha256=sig', testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid payload');
    });
  });

  describe('handleRequest', () => {
    it('should reject invalid signature', async () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
        autoProcess: false,
      });

      const payload = JSON.stringify(createMockWebhookPayload());
      // Use a valid-length signature with wrong hash
      const invalidSig = 'sha256=' + 'b'.repeat(64);
      const result = await handler.handleRequest(
        payload,
        invalidSig,
        'test-delivery-id',
        'pull_request'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Signature verification failed');
    });

    it('should reject unknown event type', async () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
        autoProcess: false,
      });

      // Create valid signature for the payload
      const { createHmac } = require('crypto');
      const payload = JSON.stringify(createMockWebhookPayload());
      const hmac = createHmac('sha256', testSecret);
      hmac.update(payload, 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = await handler.handleRequest(
        payload,
        signature,
        'test-delivery-id',
        'unknown_event'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown event type');
    });

    it('should process ping event', async () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
        autoProcess: false,
      });

      const pingPayload = JSON.stringify({
        action: 'ping',
        zen: 'Test ping',
        repository: {
          id: 1,
          name: 'test-repo',
          fullName: 'test-owner/test-repo',
          owner: { login: 'test-owner', id: 1 },
          htmlUrl: 'https://github.com/test-owner/test-repo',
          defaultBranch: 'main',
          private: false,
        },
        sender: { id: 1, login: 'test-user' },
      });

      const { createHmac } = require('crypto');
      const hmac = createHmac('sha256', testSecret);
      hmac.update(pingPayload, 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = await handler.handleRequest(
        pingPayload,
        signature,
        'test-delivery-id',
        'ping'
      );

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('ping');
      expect(result.repository).toBe('test-owner/test-repo');
    });

    it('should process pull_request event', async () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
        autoProcess: false,
      });

      const payload = JSON.stringify(createMockWebhookPayload({ action: 'opened' }));

      const { createHmac } = require('crypto');
      const hmac = createHmac('sha256', testSecret);
      hmac.update(payload, 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = await handler.handleRequest(
        payload,
        signature,
        'test-delivery-id',
        'pull_request'
      );

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('pull_request');
      expect(result.action).toBe('opened');
      expect(result.repository).toBe('test-owner/test-repo');
    });

    it('should emit pr_event for PR actions', async () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
        autoProcess: false,
      });

      const events: Array<{ type: string; action?: string }> = [];
      handler.on('pr_event', (event: { type: string; action?: string }) => {
        events.push({ type: event.type, action: event.action });
      });

      const payload = JSON.stringify(
        createMockWebhookPayload({ action: 'synchronize' })
      );

      const { createHmac } = require('crypto');
      const hmac = createHmac('sha256', testSecret);
      hmac.update(payload, 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      await handler.handleRequest(
        payload,
        signature,
        'test-delivery-id',
        'pull_request'
      );

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('pr_event');
      expect(events[0].action).toBe('synchronize');
    });

    it('should reject disallowed event type', async () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: {
          secret: testSecret,
          allowedEvents: ['ping'], // Only allow ping
        },
        reviewProcessor: mockProcessor,
        autoProcess: false,
      });

      const payload = JSON.stringify(createMockWebhookPayload());

      const { createHmac } = require('crypto');
      const hmac = createHmac('sha256', testSecret);
      hmac.update(payload, 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = await handler.handleRequest(
        payload,
        signature,
        'test-delivery-id',
        'pull_request'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Event type not allowed');
    });

    it('should handle filtered repositories', async () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
        autoProcess: false,
        allowedRepositories: [{ owner: 'allowed-owner', repo: 'allowed-repo' }],
      });

      const payload = JSON.stringify(createMockWebhookPayload());

      const { createHmac } = require('crypto');
      const hmac = createHmac('sha256', testSecret);
      hmac.update(payload, 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = await handler.handleRequest(
        payload,
        signature,
        'test-delivery-id',
        'pull_request'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Repository not allowed');
    });

    it('should reject invalid JSON payload', async () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
        autoProcess: false,
      });

      const { createHmac } = require('crypto');
      const hmac = createHmac('sha256', testSecret);
      hmac.update('invalid json', 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = await handler.handleRequest(
        'invalid json',
        signature,
        'test-delivery-id',
        'pull_request'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON payload');
    });
  });

  describe('getConfig', () => {
    it('should return non-sensitive configuration', () => {
      const mockProcessor = createMockReviewProcessor();
      const handler = new WebhookHandler({
        webhook: { secret: testSecret },
        reviewProcessor: mockProcessor,
        autoProcess: true,
        allowedRepositories: [{ owner: 'test', repo: 'repo' }],
      });

      const config = handler.getConfig();

      expect(config.autoProcess).toBe(true);
      expect(config.allowedRepositories).toHaveLength(1);
      expect(config.allowedEvents).toBeUndefined();
      // Secret should not be in the config
      expect(config).not.toHaveProperty('secret');
    });
  });
});

describe('Event Emission', () => {
  const testSecret = 'test-webhook-secret';

  it('should emit webhook_received event', async () => {
    const mockProcessor = createMockReviewProcessor();
    const handler = new WebhookHandler({
      webhook: { secret: testSecret },
      reviewProcessor: mockProcessor,
      autoProcess: false,
    });

    const receivedEvents: Array<{ type: string }> = [];
    handler.on('webhook_received', (event: { type: string }) => {
      receivedEvents.push({ type: event.type });
    });

    const pingPayload = JSON.stringify({
      action: 'ping',
      repository: {
        id: 1,
        name: 'test-repo',
        fullName: 'test-owner/test-repo',
        owner: { login: 'test-owner', id: 1 },
        htmlUrl: 'https://github.com/test-owner/test-repo',
        defaultBranch: 'main',
        private: false,
      },
      sender: { id: 1, login: 'test-user' },
    });

    const { createHmac } = require('crypto');
    const hmac = createHmac('sha256', testSecret);
    hmac.update(pingPayload, 'utf8');
    const signature = `sha256=${hmac.digest('hex')}`;

    await handler.handleRequest(pingPayload, signature, 'delivery-123', 'ping');

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].type).toBe('webhook_received');
  });
});


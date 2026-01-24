/**
 * Webhook Module Tests
 */

import { createHmac } from 'crypto';
import {
  createSignature,
  verifyWebhookSignature,
  createMockWebhookPayload,
  extractPRInfo,
  shouldTriggerReview,
  isPRWebhookEvent,
  validateWebhookConfig,
} from '../webhook';

describe('Webhook Signature Verification', () => {
  const testSecret = 'test-webhook-secret';
  const testPayload = JSON.stringify({
    action: 'opened',
    number: 1,
    pull_request: {
      id: 1,
      number: 1,
      title: 'Test PR',
    },
  });

  describe('createSignature', () => {
    it('should create a valid SHA-256 HMAC signature', () => {
      const signature = createSignature(testPayload, testSecret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should produce consistent signatures for the same payload', () => {
      const sig1 = createSignature(testPayload, testSecret);
      const sig2 = createSignature(testPayload, testSecret);

      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different payloads', () => {
      const payload2 = JSON.stringify({ action: 'closed' });
      const sig1 = createSignature(testPayload, testSecret);
      const sig2 = createSignature(payload2, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different secrets', () => {
      const sig1 = createSignature(testPayload, 'secret1');
      const sig2 = createSignature(testPayload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return valid=true for correct signature', () => {
      const signature = createSignature(testPayload, testSecret);
      const result = verifyWebhookSignature(testPayload, signature, testSecret);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid=false for missing signature', () => {
      const result = verifyWebhookSignature(testPayload, null, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing signature header');
    });

    it('should return valid=false for invalid signature', () => {
      const invalidSig = 'sha256=xyz'; // Shorter than real signature
      const result = verifyWebhookSignature(testPayload, invalidSig, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signature length mismatch');
    });

    it('should return valid=false for tampered payload', () => {
      const signature = createSignature(testPayload, testSecret);
      const tamperedPayload = JSON.stringify({ action: 'closed' });
      const result = verifyWebhookSignature(tamperedPayload, signature, testSecret);

      expect(result.valid).toBe(false);
    });

    it('should return valid=false for empty payload', () => {
      const signature = createSignature(testPayload, testSecret);
      const result = verifyWebhookSignature('', signature, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid payload');
    });

    it('should return valid=false for empty secret', () => {
      const signature = createSignature(testPayload, testSecret);
      const result = verifyWebhookSignature(testPayload, signature, '');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid webhook secret');
    });
  });
});

describe('Webhook Helpers', () => {
  describe('createMockWebhookPayload', () => {
    it('should create a valid mock payload', () => {
      const payload = createMockWebhookPayload();

      expect(payload.action).toBe('opened');
      expect(payload.number).toBe(1);
      expect(payload.repository.fullName).toBe('test-owner/test-repo');
      expect(payload.pullRequest.title).toBe('Test PR');
    });

    it('should allow overriding default values', () => {
      const payload = createMockWebhookPayload({
        action: 'closed',
        number: 42,
        repository: {
          id: 2,
          name: 'custom-repo',
          fullName: 'custom-owner/custom-repo',
          owner: { login: 'custom-owner', id: 2 },
          htmlUrl: 'https://github.com/custom-owner/custom-repo',
          defaultBranch: 'main',
          private: true,
        },
      });

      expect(payload.action).toBe('closed');
      expect(payload.number).toBe(42);
      expect(payload.repository.fullName).toBe('custom-owner/custom-repo');
      expect(payload.repository.private).toBe(true);
    });
  });

  describe('extractPRInfo', () => {
    it('should extract PR info correctly', () => {
      const mockPayload = createMockWebhookPayload();
      const prInfo = extractPRInfo(
        mockPayload.pullRequest,
        'test-owner',
        'test-repo'
      );

      expect(prInfo.id).toBe(1);
      expect(prInfo.number).toBe(1);
      expect(prInfo.title).toBe('Test PR');
      expect(prInfo.owner).toBe('test-owner');
      expect(prInfo.repo).toBe('test-repo');
      expect(prInfo.authorLogin).toBe('test-user');
      expect(prInfo.headRef).toBe('feature-branch');
      expect(prInfo.baseRef).toBe('main');
    });
  });

  describe('shouldTriggerReview', () => {
    it('should return true for review-triggering actions', () => {
      expect(shouldTriggerReview('opened')).toBe(true);
      expect(shouldTriggerReview('edited')).toBe(true);
      expect(shouldTriggerReview('synchronize')).toBe(true);
      expect(shouldTriggerReview('reopened')).toBe(true);
      expect(shouldTriggerReview('ready_for_review')).toBe(true);
    });

    it('should return false for non-review-triggering actions', () => {
      expect(shouldTriggerReview('closed')).toBe(false);
      expect(shouldTriggerReview('assigned')).toBe(false);
      expect(shouldTriggerReview('unassigned')).toBe(false);
      expect(shouldTriggerReview('labeled')).toBe(false);
      expect(shouldTriggerReview('unlabeled')).toBe(false);
      expect(shouldTriggerReview('converted_to_draft')).toBe(false);
    });
  });

  describe('isPRWebhookEvent', () => {
    it('should return true for PR-related events', () => {
      expect(isPRWebhookEvent('pull_request')).toBe(true);
      expect(isPRWebhookEvent('pull_request_review')).toBe(true);
      expect(isPRWebhookEvent('pull_request_review_comment')).toBe(true);
    });

    it('should return false for non-PR events', () => {
      expect(isPRWebhookEvent('ping')).toBe(false);
      expect(isPRWebhookEvent('push')).toBe(false);
      expect(isPRWebhookEvent('check_run')).toBe(false);
      expect(isPRWebhookEvent('check_suite')).toBe(false);
    });
  });
});

describe('Webhook Config Validation', () => {
  describe('validateWebhookConfig', () => {
    it('should return null for valid config', () => {
      const result = validateWebhookConfig({
        secret: 'valid-secret',
        path: '/api/webhook',
        allowedEvents: ['pull_request'],
        processAsync: true,
      });

      expect(result).toBeNull();
    });

    it('should return error for missing secret', () => {
      const result = validateWebhookConfig({
        secret: '',
        processAsync: true,
      });

      expect(result).toBe('Invalid webhook secret: must be a non-empty string');
    });

    it('should return null for config without optional fields', () => {
      const result = validateWebhookConfig({
        secret: 'valid-secret',
      });

      expect(result).toBeNull();
    });

    it('should return error for invalid path type', () => {
      const result = validateWebhookConfig({
        secret: 'valid-secret',
        path: 123 as unknown as string,
      });

      expect(result).toBe('Invalid path: must be a string');
    });

    it('should return error for invalid allowedEvents type', () => {
      const result = validateWebhookConfig({
        secret: 'valid-secret',
        allowedEvents: 'pull_request' as unknown as string[],
      });

      expect(result).toBe('Invalid allowedEvents: must be an array');
    });

    it('should return error for invalid processAsync type', () => {
      const result = validateWebhookConfig({
        secret: 'valid-secret',
        processAsync: 'true' as unknown as boolean,
      });

      expect(result).toBe('Invalid processAsync: must be a boolean');
    });
  });
});
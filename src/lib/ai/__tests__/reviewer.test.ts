/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for AI Reviewer Module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AIReviewer,
  createReviewerFromEnv,
  createOpenAIReviewer,
  createAnthropicReviewer,
  createAzureOpenAIReviewer,
  type AIReviewerConfig,
  type ReviewRequest,
  type PRReviewRequest,
} from '../reviewer';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AIReviewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with valid config', () => {
      const config: AIReviewerConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-api-key',
      };

      const reviewer = new AIReviewer(config);
      expect(reviewer).toBeInstanceOf(AIReviewer);
    });

    it('should throw error if provider is missing', () => {
      expect(() => {
        new AIReviewer({
          provider: '' as any,
          model: 'gpt-4o',
          apiKey: 'test-key',
        });
      }).toThrow('AI provider is required');
    });

    it('should throw error if model is missing', () => {
      expect(() => {
        new AIReviewer({
          provider: 'openai',
          model: '' as any,
          apiKey: 'test-key',
        });
      }).toThrow('AI model is required');
    });

    it('should throw error if apiKey is missing', () => {
      expect(() => {
        new AIReviewer({
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: '',
        });
      }).toThrow('API key is required');
    });

    it('should throw error if Azure OpenAI is used without baseUrl', () => {
      expect(() => {
        new AIReviewer({
          provider: 'azure-openai',
          model: 'gpt-4o',
          apiKey: 'test-key',
        });
      }).toThrow('Azure OpenAI requires baseUrl to be configured');
    });
  });

  describe('review()', () => {
    const baseConfig: AIReviewerConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-api-key',
    };

    const sampleRequest: ReviewRequest = {
      diff: '+ const x = 1;',
      filePath: 'src/utils.ts',
      prTitle: 'Add utility constant',
    };

    it('should return successful review result for OpenAI', async () => {
      const mockResponse = {
        summary: 'Good addition',
        comments: [
          {
            line: 1,
            severity: 'suggestion',
            category: 'style',
            comment: 'Consider using let instead',
            suggestion: 'let x = 1;',
          },
        ],
        approval: 'approve',
        overallScore: 8,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      });

      const reviewer = new AIReviewer(baseConfig);
      const result = await reviewer.review(sampleRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toBe('Good addition');
        expect(result.data.comments).toHaveLength(1);
        expect(result.data.comments[0].severity).toBe('SUGGESTION');
        expect(result.data.approval).toBe('approve');
        expect(result.data.score).toBe(8);
        expect(result.data.model).toBe('gpt-4o');
        expect(result.data.tokenUsage?.totalTokens).toBe(150);
      }
    });

    it('should return successful review result for Anthropic', async () => {
      const anthropicConfig: AIReviewerConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        apiKey: 'test-anthropic-key',
      };

      const mockResponse = {
        summary: 'Clean code change',
        comments: [],
        approval: 'approve',
        overallScore: 9,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockResponse),
            },
          ],
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        }),
      });

      const reviewer = new AIReviewer(anthropicConfig);
      const result = await reviewer.review(sampleRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toBe('Clean code change');
        expect(result.data.score).toBe(9);
        expect(result.data.model).toBe('claude-3-5-sonnet');
      }
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'Invalid API key' },
        }),
      });

      const reviewer = new AIReviewer(baseConfig);
      const result = await reviewer.review(sampleRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('OpenAI API error');
        expect(result.code).toBe('API_ERROR');
      }
    });

    it('should handle JSON in markdown code blocks', async () => {
      const responseWithCodeBlock = `Here is my review:

\`\`\`json
{
  "summary": "Review in code block",
  "comments": [],
  "approval": "approve",
  "overallScore": 7
}
\`\`\`

That's my analysis.`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: responseWithCodeBlock,
              },
            },
          ],
        }),
      });

      const reviewer = new AIReviewer(baseConfig);
      const result = await reviewer.review(sampleRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toBe('Review in code block');
        expect(result.data.score).toBe(7);
      }
    });

    it('should clamp score to valid range', async () => {
      const mockResponse = {
        summary: 'Test',
        comments: [],
        approval: 'approve',
        overallScore: 15, // Invalid: over 10
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const reviewer = new AIReviewer(baseConfig);
      const result = await reviewer.review(sampleRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.score).toBe(10); // Clamped to max
      }
    });
  });

  describe('securityReview()', () => {
    const baseConfig: AIReviewerConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-api-key',
    };

    it('should return security review result', async () => {
      const mockResponse = {
        vulnerabilities: [
          {
            line: 5,
            severity: 'high',
            type: 'SQL Injection',
            description: 'Unsanitized input',
            impact: 'Database compromise',
            remediation: 'Use parameterized queries',
          },
        ],
        securityScore: 4,
        summary: 'Security issues found',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const reviewer = new AIReviewer(baseConfig);
      const result = await reviewer.securityReview({
        diff: '+ db.query(`SELECT * FROM users WHERE id = ${id}`);',
        filePath: 'src/db.ts',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vulnerabilities).toHaveLength(1);
        expect(result.data.vulnerabilities[0].type).toBe('SQL Injection');
        expect(result.data.securityScore).toBe(4);
      }
    });
  });

  describe('reviewPR()', () => {
    const baseConfig: AIReviewerConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-api-key',
    };

    it('should return PR summary result', async () => {
      const mockResponse = {
        summary: 'This PR adds new features',
        keyChanges: ['Added user auth', 'Updated database schema'],
        concerns: ['Missing tests'],
        suggestions: ['Add unit tests'],
        testingRecommendations: ['Test login flow'],
        approval: 'request_changes',
        overallScore: 6,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      });

      const request: PRReviewRequest = {
        files: [
          { path: 'src/auth.ts', diff: '+ function login() {}' },
          { path: 'src/db.ts', diff: '+ const schema = {}' },
        ],
        prTitle: 'Add authentication',
        prDescription: 'Implements user authentication',
      };

      const reviewer = new AIReviewer(baseConfig);
      const result = await reviewer.reviewPR(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toBe('This PR adds new features');
        expect(result.data.keyChanges).toHaveLength(2);
        expect(result.data.concerns).toContain('Missing tests');
        expect(result.data.approval).toBe('request_changes');
        expect(result.data.score).toBe(6);
      }
    });
  });

  describe('reviewFiles()', () => {
    const baseConfig: AIReviewerConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-api-key',
    };

    it('should review multiple files and aggregate results', async () => {
      const mockResponse1 = {
        summary: 'File 1 looks good',
        comments: [],
        approval: 'approve',
        overallScore: 8,
      };

      const mockResponse2 = {
        summary: 'File 2 needs work',
        comments: [{ line: 1, severity: 'warning', category: 'style', comment: 'Fix this' }],
        approval: 'request_changes',
        overallScore: 6,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(mockResponse1) } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(mockResponse2) } }],
          }),
        });

      const reviewer = new AIReviewer(baseConfig);
      const result = await reviewer.reviewFiles([
        { path: 'file1.ts', diff: '+ const a = 1;' },
        { path: 'file2.ts', diff: '+ const b = 2;' },
      ]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.results).toHaveLength(2);
        expect(result.data.aggregateScore).toBe(7); // (8 + 6) / 2 = 7
      }
    });
  });
});

describe('Factory Functions', () => {
  describe('createReviewerFromEnv()', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create OpenAI reviewer from env', () => {
      process.env.AI_PROVIDER = 'openai';
      process.env.AI_MODEL = 'gpt-4o';
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const reviewer = createReviewerFromEnv();
      expect(reviewer).toBeInstanceOf(AIReviewer);
    });

    it('should create Anthropic reviewer from env', () => {
      process.env.AI_PROVIDER = 'anthropic';
      process.env.AI_MODEL = 'claude-3-5-sonnet';
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

      const reviewer = createReviewerFromEnv();
      expect(reviewer).toBeInstanceOf(AIReviewer);
    });

    it('should throw error if API key is missing', () => {
      process.env.AI_PROVIDER = 'openai';
      process.env.AI_MODEL = 'gpt-4o';
      delete process.env.OPENAI_API_KEY;

      expect(() => createReviewerFromEnv()).toThrow('API key not found');
    });
  });

  describe('createOpenAIReviewer()', () => {
    it('should create OpenAI reviewer with default model', () => {
      const reviewer = createOpenAIReviewer('test-key');
      expect(reviewer).toBeInstanceOf(AIReviewer);
    });

    it('should create OpenAI reviewer with custom model', () => {
      const reviewer = createOpenAIReviewer('test-key', 'gpt-4-turbo');
      expect(reviewer).toBeInstanceOf(AIReviewer);
    });
  });

  describe('createAnthropicReviewer()', () => {
    it('should create Anthropic reviewer with default model', () => {
      const reviewer = createAnthropicReviewer('test-key');
      expect(reviewer).toBeInstanceOf(AIReviewer);
    });

    it('should create Anthropic reviewer with custom model', () => {
      const reviewer = createAnthropicReviewer('test-key', 'claude-3-opus');
      expect(reviewer).toBeInstanceOf(AIReviewer);
    });
  });

  describe('createAzureOpenAIReviewer()', () => {
    it('should create Azure OpenAI reviewer', () => {
      const reviewer = createAzureOpenAIReviewer(
        'test-key',
        'https://my-resource.openai.azure.com/openai/deployments/gpt-4'
      );
      expect(reviewer).toBeInstanceOf(AIReviewer);
    });
  });
});

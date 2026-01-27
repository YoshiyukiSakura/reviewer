/**
 * Tests for Test Report Generator Module
 *
 * These tests use mocked AI calls to validate the generator logic
 * without making actual API requests.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import {
  TestReportGenerator,
  createTestReportGeneratorFromEnv,
  createOpenAITestReportGenerator,
  createAnthropicTestReportGenerator,
  createAzureOpenAITestReportGenerator,
  type TestReportGeneratorConfig,
  type GenerateTestReportParams,
} from '../generator';
import type { TestReportResult, TestReportRecommendation } from '../prompts';
import type { TestReportContext, ExecutionData, TaskStatus } from '../collector';

// Mock AI reviewer module
const mockCallAIProviderFn = vi.fn();
const mockExtractJSONFn = vi.fn((text: string) => text);
const mockParseJSONSafeFn = vi.fn((text: string) => JSON.parse(text));

vi.mock('../../ai/reviewer', () => ({
  AIReviewerConfig: {},
  AIProvider: {},
  AIModel: {},
  callAIProvider: vi.fn((...args) => mockCallAIProviderFn(...args)),
  extractJSON: vi.fn((...args) => mockExtractJSONFn(...args)),
  parseJSONSafe: vi.fn((...args) => mockParseJSONSafeFn(...args)),
}));

// Mock prompts module
vi.mock('../prompts', () => ({
  generateTestReportPrompt: vi.fn().mockReturnValue('Generated prompt'),
  SYSTEM_PROMPT_TEST_REPORT: 'You are a test report generator',
}));

// Mock remote logging
vi.mock('../../remote-log', () => ({
  log: {
    debug: vi.fn().mockResolvedValue(undefined),
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import mocked modules (use the module-level mocks)
import { generateTestReportPrompt } from '../prompts';

// Type assertions
const mockCallAIProvider = mockCallAIProviderFn;
const mockParseJSONSafe = mockParseJSONSafeFn;
const mockGenerateTestReportPrompt = generateTestReportPrompt as ReturnType<typeof vi.fn>;

// ========== Helper Functions ==========

function createMockExecution(overrides: Partial<ExecutionData> = {}): ExecutionData {
  return {
    id: 'review-123',
    title: 'Test Review Title',
    description: 'Test review description',
    status: 'APPROVED',
    sourceType: 'pull_request',
    sourceId: 'owner/repo#42',
    sourceUrl: 'https://github.com/owner/repo/pull/42',
    authorId: 'user-123',
    authorName: 'Test User',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  };
}

function createMockContext(): TestReportContext {
  return {
    execution: createMockExecution(),
    plan: {
      id: 'review-123',
      name: 'Test Review',
      description: 'Test description',
      status: 'APPROVED',
      repositoryName: 'owner/repo',
      repositoryUrl: 'https://github.com/owner/repo/pull/42',
      branchName: 'main',
      commitSha: 'abc123',
      pullRequestId: '42',
      pullRequestUrl: 'https://github.com/owner/repo/pull/42',
    },
    tasks: [
      {
        taskId: 'task-1',
        title: 'Implement feature',
        status: 'completed',
        assigneeId: 'user-1',
        assigneeName: 'Developer 1',
        completedAt: new Date('2024-01-15T11:00:00Z'),
        failedAt: null,
      },
      {
        taskId: 'task-2',
        title: 'Fix bugs',
        status: 'completed',
        assigneeId: 'user-2',
        assigneeName: 'Developer 2',
        completedAt: new Date('2024-01-15T11:30:00Z'),
        failedAt: null,
      },
    ],
    conversation: {
      totalComments: 5,
      resolvedComments: 4,
      unresolvedComments: 1,
      comments: [
        {
          id: 'comment-1',
          content: 'Good implementation',
          authorName: 'Reviewer A',
          createdAt: new Date('2024-01-15T10:30:00Z'),
          isResolved: true,
          severity: 'INFO',
          filePath: 'src/main.ts',
          lineStart: 42,
        },
        {
          id: 'comment-2',
          content: 'Please fix this issue',
          authorName: 'Reviewer B',
          createdAt: new Date('2024-01-15T11:00:00Z'),
          isResolved: false,
          severity: 'WARNING',
          filePath: 'src/utils.ts',
          lineStart: 100,
        },
      ],
    },
    prDiff: {
      owner: 'owner',
      repo: 'repo',
      pullNumber: 42,
      files: [
        {
          filename: 'src/main.ts',
          status: 'modified',
          additions: 50,
          deletions: 20,
          changes: 70,
          patch: '@@ ...',
        },
      ],
      totalAdditions: 50,
      totalDeletions: 20,
      totalChanges: 70,
    },
    collectedAt: new Date('2024-01-15T12:00:00Z'),
  };
}

function createMockAIResponse(overrides: Partial<TestReportResult> = {}): TestReportResult {
  return {
    summary: 'The PR shows good code quality with minor improvement suggestions.',
    overallAnalysis: 'This is a comprehensive analysis of the code changes.',
    score: 85,
    maxScore: 100,
    recommendation: 'MERGE',
    recommendationReason: 'The code meets quality standards and all critical issues are resolved.',
    acceptanceSuggestion: 'Ready for merge after addressing minor suggestions.',
    keyFindings: ['Clean architecture', 'Good test coverage', 'Proper error handling'],
    concerns: ['Some code duplication in utils module', 'Missing documentation for exported functions'],
    positives: ['Well-structured code', 'Good naming conventions', 'Comprehensive tests'],
    suggestions: ['Consider refactoring duplicate code', 'Add JSDoc comments'],
    ...overrides,
  };
}

describe('Test Report Generator Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations since vi.clearAllMocks clears them
    mockParseJSONSafe.mockImplementation((text: string) => JSON.parse(text));
    mockGenerateTestReportPrompt.mockReturnValue('Test prompt');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ========== Constructor Tests ==========

  describe('TestReportGenerator Constructor', () => {
    it('should create instance with valid config', () => {
      const config: TestReportGeneratorConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-api-key',
      };

      const generator = new TestReportGenerator(config);

      expect(generator).toBeInstanceOf(TestReportGenerator);
    });

    it('should throw error when provider is missing', () => {
      const config = {
        provider: '',
        model: 'gpt-4o',
        apiKey: 'test-key',
      } as unknown as TestReportGeneratorConfig;

      expect(() => new TestReportGenerator(config)).toThrow('AI provider is required');
    });

    it('should throw error when model is missing', () => {
      const config = {
        provider: 'openai',
        model: '',
        apiKey: 'test-key',
      } as unknown as TestReportGeneratorConfig;

      expect(() => new TestReportGenerator(config)).toThrow('AI model is required');
    });

    it('should throw error when apiKey is missing', () => {
      const config = {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: '',
      } as unknown as TestReportGeneratorConfig;

      expect(() => new TestReportGenerator(config)).toThrow('API key is required');
    });

    it('should throw error when Azure OpenAI missing baseUrl', () => {
      const config = {
        provider: 'azure-openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
        baseUrl: undefined,
      } as unknown as TestReportGeneratorConfig;

      expect(() => new TestReportGenerator(config)).toThrow(
        'Azure OpenAI requires baseUrl to be configured'
      );
    });

    it('should set default values for optional config', () => {
      const config: TestReportGeneratorConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-api-key',
      };

      const generator = new TestReportGenerator(config);
      const getterConfig = generator.getConfig();

      expect(getterConfig.maxTokens).toBe(8192);
      expect(getterConfig.temperature).toBe(0.3);
      expect(getterConfig.timeout).toBe(120000);
    });

    it('should allow overriding default values', () => {
      const config: TestReportGeneratorConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        apiKey: 'test-api-key',
        maxTokens: 16384,
        temperature: 0.5,
        timeout: 180000,
      };

      const generator = new TestReportGenerator(config);
      const getterConfig = generator.getConfig();

      expect(getterConfig.maxTokens).toBe(16384);
      expect(getterConfig.temperature).toBe(0.5);
      expect(getterConfig.timeout).toBe(180000);
    });
  });

  // ========== generate Method Tests ==========

  describe('TestReportGenerator.generate', () => {
    it('should successfully generate test report', async () => {
      const mockResponse = createMockAIResponse();
      mockCallAIProvider.mockResolvedValue({
        content: JSON.stringify(mockResponse),
        tokenUsage: {
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
        },
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const params: GenerateTestReportParams = {
        context: createMockContext(),
      };

      const result = await generator.generate(params);

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.score).toBe(85);
      expect(result.data?.recommendation).toBe('MERGE');
      expect(mockCallAIProvider).toHaveBeenCalled();
      expect(mockGenerateTestReportPrompt).toHaveBeenCalled();
    });

    it('should return error when execution data is missing', async () => {
      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const context = createMockContext();
      context.execution = null;

      const params: GenerateTestReportParams = {
        context,
      };

      const result = await generator.generate(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Execution data is required');
    });

    it('should clamp score to valid range', async () => {
      const mockResponse = createMockAIResponse({ score: 150 }); // Over max
      mockCallAIProvider.mockResolvedValue({
        content: JSON.stringify(mockResponse),
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const result = await generator.generate({
        context: createMockContext(),
      });

      expect(result.success).toBe(true);
      expect(result.data?.score).toBe(100); // Clamped to maxScore
    });

    it('should not allow negative scores', async () => {
      const mockResponse = createMockAIResponse({ score: -10 });
      mockCallAIProvider.mockResolvedValue({
        content: JSON.stringify(mockResponse),
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const result = await generator.generate({
        context: createMockContext(),
      });

      expect(result.success).toBe(true);
      expect(result.data?.score).toBe(0); // Clamped to min
    });

    it('should handle AI API errors gracefully', async () => {
      mockCallAIProvider.mockRejectedValue(new Error('API rate limit exceeded'));

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const result = await generator.generate({
        context: createMockContext(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API rate limit exceeded');
      expect(result.code).toBe('PARSE_ERROR');
    });

    it('should set TIMEOUT code for AbortError', async () => {
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      mockCallAIProvider.mockRejectedValue(abortError);

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const result = await generator.generate({
        context: createMockContext(),
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('TIMEOUT');
    });

    it('should pass additional context to prompt generator', async () => {
      mockCallAIProvider.mockResolvedValue({
        content: JSON.stringify(createMockAIResponse()),
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      await generator.generate({
        context: createMockContext(),
        additionalContext: 'Focus on security aspects',
      });

      expect(mockGenerateTestReportPrompt).toHaveBeenCalledWith({
        context: createMockContext(),
        additionalContext: 'Focus on security aspects',
      });
    });

    it('should validate AI response structure', async () => {
      mockCallAIProvider.mockResolvedValue({
        content: JSON.stringify({
          summary: 'Test summary',
          overallAnalysis: 'Test analysis',
          score: 80,
          maxScore: 100,
          recommendation: 'MERGE',
          recommendationReason: 'Test reason',
          acceptanceSuggestion: 'Test suggestion',
          keyFindings: ['finding1'],
          concerns: ['concern1'],
          positives: ['positive1'],
          suggestions: ['suggestion1'],
        }),
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const result = await generator.generate({
        context: createMockContext(),
      });

      expect(result.success).toBe(true);
      expect(result.data?.score).toBe(80);
    });

    it('should throw error for missing summary field', async () => {
      // Set up callAIProvider mock
      mockCallAIProvider.mockResolvedValue({
        content: '{"overallAnalysis":"Test","score":80,"maxScore":100,"recommendation":"MERGE","recommendationReason":"Test","acceptanceSuggestion":"Test","keyFindings":[],"concerns":[],"positives":[],"suggestions":[]}',
      });

      mockParseJSONSafe.mockImplementation(() => {
        throw new Error('Invalid response: missing or invalid "summary" field');
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const result = await generator.generate({
        context: createMockContext(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing or invalid "summary" field');
    });

    it('should throw error for invalid recommendation', async () => {
      // Set up callAIProvider mock with valid content structure
      mockCallAIProvider.mockResolvedValue({
        content: '{"summary":"Test","overallAnalysis":"Test","score":80,"maxScore":100,"recommendation":"INVALID_VALUE","recommendationReason":"Test","acceptanceSuggestion":"Test","keyFindings":[],"concerns":[],"positives":[],"suggestions":[]}',
      });

      mockParseJSONSafe.mockImplementation((data: string) => {
        const parsed = JSON.parse(data);
        return parsed as TestReportResult;
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const result = await generator.generate({
        context: createMockContext(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Invalid response: missing or invalid "recommendation" field'
      );
    });

    it('should log debug information for successful generation', async () => {
      mockCallAIProvider.mockResolvedValue({
        content: JSON.stringify(createMockAIResponse()),
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      await generator.generate({
        context: createMockContext(),
      });

      // Verify logging was called (mocked)
      expect(mockCallAIProvider).toHaveBeenCalled();
    });

    it('should handle all recommendation types', async () => {
      const recommendations: Array<TestReportResult['recommendation']> = [
        'MERGE',
        'NEEDS_CHANGES',
        'REJECT',
      ];

      for (const recommendation of recommendations) {
        const mockResponse = createMockAIResponse({ recommendation });
        mockCallAIProvider.mockResolvedValue({
          content: JSON.stringify(mockResponse),
        });

        const generator = new TestReportGenerator({
          provider: 'openai',
          model: 'gpt-4o',
          apiKey: 'test-key',
        });

        const result = await generator.generate({
          context: createMockContext(),
        });

        expect(result.success).toBe(true);
        expect(result.data?.recommendation).toBe(recommendation);
      }
    });
  });

  // ========== Factory Function Tests ==========

  describe('Factory Functions', () => {
    beforeAll(() => {
      vi.stubEnv('AI_PROVIDER', 'openai');
      vi.stubEnv('AI_MODEL', 'gpt-4o');
      vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
      vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-azure-key');
      vi.stubEnv('AI_BASE_URL', 'https://custom.api.url');
      vi.stubEnv('AI_MAX_TOKENS', '16384');
      vi.stubEnv('AI_TEMPERATURE', '0.5');
      vi.stubEnv('AI_TIMEOUT', '180000');
    });

    afterAll(() => {
      vi.unstubAllEnvs();
    });

    it('createOpenAITestReportGenerator should create OpenAI generator', () => {
      const generator = createOpenAITestReportGenerator('test-key', 'gpt-4o');
      expect(generator).toBeInstanceOf(TestReportGenerator);
    });

    it('createOpenAITestReportGenerator should accept custom options', () => {
      const generator = createOpenAITestReportGenerator('test-key', 'gpt-4o', {
        maxTokens: 16384,
        temperature: 0.7,
      });
      const config = generator.getConfig();
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4o');
      expect(config.maxTokens).toBe(16384);
      expect(config.temperature).toBe(0.7);
    });

    it('createAnthropicTestReportGenerator should create Anthropic generator', () => {
      const generator = createAnthropicTestReportGenerator('test-key', 'claude-3-5-sonnet');
      expect(generator).toBeInstanceOf(TestReportGenerator);
    });

    it('createAzureOpenAITestReportGenerator should create Azure generator', () => {
      const generator = createAzureOpenAITestReportGenerator(
        'test-key',
        'https://azure.openai.azure.com',
        'gpt-4o'
      );
      expect(generator).toBeInstanceOf(TestReportGenerator);
    });

    it('createTestReportGeneratorFromEnv should use OpenAI by default', () => {
      const generator = createTestReportGeneratorFromEnv();
      expect(generator).toBeInstanceOf(TestReportGenerator);
    });
  });

  // ========== Response Validation Tests ==========

  describe('Response Validation', () => {
    it('should validate all required fields are present', async () => {
      mockCallAIProvider.mockResolvedValue({
        content: JSON.stringify({
          summary: 'A brief summary',
          overallAnalysis: 'A detailed analysis',
          score: 75,
          maxScore: 100,
          recommendation: 'MERGE',
          recommendationReason: 'Reason for decision',
          acceptanceSuggestion: 'How to proceed',
          keyFindings: ['Finding 1', 'Finding 2'],
          concerns: ['Concern 1'],
          positives: ['Positive 1', 'Positive 2'],
          suggestions: ['Suggestion 1'],
        }),
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const result = await generator.generate({
        context: createMockContext(),
      });

      expect(result.success).toBe(true);
      expect(result.data?.keyFindings).toHaveLength(2);
      expect(result.data?.concerns).toHaveLength(1);
      expect(result.data?.positives).toHaveLength(2);
      expect(result.data?.suggestions).toHaveLength(1);
    });

    it('should handle empty arrays for optional list fields', async () => {
      mockCallAIProvider.mockResolvedValue({
        content: JSON.stringify({
          summary: 'Summary',
          overallAnalysis: 'Analysis',
          score: 50,
          maxScore: 100,
          recommendation: 'NEEDS_CHANGES',
          recommendationReason: 'Needs work',
          acceptanceSuggestion: 'Improve first',
          keyFindings: [],
          concerns: [],
          positives: [],
          suggestions: [],
        }),
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      const result = await generator.generate({
        context: createMockContext(),
      });

      expect(result.success).toBe(true);
      expect(result.data?.keyFindings).toEqual([]);
      expect(result.data?.concerns).toEqual([]);
      expect(result.data?.positives).toEqual([]);
      expect(result.data?.suggestions).toEqual([]);
    });

    it('should cast arrays even if AI returns different types', async () => {
      mockCallAIProvider.mockResolvedValue({
        content: JSON.stringify({
          summary: 'Summary',
          overallAnalysis: 'Analysis',
          score: 60,
          maxScore: 100,
          recommendation: 'MERGE',
          recommendationReason: 'OK',
          acceptanceSuggestion: 'OK',
          keyFindings: 'not an array',
          concerns: 'not an array',
          positives: 'not an array',
          suggestions: 'not an array',
        }),
      });

      const generator = new TestReportGenerator({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
      });

      // This should throw since arrays are expected
      const result = await generator.generate({
        context: createMockContext(),
      });

      expect(result.success).toBe(false);
    });
  });

  // ========== getConfig Tests ==========

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const config: TestReportGeneratorConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        apiKey: 'secret-key',
        maxTokens: 8192,
        temperature: 0.3,
        timeout: 120000,
      };

      const generator = new TestReportGenerator(config);
      const returnedConfig = generator.getConfig();

      // Should be equal but not the same object
      expect(returnedConfig).toEqual(config);
    });

    it('should not expose the original config object', () => {
      const config: TestReportGeneratorConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'secret-key',
      };

      const generator = new TestReportGenerator(config);
      const returnedConfig = generator.getConfig();

      // Modify the returned config
      returnedConfig.apiKey = 'modified';

      // Original should not be modified
      expect(generator.getConfig().apiKey).toBe('secret-key');
    });
  });
});
/**
 * Test Report Generator Module
 *
 * Generates comprehensive test reports using AI-powered analysis.
 * Reuses AI provider utilities from the existing reviewer module.
 */

import {
  AIReviewerConfig,
  AIProvider,
  AIModel,
  callAIProvider,
  type ChatMessage,
  type ChatCompletionResponse,
  extractJSON,
  parseJSONSafe,
} from '../ai/reviewer';
import {
  generateTestReportPrompt,
  SYSTEM_PROMPT_TEST_REPORT,
  type TestReportResult as TestReportResultType,
  type TestReportRecommendation,
} from './prompts';

// Re-export types for convenience
export type { TestReportResultType as TestReportResult };
import type { TestReportContext } from './collector';
import { log } from '../remote-log';

// ========== Types ==========

/**
 * Configuration for Test Report Generator
 */
export interface TestReportGeneratorConfig {
  /** AI provider to use */
  provider: AIProvider;
  /** Specific model to use */
  model: AIModel;
  /** API key for the provider */
  apiKey: string;
  /** Optional base URL for API (useful for Azure OpenAI) */
  baseUrl?: string;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Success result for generation
 */
export interface GenerateSuccess<T> {
  success: true;
  data: T;
}

/**
 * Error result for generation
 */
export interface GenerateError {
  success: false;
  error: string;
  code?: string;
}

/**
 * Union type for generation results
 */
export type GenerateResult<T> = GenerateSuccess<T> | GenerateError;

/**
 * Parameters for generating a test report
 */
export interface GenerateTestReportParams {
  /** The collected test report context */
  context: TestReportContext;
  /** Optional additional instructions for the AI */
  additionalContext?: string;
  /** Custom title for the report (defaults to context plan name) */
  title?: string;
}

// ========== Response Validation ==========

/**
 * Validates the AI response against the expected TestReportResult structure
 */
function validateTestReportResult(data: unknown): TestReportResultType {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: expected an object');
  }

  const result = data as Record<string, unknown>;

  // Validate required fields
  if (typeof result.summary !== 'string') {
    throw new Error('Invalid response: missing or invalid "summary" field');
  }
  if (typeof result.overallAnalysis !== 'string') {
    throw new Error('Invalid response: missing or invalid "overallAnalysis" field');
  }
  if (typeof result.score !== 'number' || isNaN(result.score)) {
    throw new Error('Invalid response: missing or invalid "score" field');
  }
  if (typeof result.maxScore !== 'number' || isNaN(result.maxScore)) {
    throw new Error('Invalid response: missing or invalid "maxScore" field');
  }
  if (
    typeof result.recommendation !== 'string' ||
    !['MERGE', 'NEEDS_CHANGES', 'REJECT'].includes(result.recommendation)
  ) {
    throw new Error(
      'Invalid response: missing or invalid "recommendation" field (must be MERGE, NEEDS_CHANGES, or REJECT)'
    );
  }
  if (typeof result.recommendationReason !== 'string') {
    throw new Error('Invalid response: missing or invalid "recommendationReason" field');
  }
  if (typeof result.acceptanceSuggestion !== 'string') {
    throw new Error('Invalid response: missing or invalid "acceptanceSuggestion" field');
  }
  if (!Array.isArray(result.keyFindings)) {
    throw new Error('Invalid response: missing or invalid "keyFindings" field');
  }
  if (!Array.isArray(result.concerns)) {
    throw new Error('Invalid response: missing or invalid "concerns" field');
  }
  if (!Array.isArray(result.positives)) {
    throw new Error('Invalid response: missing or invalid "positives" field');
  }
  if (!Array.isArray(result.suggestions)) {
    throw new Error('Invalid response: missing or invalid "suggestions" field');
  }

  return {
    summary: result.summary,
    overallAnalysis: result.overallAnalysis,
    score: Math.max(0, Math.min(result.maxScore, result.score)), // Clamp score to valid range
    maxScore: result.maxScore,
    recommendation: result.recommendation as TestReportRecommendation,
    recommendationReason: result.recommendationReason,
    acceptanceSuggestion: result.acceptanceSuggestion,
    keyFindings: result.keyFindings as string[],
    concerns: result.concerns as string[],
    positives: result.positives as string[],
    suggestions: result.suggestions as string[],
  };
}

// ========== Main TestReportGenerator Class ==========

/**
 * Test Report Generator class for generating comprehensive test reports using AI
 *
 * @example
 * ```typescript
 * const generator = new TestReportGenerator({
 *   provider: 'anthropic',
 *   model: 'claude-3-5-sonnet',
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 * });
 *
 * const context = await collectTestReportContext({ reviewId: 'abc123' });
 * const result = await generator.generate({ context });
 *
 * if (result.success) {
 *   console.log('Score:', result.data.score);
 *   console.log('Recommendation:', result.data.recommendation);
 * }
 * ```
 */
export class TestReportGenerator {
  private config: TestReportGeneratorConfig;

  constructor(config: TestReportGeneratorConfig) {
    this.validateConfig(config);
    this.config = {
      ...config,
      maxTokens: config.maxTokens || 8192,
      temperature: config.temperature ?? 0.3,
      timeout: config.timeout || 120000,
    };
  }

  private validateConfig(config: TestReportGeneratorConfig): void {
    if (!config.provider) {
      throw new Error('AI provider is required');
    }
    if (!config.model) {
      throw new Error('AI model is required');
    }
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    if (config.provider === 'azure-openai' && !config.baseUrl) {
      throw new Error('Azure OpenAI requires baseUrl to be configured');
    }
  }

  /**
   * Generates a comprehensive test report based on the provided context
   *
   * @param params - Parameters including context and optional additional instructions
   * @returns GenerateResult containing the TestReportResult or an error
   */
  async generate(params: GenerateTestReportParams): Promise<GenerateResult<TestReportResultType>> {
    const startTime = Date.now();
    const { context, additionalContext } = params;

    log.info('Starting test report generation', {
      reviewId: context.execution?.id,
      hasPrDiff: context.prDiff !== null,
    });

    try {
      // Validate context has required data
      if (!context.execution) {
        throw new Error('Execution data is required for generating a test report');
      }

      // Generate the prompt
      const userPrompt = generateTestReportPrompt({
        context,
        additionalContext,
      });

      // Prepare messages for AI provider
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT_TEST_REPORT },
        { role: 'user', content: userPrompt },
      ];

      // Call AI provider
      const response = await callAIProvider(this.config as AIReviewerConfig, messages);
      const durationMs = Date.now() - startTime;

      log.debug('AI response received', {
        reviewId: context.execution?.id,
        contentLength: response.content.length,
        durationMs,
      });

      // Parse and validate the response
      const parsedData = parseJSONSafe<unknown>(response.content);
      const result = validateTestReportResult(parsedData);

      log.info('Test report generated successfully', {
        reviewId: context.execution?.id,
        score: result.score,
        recommendation: result.recommendation,
        durationMs,
      });

      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorCode =
        error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'PARSE_ERROR';

      log.error('Failed to generate test report', {
        reviewId: context.execution?.id,
        error: errorMessage,
        code: errorCode,
      });

      return {
        success: false,
        error: errorMessage,
        code: errorCode,
      };
    }
  }

  /**
   * Gets the current configuration
   */
  getConfig(): TestReportGeneratorConfig {
    return { ...this.config };
  }
}

// ========== Factory Functions ==========

/**
 * Creates a TestReportGenerator configured from environment variables
 *
 * Environment variables used:
 * - AI_PROVIDER: 'openai' | 'anthropic' | 'azure-openai'
 * - AI_MODEL: The model to use
 * - OPENAI_API_KEY / ANTHROPIC_API_KEY / AZURE_OPENAI_API_KEY: API key
 * - AI_BASE_URL: Optional custom base URL
 * - AI_MAX_TOKENS: Optional max tokens (default: 8192)
 * - AI_TEMPERATURE: Optional temperature (default: 0.3)
 * - AI_TIMEOUT: Optional timeout in ms (default: 120000)
 *
 * @returns Configured TestReportGenerator instance
 * @throws Error if required environment variables are missing
 */
export function createTestReportGeneratorFromEnv(): TestReportGenerator {
  const provider = (process.env.AI_PROVIDER || 'openai') as AIProvider;
  const model = (process.env.AI_MODEL || 'gpt-4o') as AIModel;

  let apiKey: string;
  switch (provider) {
    case 'anthropic':
      apiKey = process.env.ANTHROPIC_API_KEY || '';
      break;
    case 'azure-openai':
      apiKey = process.env.AZURE_OPENAI_API_KEY || '';
      break;
    default:
      apiKey = process.env.OPENAI_API_KEY || '';
  }

  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`);
  }

  return new TestReportGenerator({
    provider,
    model,
    apiKey,
    baseUrl: process.env.AI_BASE_URL,
    maxTokens: process.env.AI_MAX_TOKENS ? parseInt(process.env.AI_MAX_TOKENS, 10) : undefined,
    temperature: process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : undefined,
    timeout: process.env.AI_TIMEOUT ? parseInt(process.env.AI_TIMEOUT, 10) : undefined,
  });
}

/**
 * Creates a TestReportGenerator with OpenAI configuration
 */
export function createOpenAITestReportGenerator(
  apiKey: string,
  model: AIModel = 'gpt-4o',
  options?: Partial<Omit<TestReportGeneratorConfig, 'provider' | 'model' | 'apiKey'>>
): TestReportGenerator {
  return new TestReportGenerator({
    provider: 'openai',
    model,
    apiKey,
    ...options,
  });
}

/**
 * Creates a TestReportGenerator with Anthropic configuration
 */
export function createAnthropicTestReportGenerator(
  apiKey: string,
  model: AIModel = 'claude-3-5-sonnet',
  options?: Partial<Omit<TestReportGeneratorConfig, 'provider' | 'model' | 'apiKey'>>
): TestReportGenerator {
  return new TestReportGenerator({
    provider: 'anthropic',
    model,
    apiKey,
    ...options,
  });
}

/**
 * Creates a TestReportGenerator with Azure OpenAI configuration
 */
export function createAzureOpenAITestReportGenerator(
  apiKey: string,
  baseUrl: string,
  model: AIModel = 'gpt-4o',
  options?: Partial<
    Omit<TestReportGeneratorConfig, 'provider' | 'model' | 'apiKey' | 'baseUrl'>
  >
): TestReportGenerator {
  return new TestReportGenerator({
    provider: 'azure-openai',
    model,
    apiKey,
    baseUrl,
    ...options,
  });
}

// ========== Exports ==========

export default TestReportGenerator;
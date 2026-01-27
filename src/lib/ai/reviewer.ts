/**
 * AI Reviewer Module
 *
 * Core module for AI-powered code review functionality.
 * Supports multiple AI models (OpenAI, Anthropic, etc.) and provides
 * structured review results with scores and comments.
 */

import {
  generateReviewPrompt,
  generateSecurityReviewPrompt,
  generateFocusedReviewPrompt,
  generatePRSummaryPrompt,
  SYSTEM_PROMPT_BASE,
  SYSTEM_PROMPT_SECURITY,
  SYSTEM_PROMPT_PERFORMANCE,
  truncateDiff,
  detectLanguage,
  type ReviewContext,
  // CommentSeverity from prompts not used directly
} from './prompts';

// ========== Types ==========

/** Supported AI model providers */
export type AIProvider = 'openai' | 'anthropic' | 'azure-openai';

/** Specific model identifiers */
export type AIModel =
  // OpenAI models
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-3.5-turbo'
  // Anthropic models
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'claude-3-5-sonnet'
  | 'claude-3-5-haiku';

/** Configuration for AI reviewer */
export interface AIReviewerConfig {
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

/** Review type options */
export type ReviewType = 'comprehensive' | 'security' | 'performance' | 'focused';

/** Review request parameters */
export interface ReviewRequest {
  /** The code diff to review */
  diff: string;
  /** File path being reviewed */
  filePath?: string;
  /** Pull request title */
  prTitle?: string;
  /** Pull request description */
  prDescription?: string;
  /** Additional context for the review */
  additionalContext?: string;
  /** Type of review to perform */
  reviewType?: ReviewType;
  /** Focus areas for focused review */
  focusAreas?: string[];
}

/** PR review request for multiple files */
export interface PRReviewRequest {
  /** Files to review */
  files: Array<{
    path: string;
    diff: string;
  }>;
  /** Pull request title */
  prTitle: string;
  /** Pull request description */
  prDescription?: string;
}

/** Severity level for review comments (uppercase to match types/index.ts) */
export type ReviewCommentSeverity = 'CRITICAL' | 'WARNING' | 'SUGGESTION' | 'INFO';

/** Category for review comments */
export type ReviewCommentCategory =
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'correctness'
  | 'style';

/** Single review comment */
export interface AIReviewComment {
  /** Line number in the diff */
  line: number;
  /** Severity of the issue */
  severity: ReviewCommentSeverity;
  /** Category of the comment */
  category: ReviewCommentCategory;
  /** The review comment content */
  comment: string;
  /** Suggested fix if applicable */
  suggestion?: string;
  /** File path (for multi-file reviews) */
  filePath?: string;
}

/** Approval status for the review */
export type ApprovalStatus = 'approve' | 'request_changes' | 'comment';

/** Complete review result */
export interface AIReviewResult {
  /** Brief summary of the changes and assessment */
  summary: string;
  /** List of review comments */
  comments: AIReviewComment[];
  /** Approval decision */
  approval: ApprovalStatus;
  /** Overall score (1-10) */
  score: number;
  /** Model used for the review */
  model: AIModel;
  /** Time taken in milliseconds */
  durationMs: number;
  /** Token usage if available */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** Security-specific review result */
export interface SecurityReviewResult {
  /** List of vulnerabilities found */
  vulnerabilities: Array<{
    line: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: string;
    description: string;
    impact: string;
    remediation: string;
    references?: string[];
  }>;
  /** Security score (1-10) */
  securityScore: number;
  /** Overall security assessment */
  summary: string;
  /** Model used */
  model: AIModel;
  /** Duration in ms */
  durationMs: number;
}

/** PR summary review result */
export interface PRSummaryResult {
  /** High-level summary */
  summary: string;
  /** List of key changes */
  keyChanges: string[];
  /** List of concerns */
  concerns: string[];
  /** List of suggestions */
  suggestions: string[];
  /** Testing recommendations */
  testingRecommendations: string[];
  /** Approval decision */
  approval: ApprovalStatus;
  /** Overall score */
  score: number;
  /** Model used */
  model: AIModel;
  /** Duration in ms */
  durationMs: number;
}

/** Success result type */
export interface ReviewSuccess<T> {
  success: true;
  data: T;
}

/** Error result type */
export interface ReviewError {
  success: false;
  error: string;
  code?: string;
}

/** Union type for review results */
export type ReviewResultType<T> = ReviewSuccess<T> | ReviewError;

// ========== Provider Types (Reusable for other modules) ==========

/**
 * Chat message structure for AI API calls
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Response from chat completion API
 */
export interface ChatCompletionResponse {
  content: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ========== Provider Implementations ==========

/**
 * Calls the OpenAI API
 */
async function callOpenAI(
  config: AIReviewerConfig,
  messages: ChatMessage[]
): Promise<ChatCompletionResponse> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const url = `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.3,
    }),
    signal: config.timeout ? AbortSignal.timeout(config.timeout) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText}${
        errorData.error?.message ? ` - ${errorData.error.message}` : ''
      }`
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice?.message?.content) {
    throw new Error('Invalid response from OpenAI API');
  }

  return {
    content: choice.message.content,
    tokenUsage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Calls the Anthropic API
 */
async function callAnthropic(
  config: AIReviewerConfig,
  messages: ChatMessage[]
): Promise<ChatCompletionResponse> {
  const baseUrl = config.baseUrl || 'https://api.anthropic.com';
  const url = `${baseUrl}/v1/messages`;

  // Anthropic uses a different format - separate system prompt from messages
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');

  // Map to Anthropic message format
  const anthropicMessages = userMessages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: mapAnthropicModel(config.model),
      max_tokens: config.maxTokens || 4096,
      system: systemMessage?.content || SYSTEM_PROMPT_BASE,
      messages: anthropicMessages,
      temperature: config.temperature ?? 0.3,
    }),
    signal: config.timeout ? AbortSignal.timeout(config.timeout) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Anthropic API error: ${response.status} ${response.statusText}${
        errorData.error?.message ? ` - ${errorData.error.message}` : ''
      }`
    );
  }

  const data = await response.json();
  const textContent = data.content?.find((c: { type: string }) => c.type === 'text');

  if (!textContent?.text) {
    throw new Error('Invalid response from Anthropic API');
  }

  return {
    content: textContent.text,
    tokenUsage: data.usage ? {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    } : undefined,
  };
}

/**
 * Maps our model names to Anthropic's actual model IDs
 */
function mapAnthropicModel(model: AIModel): string {
  const modelMap: Record<string, string> = {
    'claude-3-opus': 'claude-3-opus-20240229',
    'claude-3-sonnet': 'claude-3-sonnet-20240229',
    'claude-3-haiku': 'claude-3-haiku-20240307',
    'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku': 'claude-3-5-haiku-20241022',
  };
  return modelMap[model] || model;
}

/**
 * Calls the Azure OpenAI API
 */
async function callAzureOpenAI(
  config: AIReviewerConfig,
  messages: ChatMessage[]
): Promise<ChatCompletionResponse> {
  if (!config.baseUrl) {
    throw new Error('Azure OpenAI requires baseUrl to be configured');
  }

  const url = `${config.baseUrl}/chat/completions?api-version=2024-02-01`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify({
      messages,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.3,
    }),
    signal: config.timeout ? AbortSignal.timeout(config.timeout) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Azure OpenAI API error: ${response.status} ${response.statusText}${
        errorData.error?.message ? ` - ${errorData.error.message}` : ''
      }`
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice?.message?.content) {
    throw new Error('Invalid response from Azure OpenAI API');
  }

  return {
    content: choice.message.content,
    tokenUsage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Unified function to call AI provider
 */
export async function callAIProvider(
  config: AIReviewerConfig,
  messages: ChatMessage[]
): Promise<ChatCompletionResponse> {
  switch (config.provider) {
    case 'openai':
      return callOpenAI(config, messages);
    case 'anthropic':
      return callAnthropic(config, messages);
    case 'azure-openai':
      return callAzureOpenAI(config, messages);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

// ========== JSON Parsing Utilities (Reusable for other modules) ==========

/**
 * Extracts JSON from a string that may contain markdown code blocks
 */
export function extractJSON(text: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON object or array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  return text.trim();
}

/**
 * Parses JSON safely with error handling
 */
export function parseJSONSafe<T>(text: string): T {
  const jsonStr = extractJSON(text);
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${jsonStr.slice(0, 200)}...`);
  }
}

/**
 * Maps lowercase severity to uppercase
 */
function mapSeverity(severity: string): ReviewCommentSeverity {
  const map: Record<string, ReviewCommentSeverity> = {
    'critical': 'CRITICAL',
    'warning': 'WARNING',
    'suggestion': 'SUGGESTION',
    'info': 'INFO',
  };
  return map[severity.toLowerCase()] || 'INFO';
}

// ========== Main AIReviewer Class ==========

/**
 * AI Reviewer class for performing code reviews using various AI models
 *
 * @example
 * ```typescript
 * const reviewer = new AIReviewer({
 *   provider: 'anthropic',
 *   model: 'claude-3-5-sonnet',
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 * });
 *
 * const result = await reviewer.review({
 *   diff: '+ const x = 1;',
 *   filePath: 'src/utils.ts',
 *   prTitle: 'Add utility constant',
 * });
 *
 * if (result.success) {
 *   console.log('Score:', result.data.score);
 *   console.log('Comments:', result.data.comments);
 * }
 * ```
 */
export class AIReviewer {
  private config: AIReviewerConfig;

  constructor(config: AIReviewerConfig) {
    this.validateConfig(config);
    this.config = {
      ...config,
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.3,
      timeout: config.timeout || 60000,
    };
  }

  private validateConfig(config: AIReviewerConfig): void {
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
   * Performs a comprehensive code review
   */
  async review(request: ReviewRequest): Promise<ReviewResultType<AIReviewResult>> {
    const startTime = Date.now();

    try {
      // Truncate diff if too long
      const diff = truncateDiff(request.diff);
      const language = request.filePath ? detectLanguage(request.filePath) : undefined;

      // Select system prompt based on review type
      let systemPrompt = SYSTEM_PROMPT_BASE;
      if (request.reviewType === 'security') {
        systemPrompt = SYSTEM_PROMPT_SECURITY;
      } else if (request.reviewType === 'performance') {
        systemPrompt = SYSTEM_PROMPT_PERFORMANCE;
      }

      // Generate user prompt based on review type
      let userPrompt: string;
      if (request.reviewType === 'focused' && request.focusAreas?.length) {
        userPrompt = generateFocusedReviewPrompt({
          diff,
          focusAreas: request.focusAreas,
          filePath: request.filePath,
        });
      } else if (request.reviewType === 'security') {
        userPrompt = generateSecurityReviewPrompt({
          diff,
          filePath: request.filePath,
          language,
        });
      } else {
        const context: ReviewContext = {
          diff,
          filePath: request.filePath,
          language,
          prTitle: request.prTitle,
          prDescription: request.prDescription,
          additionalContext: request.additionalContext,
        };
        userPrompt = generateReviewPrompt(context);
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await callAIProvider(this.config, messages);
      const durationMs = Date.now() - startTime;

      // Parse the response
      const parsed = parseJSONSafe<{
        summary: string;
        comments: Array<{
          line: number;
          severity: string;
          category: string;
          comment: string;
          suggestion?: string;
        }>;
        approval: string;
        overallScore: number;
      }>(response.content);

      // Transform to our format
      const result: AIReviewResult = {
        summary: parsed.summary || 'No summary provided',
        comments: (parsed.comments || []).map(c => ({
          line: c.line,
          severity: mapSeverity(c.severity),
          category: (c.category?.toLowerCase() || 'correctness') as ReviewCommentCategory,
          comment: c.comment,
          suggestion: c.suggestion,
          filePath: request.filePath,
        })),
        approval: (parsed.approval?.toLowerCase() || 'comment') as ApprovalStatus,
        score: Math.min(10, Math.max(1, parsed.overallScore || 5)),
        model: this.config.model,
        durationMs,
        tokenUsage: response.tokenUsage,
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'API_ERROR',
      };
    }
  }

  /**
   * Performs a security-focused review
   */
  async securityReview(request: ReviewRequest): Promise<ReviewResultType<SecurityReviewResult>> {
    const startTime = Date.now();

    try {
      const diff = truncateDiff(request.diff);
      const language = request.filePath ? detectLanguage(request.filePath) : undefined;

      const userPrompt = generateSecurityReviewPrompt({
        diff,
        filePath: request.filePath,
        language,
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT_SECURITY },
        { role: 'user', content: userPrompt },
      ];

      const response = await callAIProvider(this.config, messages);
      const durationMs = Date.now() - startTime;

      const parsed = parseJSONSafe<{
        vulnerabilities: Array<{
          line: number;
          severity: string;
          type: string;
          description: string;
          impact: string;
          remediation: string;
          references?: string[];
        }>;
        securityScore: number;
        summary: string;
      }>(response.content);

      const result: SecurityReviewResult = {
        vulnerabilities: (parsed.vulnerabilities || []).map(v => ({
          line: v.line,
          severity: v.severity?.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
          type: v.type,
          description: v.description,
          impact: v.impact,
          remediation: v.remediation,
          references: v.references,
        })),
        securityScore: Math.min(10, Math.max(1, parsed.securityScore || 5)),
        summary: parsed.summary || 'No summary provided',
        model: this.config.model,
        durationMs,
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'API_ERROR',
      };
    }
  }

  /**
   * Reviews an entire pull request with multiple files
   */
  async reviewPR(request: PRReviewRequest): Promise<ReviewResultType<PRSummaryResult>> {
    const startTime = Date.now();

    try {
      // Truncate individual file diffs if needed
      const files = request.files.map(f => ({
        path: f.path,
        diff: truncateDiff(f.diff, 5000), // Smaller limit per file for multi-file reviews
      }));

      const userPrompt = generatePRSummaryPrompt(
        files,
        request.prTitle,
        request.prDescription
      );

      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT_BASE },
        { role: 'user', content: userPrompt },
      ];

      const response = await callAIProvider(this.config, messages);
      const durationMs = Date.now() - startTime;

      const parsed = parseJSONSafe<{
        summary: string;
        keyChanges: string[];
        concerns: string[];
        suggestions: string[];
        testingRecommendations: string[];
        approval: string;
        overallScore: number;
      }>(response.content);

      const result: PRSummaryResult = {
        summary: parsed.summary || 'No summary provided',
        keyChanges: parsed.keyChanges || [],
        concerns: parsed.concerns || [],
        suggestions: parsed.suggestions || [],
        testingRecommendations: parsed.testingRecommendations || [],
        approval: (parsed.approval?.toLowerCase() || 'comment') as ApprovalStatus,
        score: Math.min(10, Math.max(1, parsed.overallScore || 5)),
        model: this.config.model,
        durationMs,
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'API_ERROR',
      };
    }
  }

  /**
   * Reviews multiple files individually and aggregates results
   */
  async reviewFiles(
    files: Array<{ path: string; diff: string }>,
    options?: { prTitle?: string; prDescription?: string }
  ): Promise<ReviewResultType<{ results: AIReviewResult[]; aggregateScore: number }>> {
    const results: AIReviewResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const result = await this.review({
        diff: file.diff,
        filePath: file.path,
        prTitle: options?.prTitle,
        prDescription: options?.prDescription,
      });

      if (result.success) {
        results.push(result.data);
      } else {
        errors.push(`${file.path}: ${result.error}`);
      }
    }

    if (results.length === 0) {
      return {
        success: false,
        error: `All file reviews failed: ${errors.join('; ')}`,
        code: 'ALL_FAILED',
      };
    }

    // Calculate aggregate score
    const aggregateScore = Math.round(
      results.reduce((sum, r) => sum + r.score, 0) / results.length
    );

    return {
      success: true,
      data: { results, aggregateScore },
    };
  }
}

// ========== Factory Functions ==========

/**
 * Creates an AIReviewer configured from environment variables
 *
 * Environment variables used:
 * - AI_PROVIDER: 'openai' | 'anthropic' | 'azure-openai'
 * - AI_MODEL: The model to use
 * - OPENAI_API_KEY / ANTHROPIC_API_KEY / AZURE_OPENAI_API_KEY: API key
 * - AI_BASE_URL: Optional custom base URL
 * - AI_MAX_TOKENS: Optional max tokens (default: 4096)
 * - AI_TEMPERATURE: Optional temperature (default: 0.3)
 * - AI_TIMEOUT: Optional timeout in ms (default: 60000)
 *
 * @returns Configured AIReviewer instance
 * @throws Error if required environment variables are missing
 */
export function createReviewerFromEnv(): AIReviewer {
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

  return new AIReviewer({
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
 * Creates an AIReviewer with OpenAI configuration
 */
export function createOpenAIReviewer(
  apiKey: string,
  model: AIModel = 'gpt-4o',
  options?: Partial<Omit<AIReviewerConfig, 'provider' | 'model' | 'apiKey'>>
): AIReviewer {
  return new AIReviewer({
    provider: 'openai',
    model,
    apiKey,
    ...options,
  });
}

/**
 * Creates an AIReviewer with Anthropic configuration
 */
export function createAnthropicReviewer(
  apiKey: string,
  model: AIModel = 'claude-3-5-sonnet',
  options?: Partial<Omit<AIReviewerConfig, 'provider' | 'model' | 'apiKey'>>
): AIReviewer {
  return new AIReviewer({
    provider: 'anthropic',
    model,
    apiKey,
    ...options,
  });
}

/**
 * Creates an AIReviewer with Azure OpenAI configuration
 */
export function createAzureOpenAIReviewer(
  apiKey: string,
  baseUrl: string,
  model: AIModel = 'gpt-4o',
  options?: Partial<Omit<AIReviewerConfig, 'provider' | 'model' | 'apiKey' | 'baseUrl'>>
): AIReviewer {
  return new AIReviewer({
    provider: 'azure-openai',
    model,
    apiKey,
    baseUrl,
    ...options,
  });
}

// ========== Exports ==========

export default AIReviewer;

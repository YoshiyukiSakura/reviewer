/**
 * GitHub API module for Pull Request Reviews
 *
 * This module provides functions to manage PR reviews via the GitHub API,
 * including listing, creating, submitting, and deleting reviews.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration for GitHub API requests
 */
export interface GitHubConfig {
  /** GitHub API token for authentication */
  token: string;
  /** GitHub API base URL (defaults to https://api.github.com) */
  baseUrl: string;
}

/**
 * Parameters for PR operations
 */
export interface PRParams {
  /** Repository owner (user or organization) */
  owner: string;
  /** Repository name */
  repo: string;
  /** Pull request number */
  pullNumber: number;
}

/**
 * Review event type when submitting a review
 */
export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

/**
 * Status of a review
 */
export type ReviewState = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';

/**
 * Represents a comment on a specific line in the PR diff
 */
export interface ReviewComment {
  /** Path to the file being commented on */
  path: string;
  /** Line number in the diff where the comment starts */
  startLine?: number;
  /** Line number in the diff where the comment ends */
  line: number;
  /** Body text of the comment */
  body: string;
}

/**
 * Represents a PR review submitted by a reviewer
 */
export interface PullRequestReview {
  /** Unique identifier for the review */
  id: number;
  /** Node ID of the review */
  nodeId: string;
  /** Login of the user who created the review */
  userLogin: string;
  /** State of the review */
  state: ReviewState;
  /** Body text of the review */
  body: string;
  /** Body text of the review reply */
  bodyHtml?: string;
  /** HTML URL of the review */
  htmlUrl: string;
  /** Pull request URL */
  pullRequestUrl: string;
  /** ID of the commit being reviewed */
  commitId: string;
  /** ID of the parent commit */
  baseCommitId: string;
  /** List of comments on the review */
  comments: Array<{
    id: number;
    path: string;
    line: number;
    startLine?: number;
    body: string;
    bodyText: string;
    htmlUrl: string;
    pullRequestUrl: string;
    commitId: string;
  }>;
  /** Timestamp when the review was submitted */
  submittedAt?: string;
}

/**
 * Success result for review list operations
 */
export interface ListPRReviewsSuccess {
  success: true;
  data: PullRequestReview[];
}

/**
 * Error result for review operations
 */
export interface PRReviewError {
  success: false;
  error: string;
}

/**
 * Result type for listPRReviews function
 */
export type ListPRReviewsResult = ListPRReviewsSuccess | PRReviewError;

/**
 * Success result for single review operations
 */
export interface GetPRReviewSuccess {
  success: true;
  data: PullRequestReview;
}

/**
 * Result type for getPRReview function
 */
export type GetPRReviewResult = GetPRReviewSuccess | PRReviewError;

/**
 * Options for creating a review
 */
export interface CreateReviewOptions {
  /** The review body text */
  body?: string;
  /** The review event type */
  event?: ReviewEvent;
  /** List of inline comments for the review */
  comments?: ReviewComment[];
  /** The SHA of the commit to review */
  commitId?: string;
}

/**
 * Success result for create review operation
 */
export interface CreatePRReviewSuccess {
  success: true;
  data: PullRequestReview;
}

/**
 * Result type for createPRReview function
 */
export type CreatePRReviewResult = CreatePRReviewSuccess | PRReviewError;

/**
 * Options for submitting a pending review
 */
export interface SubmitReviewOptions {
  /** The review event (APPROVE, REQUEST_CHANGES, COMMENT) */
  event: ReviewEvent;
  /** The review body text */
  body?: string;
}

/**
 * Success result for submit review operation
 */
export interface SubmitPRReviewSuccess {
  success: true;
  data: PullRequestReview;
}

/**
 * Result type for submitPRReview function
 */
export type SubmitPRReviewResult = SubmitPRReviewSuccess | PRReviewError;

/**
 * Success result for delete review operation
 */
export interface DeletePRReviewSuccess {
  success: true;
  data: {
    /** Review ID that was deleted */
    reviewId: number;
  };
}

/**
 * Result type for deletePRReview function
 */
export type DeletePRReviewResult = DeletePRReviewSuccess | PRReviewError;

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Gets the GitHub token from environment variables
 * @returns The GitHub token
 * @throws Error if GITHUB_TOKEN is not set
 */
function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }
  return token;
}

/**
 * Gets the GitHub API base URL from environment variables
 * @returns The GitHub API base URL
 */
function getGitHubBaseUrl(): string {
  return process.env.GITHUB_API_URL || 'https://api.github.com';
}

/**
 * Creates a GitHub configuration object from environment variables
 * @returns GitHubConfig object
 */
function createConfig(): GitHubConfig {
  return {
    token: getGitHubToken(),
    baseUrl: getGitHubBaseUrl(),
  };
}

/**
 * Creates headers for GitHub API requests
 * @param token - GitHub API token
 * @returns Headers object for fetch requests
 */
function createHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates PR parameters
 * @param params - PR parameters to validate
 * @returns Error message if validation fails, null otherwise
 */
function validatePRParams(params: PRParams): string | null {
  const { owner, repo, pullNumber } = params;

  if (!owner || typeof owner !== 'string') {
    return 'Invalid owner parameter: must be a non-empty string';
  }

  if (!repo || typeof repo !== 'string') {
    return 'Invalid repo parameter: must be a non-empty string';
  }

  if (!pullNumber || typeof pullNumber !== 'number' || pullNumber < 1) {
    return 'Invalid pullNumber parameter: must be a positive integer';
  }

  return null;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Lists all reviews for a specific pull request
 *
 * @param params - The PR parameters (owner, repo, pullNumber)
 * @returns Promise resolving to ListPRReviewsResult
 *
 * @example
 * ```typescript
 * const result = await listPRReviews({
 *   owner: 'octocat',
 *   repo: 'hello-world',
 *   pullNumber: 42
 * });
 *
 * if (result.success) {
 *   console.log(`Found ${result.data.length} reviews`);
 * } else {
 *   console.error(`Failed to list reviews: ${result.error}`);
 * }
 * ```
 */
export async function listPRReviews(params: PRParams): Promise<ListPRReviewsResult> {
  const validationError = validatePRParams(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { owner, repo, pullNumber } = params;

  try {
    const config = createConfig();
    const url = `${config.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;

    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(config.token),
    });

    if (!response.ok) {
      switch (response.status) {
        case 401:
          return { success: false, error: 'Authentication failed: Invalid or expired GitHub token' };
        case 403:
          return { success: false, error: 'Permission denied: Insufficient permissions to view reviews' };
        case 404:
          return { success: false, error: `Pull request not found: ${owner}/${repo}#${pullNumber}` };
        default:
          return { success: false, error: `GitHub API error (${response.status}): ${response.statusText}` };
      }
    }

    const reviewsData = await response.json();

    const reviews: PullRequestReview[] = reviewsData.map((review: Record<string, unknown>) => ({
      id: review.id as number,
      nodeId: review.node_id as string,
      userLogin: (review.user as Record<string, unknown>)?.login as string,
      state: review.state as ReviewState,
      body: review.body as string,
      bodyHtml: review.body_html as string,
      htmlUrl: review.html_url as string,
      pullRequestUrl: review.pull_request_url as string,
      commitId: review.commit_id as string,
      baseCommitId: review.base_commit_id as string,
      comments: (review.comments as Array<Record<string, unknown>>)?.map((comment: Record<string, unknown>) => ({
        id: comment.id as number,
        path: comment.path as string,
        line: comment.line as number,
        startLine: comment.start_line as number,
        body: comment.body as string,
        bodyText: comment.body_text as string,
        htmlUrl: comment.html_url as string,
        pullRequestUrl: comment.pull_request_url as string,
        commitId: comment.commit_id as string,
      })) || [],
      submittedAt: review.submitted_at as string,
    }));

    return { success: true, data: reviews };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while listing PR reviews' };
  }
}

/**
 * Gets a specific review for a pull request
 *
 * @param params - The PR parameters (owner, repo, pullNumber)
 * @param reviewId - The review ID to fetch
 * @returns Promise resolving to GetPRReviewResult
 *
 * @example
 * ```typescript
 * const result = await getPRReview(
 *   { owner: 'octocat', repo: 'hello-world', pullNumber: 42 },
 *   123
 * );
 * ```
 */
export async function getPRReview(
  params: PRParams,
  reviewId: number
): Promise<GetPRReviewResult> {
  const validationError = validatePRParams(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  if (!reviewId || typeof reviewId !== 'number' || reviewId < 1) {
    return { success: false, error: 'Invalid reviewId parameter: must be a positive integer' };
  }

  const { owner, repo, pullNumber } = params;

  try {
    const config = createConfig();
    const url = `${config.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews/${reviewId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(config.token),
    });

    if (!response.ok) {
      switch (response.status) {
        case 401:
          return { success: false, error: 'Authentication failed: Invalid or expired GitHub token' };
        case 403:
          return { success: false, error: 'Permission denied: Insufficient permissions to view this review' };
        case 404:
          return { success: false, error: `Review not found: #${reviewId} on ${owner}/${repo}#${pullNumber}` };
        default:
          return { success: false, error: `GitHub API error (${response.status}): ${response.statusText}` };
      }
    }

    const review = await response.json();

    const reviewData: PullRequestReview = {
      id: review.id,
      nodeId: review.node_id,
      userLogin: review.user?.login,
      state: review.state,
      body: review.body,
      bodyHtml: review.body_html,
      htmlUrl: review.html_url,
      pullRequestUrl: review.pull_request_url,
      commitId: review.commit_id,
      baseCommitId: review.base_commit_id,
      comments: (review.comments || []).map((comment: Record<string, unknown>) => ({
        id: comment.id,
        path: comment.path,
        line: comment.line,
        startLine: comment.start_line,
        body: comment.body,
        bodyText: comment.body_text,
        htmlUrl: comment.html_url,
        pullRequestUrl: comment.pull_request_url,
        commitId: comment.commit_id,
      })),
      submittedAt: review.submitted_at,
    };

    return { success: true, data: reviewData };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while fetching PR review' };
  }
}

/**
 * Creates a new review on a pull request
 *
 * @param params - The PR parameters (owner, repo, pullNumber)
 * @param options - Review creation options
 * @returns Promise resolving to CreatePRReviewResult
 *
 * @example
 * ```typescript
 * const result = await createPRReview(
 *   { owner: 'octocat', repo: 'hello-world', pullNumber: 42 },
 *   { event: 'APPROVE', body: 'LGTM!' }
 * );
 * ```
 */
export async function createPRReview(
  params: PRParams,
  options: CreateReviewOptions = {}
): Promise<CreatePRReviewResult> {
  const validationError = validatePRParams(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { owner, repo, pullNumber } = params;
  const { body, event = 'COMMENT', comments, commitId } = options;

  try {
    const config = createConfig();
    const url = `${config.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;

    const requestBody: Record<string, unknown> = {
      event,
    };

    if (body) {
      requestBody.body = body;
    }

    if (comments && comments.length > 0) {
      requestBody.comments = comments.map((comment) => ({
        path: comment.path,
        line: comment.line,
        start_line: comment.startLine,
        body: comment.body,
      }));
    }

    if (commitId) {
      requestBody.commit_id = commitId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: createHeaders(config.token),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      switch (response.status) {
        case 401:
          return { success: false, error: 'Authentication failed: Invalid or expired GitHub token' };
        case 403:
          return { success: false, error: 'Permission denied: Insufficient permissions to create reviews' };
        case 404:
          return { success: false, error: `Pull request not found: ${owner}/${repo}#${pullNumber}` };
        case 422:
          return { success: false, error: `Validation failed: ${errorText}` };
        default:
          return { success: false, error: `GitHub API error (${response.status}): ${errorText}` };
      }
    }

    const review = await response.json();

    const reviewData: PullRequestReview = {
      id: review.id,
      nodeId: review.node_id,
      userLogin: review.user?.login,
      state: review.state,
      body: review.body,
      bodyHtml: review.body_html,
      htmlUrl: review.html_url,
      pullRequestUrl: review.pull_request_url,
      commitId: review.commit_id,
      baseCommitId: review.base_commit_id,
      comments: (review.comments || []).map((comment: Record<string, unknown>) => ({
        id: comment.id,
        path: comment.path,
        line: comment.line,
        startLine: comment.start_line,
        body: comment.body,
        bodyText: comment.body_text,
        htmlUrl: comment.html_url,
        pullRequestUrl: comment.pull_request_url,
        commitId: comment.commit_id,
      })),
      submittedAt: review.submitted_at,
    };

    return { success: true, data: reviewData };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while creating PR review' };
  }
}

/**
 * Submits a pending review on a pull request
 *
 * @param params - The PR parameters (owner, repo, pullNumber)
 * @param reviewId - The pending review ID to submit
 * @param options - Submit options including event and body
 * @returns Promise resolving to SubmitPRReviewResult
 *
 * @example
 * ```typescript
 * const result = await submitPRReview(
 *   { owner: 'octocat', repo: 'hello-world', pullNumber: 42 },
 *   123,
 *   { event: 'APPROVE', body: 'Great work!' }
 * );
 * ```
 */
export async function submitPRReview(
  params: PRParams,
  reviewId: number,
  options: SubmitReviewOptions
): Promise<SubmitPRReviewResult> {
  const validationError = validatePRParams(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  if (!reviewId || typeof reviewId !== 'number' || reviewId < 1) {
    return { success: false, error: 'Invalid reviewId parameter: must be a positive integer' };
  }

  const { owner, repo, pullNumber } = params;
  const { event, body } = options;

  try {
    const config = createConfig();
    const url = `${config.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews/${reviewId}/events`;

    const requestBody: Record<string, string> = {
      event,
    };

    if (body) {
      requestBody.body = body;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: createHeaders(config.token),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      switch (response.status) {
        case 401:
          return { success: false, error: 'Authentication failed: Invalid or expired GitHub token' };
        case 403:
          return { success: false, error: 'Permission denied: Insufficient permissions to submit reviews' };
        case 404:
          return { success: false, error: `Review not found: #${reviewId} on ${owner}/${repo}#${pullNumber}` };
        case 422:
          return { success: false, error: `Validation failed: ${errorText}` };
        case 500:
          return { success: false, error: 'GitHub internal server error while submitting review' };
        default:
          return { success: false, error: `GitHub API error (${response.status}): ${errorText}` };
      }
    }

    const review = await response.json();

    const reviewData: PullRequestReview = {
      id: review.id,
      nodeId: review.node_id,
      userLogin: review.user?.login,
      state: review.state,
      body: review.body,
      bodyHtml: review.body_html,
      htmlUrl: review.html_url,
      pullRequestUrl: review.pull_request_url,
      commitId: review.commit_id,
      baseCommitId: review.base_commit_id,
      comments: (review.comments || []).map((comment: Record<string, unknown>) => ({
        id: comment.id,
        path: comment.path,
        line: comment.line,
        startLine: comment.start_line,
        body: comment.body,
        bodyText: comment.body_text,
        htmlUrl: comment.html_url,
        pullRequestUrl: comment.pull_request_url,
        commitId: comment.commit_id,
      })),
      submittedAt: review.submitted_at,
    };

    return { success: true, data: reviewData };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while submitting PR review' };
  }
}

/**
 * Deletes a pending review on a pull request
 *
 * @param params - The PR parameters (owner, repo, pullNumber)
 * @param reviewId - The review ID to delete
 * @returns Promise resolving to DeletePRReviewResult
 *
 * @example
 * ```typescript
 * const result = await deletePRReview(
 *   { owner: 'octocat', repo: 'hello-world', pullNumber: 42 },
 *   123
 * );
 * ```
 */
export async function deletePRReview(
  params: PRParams,
  reviewId: number
): Promise<DeletePRReviewResult> {
  const validationError = validatePRParams(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  if (!reviewId || typeof reviewId !== 'number' || reviewId < 1) {
    return { success: false, error: 'Invalid reviewId parameter: must be a positive integer' };
  }

  const { owner, repo, pullNumber } = params;

  try {
    const config = createConfig();
    const url = `${config.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews/${reviewId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: createHeaders(config.token),
    });

    if (!response.ok) {
      const errorText = await response.text();
      switch (response.status) {
        case 401:
          return { success: false, error: 'Authentication failed: Invalid or expired GitHub token' };
        case 403:
          return { success: false, error: 'Permission denied: Insufficient permissions to delete reviews' };
        case 404:
          return { success: false, error: `Review not found: #${reviewId} on ${owner}/${repo}#${pullNumber}` };
        case 422:
          return { success: false, error: `Cannot delete review: ${errorText}` };
        default:
          return { success: false, error: `GitHub API error (${response.status}): ${errorText}` };
      }
    }

    return { success: true, data: { reviewId } };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while deleting PR review' };
  }
}
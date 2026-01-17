/**
 * GitHub PR Actions Module
 *
 * This module provides functions to perform actions on GitHub Pull Requests,
 * such as closing, merging, and updating PRs via the GitHub API.
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
 * GitHub Pull Request state
 */
export type PRState = 'open' | 'closed';

/**
 * Successful response for close PR operation
 */
export interface ClosePRSuccess {
  success: true;
  data: {
    /** PR number */
    number: number;
    /** PR state after the operation */
    state: PRState;
    /** PR title */
    title: string;
    /** URL to the PR */
    htmlUrl: string;
  };
}

/**
 * Error response for PR operations
 */
export interface PRActionError {
  success: false;
  /** Error message describing what went wrong */
  error: string;
}

/**
 * Result type for close PR operation
 */
export type ClosePRResult = ClosePRSuccess | PRActionError;

/**
 * Successful response for merge PR operation
 */
export interface MergePRSuccess {
  success: true;
  data: {
    /** SHA of the merge commit */
    sha: string;
    /** Whether the merge was successful */
    merged: boolean;
    /** Message from the merge operation */
    message: string;
  };
}

/**
 * Result type for merge PR operation
 */
export type MergePRResult = MergePRSuccess | PRActionError;

/**
 * Options for merging a PR
 */
export interface MergePROptions {
  /** Commit title for the merge */
  commitTitle?: string;
  /** Commit message for the merge */
  commitMessage?: string;
  /** Merge method to use */
  mergeMethod?: 'merge' | 'squash' | 'rebase';
}

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
// PR Action Functions
// ============================================================================

/**
 * Closes a pull request on GitHub
 *
 * @param params - The PR parameters (owner, repo, pullNumber)
 * @returns Promise resolving to ClosePRResult
 *
 * @example
 * ```typescript
 * const result = await closePullRequest({
 *   owner: 'octocat',
 *   repo: 'hello-world',
 *   pullNumber: 42
 * });
 *
 * if (result.success) {
 *   console.log(`PR #${result.data.number} closed successfully`);
 * } else {
 *   console.error(`Failed to close PR: ${result.error}`);
 * }
 * ```
 */
export async function closePullRequest(params: PRParams): Promise<ClosePRResult> {
  // Validate parameters
  const validationError = validatePRParams(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { owner, repo, pullNumber } = params;

  try {
    const config = createConfig();
    const url = `${config.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: createHeaders(config.token),
      body: JSON.stringify({ state: 'closed' }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      switch (response.status) {
        case 401:
          return {
            success: false,
            error: 'Authentication failed: Invalid or expired GitHub token',
          };
        case 403:
          return {
            success: false,
            error: 'Permission denied: Insufficient permissions to close this PR',
          };
        case 404:
          return {
            success: false,
            error: `PR not found: ${owner}/${repo}#${pullNumber} does not exist`,
          };
        case 422:
          return {
            success: false,
            error: `Validation failed: ${errorText}`,
          };
        default:
          return {
            success: false,
            error: `GitHub API error (${response.status}): ${errorText}`,
          };
      }
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        number: data.number,
        state: data.state as PRState,
        title: data.title,
        htmlUrl: data.html_url,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while closing the PR' };
  }
}

/**
 * Reopens a closed pull request on GitHub
 *
 * @param params - The PR parameters (owner, repo, pullNumber)
 * @returns Promise resolving to ClosePRResult
 *
 * @example
 * ```typescript
 * const result = await reopenPullRequest({
 *   owner: 'octocat',
 *   repo: 'hello-world',
 *   pullNumber: 42
 * });
 *
 * if (result.success) {
 *   console.log(`PR #${result.data.number} reopened successfully`);
 * }
 * ```
 */
export async function reopenPullRequest(params: PRParams): Promise<ClosePRResult> {
  // Validate parameters
  const validationError = validatePRParams(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { owner, repo, pullNumber } = params;

  try {
    const config = createConfig();
    const url = `${config.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: createHeaders(config.token),
      body: JSON.stringify({ state: 'open' }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      switch (response.status) {
        case 401:
          return {
            success: false,
            error: 'Authentication failed: Invalid or expired GitHub token',
          };
        case 403:
          return {
            success: false,
            error: 'Permission denied: Insufficient permissions to reopen this PR',
          };
        case 404:
          return {
            success: false,
            error: `PR not found: ${owner}/${repo}#${pullNumber} does not exist`,
          };
        case 422:
          return {
            success: false,
            error: `Cannot reopen PR: ${errorText}`,
          };
        default:
          return {
            success: false,
            error: `GitHub API error (${response.status}): ${errorText}`,
          };
      }
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        number: data.number,
        state: data.state as PRState,
        title: data.title,
        htmlUrl: data.html_url,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while reopening the PR' };
  }
}

/**
 * Merges a pull request on GitHub
 *
 * @param params - The PR parameters (owner, repo, pullNumber)
 * @param options - Optional merge configuration
 * @returns Promise resolving to MergePRResult
 *
 * @example
 * ```typescript
 * const result = await mergePullRequest(
 *   { owner: 'octocat', repo: 'hello-world', pullNumber: 42 },
 *   { mergeMethod: 'squash', commitTitle: 'feat: Add new feature' }
 * );
 *
 * if (result.success) {
 *   console.log(`PR merged with SHA: ${result.data.sha}`);
 * }
 * ```
 */
export async function mergePullRequest(
  params: PRParams,
  options: MergePROptions = {}
): Promise<MergePRResult> {
  // Validate parameters
  const validationError = validatePRParams(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { owner, repo, pullNumber } = params;
  const { commitTitle, commitMessage, mergeMethod = 'merge' } = options;

  try {
    const config = createConfig();
    const url = `${config.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/merge`;

    const body: Record<string, string> = {
      merge_method: mergeMethod,
    };

    if (commitTitle) {
      body.commit_title = commitTitle;
    }

    if (commitMessage) {
      body.commit_message = commitMessage;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: createHeaders(config.token),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();

      switch (response.status) {
        case 401:
          return {
            success: false,
            error: 'Authentication failed: Invalid or expired GitHub token',
          };
        case 403:
          return {
            success: false,
            error: 'Permission denied: Insufficient permissions to merge this PR',
          };
        case 404:
          return {
            success: false,
            error: `PR not found: ${owner}/${repo}#${pullNumber} does not exist`,
          };
        case 405:
          return {
            success: false,
            error: 'PR cannot be merged: merge not allowed by repository settings',
          };
        case 409:
          return {
            success: false,
            error: 'Merge conflict: PR head has been modified since merge was requested',
          };
        default:
          return {
            success: false,
            error: `GitHub API error (${response.status}): ${errorText}`,
          };
      }
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        sha: data.sha,
        merged: data.merged,
        message: data.message,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while merging the PR' };
  }
}

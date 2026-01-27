/**
 * GitHub URL Parser Module
 *
 * This module provides functions to parse GitHub PR URLs
 * and extract relevant information like owner, repo, and pull request number.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Result of parsing a GitHub PR URL
 */
export interface ParsedPRUrl {
  /** Repository owner (user or organization) */
  owner: string;
  /** Repository name */
  repo: string;
  /** Pull request number */
  pullNumber: number;
}

// ============================================================================
// URL Parser Functions
// ============================================================================

/**
 * Parses a GitHub PR URL and extracts the owner, repo, and pullNumber.
 *
 * Supports the following URL formats:
 * - https://github.com/owner/repo/pull/123
 * - https://github.com/owner/repo/pull/123/
 * - https://www.github.com/owner/repo/pull/123
 * - http://github.com/owner/repo/pull/123
 *
 * @param url - The GitHub PR URL to parse
 * @returns ParsedPRUrl object if the URL is valid, null otherwise
 *
 * @example
 * ```typescript
 * const result = parseGitHubPRUrl('https://github.com/octocat/hello-world/pull/42');
 * // result: { owner: 'octocat', repo: 'hello-world', pullNumber: 42 }
 * ```
 *
 * @example
 * ```typescript
 * const result = parseGitHubPRUrl('invalid-url');
 * // result: null
 * ```
 */
export function parseGitHubPRUrl(url: string): ParsedPRUrl | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Match GitHub PR URL patterns
  const patterns = [
    // Standard GitHub URL with optional www prefix and trailing slash
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/i,
    // GitHub URL with trailing path after pull number
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)\/.+$/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const owner = match[1];
      const repo = match[2];
      const pullNumber = parseInt(match[3], 10);

      // Validate that we have non-empty values
      if (owner && repo && !isNaN(pullNumber) && pullNumber > 0) {
        return {
          owner,
          repo,
          pullNumber,
        };
      }
    }
  }

  return null;
}
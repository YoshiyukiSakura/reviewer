/**
 * GitHub API module for fetching Pull Request diffs
 */

/** Configuration for GitHub API */
export interface GitHubConfig {
  token: string;
  baseUrl?: string;
}

/** Represents a single file change in a PR */
export interface PullRequestFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string;
}

/** Represents the complete diff for a PR */
export interface PullRequestDiff {
  owner: string;
  repo: string;
  pullNumber: number;
  files: PullRequestFile[];
  totalAdditions: number;
  totalDeletions: number;
  totalChanges: number;
}

/** Success result when fetching PR diff */
export interface GetPRDiffSuccess {
  success: true;
  data: PullRequestDiff;
}

/** Error result when fetching PR diff */
export interface GetPRDiffError {
  success: false;
  error: string;
}

/** Result type for getPRDiff function */
export type GetPRDiffResult = GetPRDiffSuccess | GetPRDiffError;

/** Parameters for fetching PR diff */
export interface GetPRDiffParams {
  owner: string;
  repo: string;
  pullNumber: number;
}

/**
 * Gets the GitHub API token from environment variables
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
 * Gets the GitHub API base URL from environment variables or returns default
 */
function getGitHubBaseUrl(): string {
  return process.env.GITHUB_API_URL || 'https://api.github.com';
}

/**
 * Creates a configured GitHub API client
 */
function createConfig(): GitHubConfig {
  return {
    token: getGitHubToken(),
    baseUrl: getGitHubBaseUrl(),
  };
}

/**
 * Fetches the list of files changed in a Pull Request
 *
 * @param params - The PR identification parameters (owner, repo, pullNumber)
 * @returns A result object containing the PR diff data or an error
 *
 * @example
 * ```typescript
 * const result = await getPRDiff({
 *   owner: 'octocat',
 *   repo: 'Hello-World',
 *   pullNumber: 1
 * });
 *
 * if (result.success) {
 *   console.log('Files changed:', result.data.files.length);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export async function getPRDiff(params: GetPRDiffParams): Promise<GetPRDiffResult> {
  const { owner, repo, pullNumber } = params;

  // Validate input parameters
  if (!owner || typeof owner !== 'string') {
    return { success: false, error: 'Invalid owner parameter' };
  }
  if (!repo || typeof repo !== 'string') {
    return { success: false, error: 'Invalid repo parameter' };
  }
  if (!pullNumber || typeof pullNumber !== 'number' || pullNumber < 1) {
    return { success: false, error: 'Invalid pullNumber parameter' };
  }

  try {
    const config = createConfig();
    const url = `${config.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/files`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${config.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: `Pull request #${pullNumber} not found in ${owner}/${repo}` };
      }
      if (response.status === 401) {
        return { success: false, error: 'Invalid or expired GitHub token' };
      }
      if (response.status === 403) {
        return { success: false, error: 'GitHub API rate limit exceeded or access denied' };
      }
      return { success: false, error: `GitHub API error: ${response.status} ${response.statusText}` };
    }

    const filesData = await response.json() as Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      changes: number;
      patch?: string;
      previous_filename?: string;
    }>;

    const files: PullRequestFile[] = filesData.map((file) => ({
      filename: file.filename,
      status: file.status as PullRequestFile['status'],
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
      previousFilename: file.previous_filename,
    }));

    const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
    const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);
    const totalChanges = files.reduce((sum, file) => sum + file.changes, 0);

    return {
      success: true,
      data: {
        owner,
        repo,
        pullNumber,
        files,
        totalAdditions,
        totalDeletions,
        totalChanges,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while fetching PR diff' };
  }
}

/**
 * Fetches the raw unified diff for a Pull Request
 *
 * @param params - The PR identification parameters (owner, repo, pullNumber)
 * @returns A result object containing the raw diff string or an error
 */
export async function getPRRawDiff(params: GetPRDiffParams): Promise<{ success: true; data: string } | { success: false; error: string }> {
  const { owner, repo, pullNumber } = params;

  // Validate input parameters
  if (!owner || typeof owner !== 'string') {
    return { success: false, error: 'Invalid owner parameter' };
  }
  if (!repo || typeof repo !== 'string') {
    return { success: false, error: 'Invalid repo parameter' };
  }
  if (!pullNumber || typeof pullNumber !== 'number' || pullNumber < 1) {
    return { success: false, error: 'Invalid pullNumber parameter' };
  }

  try {
    const config = createConfig();
    const url = `${config.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3.diff',
        'Authorization': `Bearer ${config.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: `Pull request #${pullNumber} not found in ${owner}/${repo}` };
      }
      if (response.status === 401) {
        return { success: false, error: 'Invalid or expired GitHub token' };
      }
      if (response.status === 403) {
        return { success: false, error: 'GitHub API rate limit exceeded or access denied' };
      }
      return { success: false, error: `GitHub API error: ${response.status} ${response.statusText}` };
    }

    const diffText = await response.text();
    return { success: true, data: diffText };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while fetching PR raw diff' };
  }
}

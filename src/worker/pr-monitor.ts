/**
 * PR Monitor Module
 *
 * This module is responsible for monitoring GitHub repositories for new or updated
 * Pull Requests. It uses polling to detect PR events and emits them for processing.
 */

import { EventEmitter } from 'events';

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
 * Repository to monitor
 */
export interface MonitoredRepository {
  /** Repository owner (user or organization) */
  owner: string;
  /** Repository name */
  repo: string;
}

/**
 * Configuration for PR Monitor
 */
export interface PRMonitorConfig {
  /** GitHub API token for authentication */
  token: string;
  /** GitHub API base URL (defaults to https://api.github.com) */
  baseUrl?: string;
  /** Polling interval in milliseconds (defaults to 60000 - 1 minute) */
  pollIntervalMs?: number;
  /** List of repositories to monitor */
  repositories: MonitoredRepository[];
}

/**
 * Pull Request state
 */
export type PRState = 'open' | 'closed';

/**
 * Represents a detected Pull Request
 */
export interface DetectedPullRequest {
  /** PR ID (unique identifier from GitHub) */
  id: number;
  /** PR number within the repository */
  number: number;
  /** PR title */
  title: string;
  /** PR body/description */
  body: string | null;
  /** Current state of the PR */
  state: PRState;
  /** Whether the PR is a draft */
  draft: boolean;
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** URL to the PR on GitHub */
  htmlUrl: string;
  /** URL to fetch diff */
  diffUrl: string;
  /** Head branch reference */
  headRef: string;
  /** Base branch reference */
  baseRef: string;
  /** PR author username */
  authorLogin: string;
  /** ISO 8601 timestamp when PR was created */
  createdAt: string;
  /** ISO 8601 timestamp when PR was last updated */
  updatedAt: string;
}

/**
 * Event types emitted by PR Monitor
 */
export type PRMonitorEventType = 'new_pr' | 'updated_pr' | 'error';

/**
 * Event data for new PR event
 */
export interface NewPREvent {
  type: 'new_pr';
  pr: DetectedPullRequest;
}

/**
 * Event data for updated PR event
 */
export interface UpdatedPREvent {
  type: 'updated_pr';
  pr: DetectedPullRequest;
}

/**
 * Event data for error event
 */
export interface MonitorErrorEvent {
  type: 'error';
  error: string;
  repository?: MonitoredRepository;
}

/**
 * Union type for all monitor events
 */
export type PRMonitorEvent = NewPREvent | UpdatedPREvent | MonitorErrorEvent;

/**
 * Success result for fetching PRs
 */
export interface FetchPRsSuccess {
  success: true;
  data: DetectedPullRequest[];
}

/**
 * Error result for fetching PRs
 */
export interface FetchPRsError {
  success: false;
  error: string;
}

/**
 * Result type for fetching PRs
 */
export type FetchPRsResult = FetchPRsSuccess | FetchPRsError;

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
 * Gets monitored repositories from environment variables
 * @returns Array of repositories to monitor
 *
 * @example
 * Environment variable format: "owner1/repo1,owner2/repo2"
 */
function getMonitoredRepositories(): MonitoredRepository[] {
  const reposEnv = process.env.PR_MONITOR_REPOSITORIES;
  if (!reposEnv) {
    return [];
  }

  return reposEnv
    .split(',')
    .map((repo) => repo.trim())
    .filter((repo) => repo.includes('/'))
    .map((repo) => {
      const [owner, repoName] = repo.split('/');
      return { owner, repo: repoName };
    });
}

/**
 * Gets polling interval from environment variables
 * @returns Polling interval in milliseconds
 */
function getPollIntervalMs(): number {
  const intervalEnv = process.env.PR_MONITOR_POLL_INTERVAL_MS;
  if (intervalEnv) {
    const interval = parseInt(intervalEnv, 10);
    if (!isNaN(interval) && interval > 0) {
      return interval;
    }
  }
  return 60000; // Default: 1 minute
}

/**
 * Creates a PR Monitor configuration from environment variables
 * @returns PRMonitorConfig object
 */
export function createConfigFromEnv(): PRMonitorConfig {
  return {
    token: getGitHubToken(),
    baseUrl: getGitHubBaseUrl(),
    pollIntervalMs: getPollIntervalMs(),
    repositories: getMonitoredRepositories(),
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
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates PR Monitor configuration
 * @param config - Configuration to validate
 * @returns Error message if validation fails, null otherwise
 */
function validateConfig(config: PRMonitorConfig): string | null {
  if (!config.token || typeof config.token !== 'string') {
    return 'Invalid token: must be a non-empty string';
  }

  if (config.baseUrl && typeof config.baseUrl !== 'string') {
    return 'Invalid baseUrl: must be a string';
  }

  if (config.pollIntervalMs !== undefined) {
    if (typeof config.pollIntervalMs !== 'number' || config.pollIntervalMs < 1000) {
      return 'Invalid pollIntervalMs: must be a number >= 1000';
    }
  }

  if (!Array.isArray(config.repositories)) {
    return 'Invalid repositories: must be an array';
  }

  for (const repo of config.repositories) {
    if (!repo.owner || typeof repo.owner !== 'string') {
      return 'Invalid repository owner: must be a non-empty string';
    }
    if (!repo.repo || typeof repo.repo !== 'string') {
      return 'Invalid repository name: must be a non-empty string';
    }
  }

  return null;
}

/**
 * Validates a single repository
 * @param repo - Repository to validate
 * @returns Error message if validation fails, null otherwise
 */
function validateRepository(repo: MonitoredRepository): string | null {
  if (!repo.owner || typeof repo.owner !== 'string') {
    return 'Invalid owner parameter: must be a non-empty string';
  }
  if (!repo.repo || typeof repo.repo !== 'string') {
    return 'Invalid repo parameter: must be a non-empty string';
  }
  return null;
}

// ============================================================================
// PR Fetching Functions
// ============================================================================

/**
 * Fetches open pull requests for a repository
 *
 * @param repo - Repository to fetch PRs from
 * @param config - GitHub configuration
 * @returns Promise resolving to FetchPRsResult
 *
 * @example
 * ```typescript
 * const result = await fetchOpenPullRequests(
 *   { owner: 'octocat', repo: 'hello-world' },
 *   { token: 'ghp_xxx', baseUrl: 'https://api.github.com' }
 * );
 *
 * if (result.success) {
 *   console.log(`Found ${result.data.length} open PRs`);
 * }
 * ```
 */
export async function fetchOpenPullRequests(
  repo: MonitoredRepository,
  config: GitHubConfig
): Promise<FetchPRsResult> {
  const validationError = validateRepository(repo);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const url = `${config.baseUrl}/repos/${repo.owner}/${repo.repo}/pulls?state=open&sort=updated&direction=desc`;

    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(config.token),
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
            error: 'Permission denied or rate limit exceeded',
          };
        case 404:
          return {
            success: false,
            error: `Repository not found: ${repo.owner}/${repo.repo}`,
          };
        default:
          return {
            success: false,
            error: `GitHub API error (${response.status}): ${errorText}`,
          };
      }
    }

    const prsData = (await response.json()) as Array<{
      id: number;
      number: number;
      title: string;
      body: string | null;
      state: string;
      draft: boolean;
      html_url: string;
      diff_url: string;
      head: { ref: string };
      base: { ref: string };
      user: { login: string };
      created_at: string;
      updated_at: string;
    }>;

    const pullRequests: DetectedPullRequest[] = prsData.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state as PRState,
      draft: pr.draft,
      owner: repo.owner,
      repo: repo.repo,
      htmlUrl: pr.html_url,
      diffUrl: pr.diff_url,
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
      authorLogin: pr.user.login,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
    }));

    return {
      success: true,
      data: pullRequests,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while fetching PRs' };
  }
}

// ============================================================================
// PR Monitor Class
// ============================================================================

/**
 * PR Monitor - Monitors GitHub repositories for new and updated Pull Requests
 *
 * Uses polling to periodically check for PRs and emits events when new or
 * updated PRs are detected.
 *
 * @example
 * ```typescript
 * const monitor = new PRMonitor({
 *   token: 'ghp_xxx',
 *   repositories: [{ owner: 'octocat', repo: 'hello-world' }],
 *   pollIntervalMs: 30000,
 * });
 *
 * monitor.on('new_pr', (event) => {
 *   console.log(`New PR detected: #${event.pr.number} - ${event.pr.title}`);
 * });
 *
 * monitor.on('updated_pr', (event) => {
 *   console.log(`PR updated: #${event.pr.number}`);
 * });
 *
 * monitor.on('error', (event) => {
 *   console.error(`Error: ${event.error}`);
 * });
 *
 * await monitor.start();
 * ```
 */
export class PRMonitor extends EventEmitter {
  private config: PRMonitorConfig;
  private githubConfig: GitHubConfig;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  /**
   * Tracks last seen PR IDs and their updated timestamps to detect new/updated PRs
   * Key: `${owner}/${repo}/${prNumber}`, Value: updatedAt timestamp
   */
  private seenPRs: Map<string, string> = new Map();

  /**
   * Creates a new PR Monitor instance
   * @param config - Configuration for the monitor
   * @throws Error if configuration is invalid
   */
  constructor(config: PRMonitorConfig) {
    super();

    const validationError = validateConfig(config);
    if (validationError) {
      throw new Error(`Invalid configuration: ${validationError}`);
    }

    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.github.com',
      pollIntervalMs: config.pollIntervalMs || 60000,
    };

    this.githubConfig = {
      token: this.config.token,
      baseUrl: this.config.baseUrl!,
    };
  }

  /**
   * Creates a PR Monitor instance from environment variables
   * @returns PRMonitor instance
   */
  static fromEnv(): PRMonitor {
    return new PRMonitor(createConfigFromEnv());
  }

  /**
   * Starts the PR monitor
   *
   * Performs an initial poll and then starts periodic polling based on
   * the configured interval.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    if (this.config.repositories.length === 0) {
      throw new Error('No repositories configured to monitor');
    }

    this.isRunning = true;

    // Perform initial poll
    await this.poll();

    // Start periodic polling
    this.pollInterval = setInterval(() => {
      this.poll().catch((error) => {
        this.emit('error', {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown polling error',
        } as MonitorErrorEvent);
      });
    }, this.config.pollIntervalMs!);
  }

  /**
   * Stops the PR monitor
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.isRunning = false;
  }

  /**
   * Checks if the monitor is currently running
   * @returns True if running, false otherwise
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Adds a repository to monitor
   * @param repo - Repository to add
   */
  addRepository(repo: MonitoredRepository): void {
    const error = validateRepository(repo);
    if (error) {
      throw new Error(error);
    }

    const exists = this.config.repositories.some(
      (r) => r.owner === repo.owner && r.repo === repo.repo
    );

    if (!exists) {
      this.config.repositories.push(repo);
    }
  }

  /**
   * Removes a repository from monitoring
   * @param repo - Repository to remove
   */
  removeRepository(repo: MonitoredRepository): void {
    this.config.repositories = this.config.repositories.filter(
      (r) => !(r.owner === repo.owner && r.repo === repo.repo)
    );

    // Clean up seen PRs for this repository
    const prefix = `${repo.owner}/${repo.repo}/`;
    for (const key of this.seenPRs.keys()) {
      if (key.startsWith(prefix)) {
        this.seenPRs.delete(key);
      }
    }
  }

  /**
   * Gets the list of currently monitored repositories
   * @returns Array of monitored repositories
   */
  getRepositories(): MonitoredRepository[] {
    return [...this.config.repositories];
  }

  /**
   * Manually triggers a poll cycle
   * Useful for testing or when immediate check is needed
   */
  async poll(): Promise<void> {
    for (const repo of this.config.repositories) {
      await this.pollRepository(repo);
    }
  }

  /**
   * Polls a single repository for PRs
   * @param repo - Repository to poll
   */
  private async pollRepository(repo: MonitoredRepository): Promise<void> {
    const result = await fetchOpenPullRequests(repo, this.githubConfig);

    if (!result.success) {
      this.emit('error', {
        type: 'error',
        error: result.error,
        repository: repo,
      } as MonitorErrorEvent);
      return;
    }

    for (const pr of result.data) {
      const key = `${pr.owner}/${pr.repo}/${pr.number}`;
      const previousUpdatedAt = this.seenPRs.get(key);

      if (!previousUpdatedAt) {
        // New PR detected
        this.seenPRs.set(key, pr.updatedAt);
        this.emit('new_pr', {
          type: 'new_pr',
          pr,
        } as NewPREvent);
      } else if (previousUpdatedAt !== pr.updatedAt) {
        // PR was updated
        this.seenPRs.set(key, pr.updatedAt);
        this.emit('updated_pr', {
          type: 'updated_pr',
          pr,
        } as UpdatedPREvent);
      }
    }

    // Clean up PRs that are no longer open
    const currentPRKeys = new Set(
      result.data.map((pr) => `${pr.owner}/${pr.repo}/${pr.number}`)
    );

    const prefix = `${repo.owner}/${repo.repo}/`;
    for (const key of this.seenPRs.keys()) {
      if (key.startsWith(prefix) && !currentPRKeys.has(key)) {
        this.seenPRs.delete(key);
      }
    }
  }

  /**
   * Clears all seen PRs from memory
   * Useful when you want to treat all PRs as new on next poll
   */
  clearSeenPRs(): void {
    this.seenPRs.clear();
  }

  /**
   * Gets the count of currently tracked PRs
   * @returns Number of PRs being tracked
   */
  getTrackedPRCount(): number {
    return this.seenPRs.size;
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

/**
 * Creates and starts a PR Monitor from environment variables
 *
 * @returns Promise resolving to a running PRMonitor instance
 *
 * @example
 * ```typescript
 * // Set environment variables:
 * // GITHUB_TOKEN=ghp_xxx
 * // PR_MONITOR_REPOSITORIES=owner/repo1,owner/repo2
 * // PR_MONITOR_POLL_INTERVAL_MS=30000
 *
 * const monitor = await startMonitorFromEnv();
 *
 * monitor.on('new_pr', (event) => {
 *   console.log(`New PR: ${event.pr.title}`);
 * });
 * ```
 */
export async function startMonitorFromEnv(): Promise<PRMonitor> {
  const monitor = PRMonitor.fromEnv();
  await monitor.start();
  return monitor;
}

/**
 * Creates a PR Monitor with custom configuration
 *
 * @param config - Configuration for the monitor
 * @returns PRMonitor instance (not started)
 *
 * @example
 * ```typescript
 * const monitor = createMonitor({
 *   token: 'ghp_xxx',
 *   repositories: [
 *     { owner: 'facebook', repo: 'react' },
 *     { owner: 'vercel', repo: 'next.js' },
 *   ],
 *   pollIntervalMs: 30000,
 * });
 *
 * await monitor.start();
 * ```
 */
export function createMonitor(config: PRMonitorConfig): PRMonitor {
  return new PRMonitor(config);
}

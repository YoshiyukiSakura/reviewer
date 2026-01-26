/**
 * Environment Configuration
 *
 * Loads and provides access to GitHub API related environment variables
 */

// ============================================================================
// Types
// ============================================================================

export interface GitHubConfig {
  /** GitHub API token for authentication */
  readonly token: string;
  /** GitHub API base URL (defaults to https://api.github.com) */
  readonly apiUrl: string;
}

export interface MonitorConfig {
  /** Comma-separated list of repositories to monitor (format: owner/repo) */
  readonly repositories: string[];
  /** Polling interval in milliseconds */
  readonly pollIntervalMs: number;
}

export interface EnvConfig {
  /** GitHub configuration */
  readonly github: GitHubConfig;
  /** Monitor configuration */
  readonly monitor: MonitorConfig;
}

// ============================================================================
// Configuration Loading
// ============================================================================

let cachedConfig: EnvConfig | null = null;

/**
 * Load environment configuration
 * @returns Environment configuration object
 * @throws Error if required environment variables are missing
 */
export function loadEnvConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }

  const apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com';

  const reposEnv = process.env.PR_MONITOR_REPOSITORIES || '';
  const repositories = reposEnv
    .split(',')
    .map((repo) => repo.trim())
    .filter((repo) => repo.includes('/'));

  const pollIntervalMs = parseInt(process.env.PR_MONITOR_POLL_INTERVAL_MS || '60000', 10);

  cachedConfig = {
    github: { token, apiUrl },
    monitor: { repositories, pollIntervalMs },
  };

  return cachedConfig;
}

/**
 * Get GitHub configuration
 */
export function getGitHubConfig(): GitHubConfig {
  const config = loadEnvConfig();
  return config.github;
}

/**
 * Get monitor configuration
 */
export function getMonitorConfig(): MonitorConfig {
  const config = loadEnvConfig();
  return config.monitor;
}
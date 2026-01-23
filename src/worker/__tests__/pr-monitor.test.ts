/**
 * Tests for PR Monitor Module
 */

import {
  PRMonitor,
  createMonitor,
  fetchOpenPullRequests,
  createConfigFromEnv,
  type PRMonitorConfig,
  type NewPREvent,
  type UpdatedPREvent,
  type MonitorErrorEvent,
} from '../pr-monitor';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockPRResponse(overrides: Partial<{
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
}> = {}) {
  return {
    id: 1,
    number: 1,
    title: 'Test PR',
    body: 'Test description',
    state: 'open',
    draft: false,
    html_url: 'https://github.com/owner/repo/pull/1',
    diff_url: 'https://github.com/owner/repo/pull/1.diff',
    head: { ref: 'feature-branch' },
    base: { ref: 'main' },
    user: { login: 'testuser' },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createTestConfig(overrides: Partial<PRMonitorConfig> = {}): PRMonitorConfig {
  return {
    token: 'test-token',
    repositories: [{ owner: 'test-owner', repo: 'test-repo' }],
    pollIntervalMs: 60000,
    ...overrides,
  };
}

// ============================================================================
// fetchOpenPullRequests Tests
// ============================================================================

describe('fetchOpenPullRequests', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should fetch open PRs successfully', async () => {
    const mockPR = createMockPRResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPR],
    });

    const result = await fetchOpenPullRequests(
      { owner: 'test-owner', repo: 'test-repo' },
      { token: 'test-token', baseUrl: 'https://api.github.com' }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].number).toBe(1);
      expect(result.data[0].title).toBe('Test PR');
      expect(result.data[0].owner).toBe('test-owner');
      expect(result.data[0].repo).toBe('test-repo');
    }
  });

  it('should handle 401 authentication error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const result = await fetchOpenPullRequests(
      { owner: 'test-owner', repo: 'test-repo' },
      { token: 'bad-token', baseUrl: 'https://api.github.com' }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Authentication failed');
    }
  });

  it('should handle 403 permission error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    const result = await fetchOpenPullRequests(
      { owner: 'test-owner', repo: 'test-repo' },
      { token: 'test-token', baseUrl: 'https://api.github.com' }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Permission denied');
    }
  });

  it('should handle 404 not found error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    });

    const result = await fetchOpenPullRequests(
      { owner: 'nonexistent', repo: 'repo' },
      { token: 'test-token', baseUrl: 'https://api.github.com' }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Repository not found');
    }
  });

  it('should validate owner parameter', async () => {
    const result = await fetchOpenPullRequests(
      { owner: '', repo: 'test-repo' },
      { token: 'test-token', baseUrl: 'https://api.github.com' }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid owner parameter');
    }
  });

  it('should validate repo parameter', async () => {
    const result = await fetchOpenPullRequests(
      { owner: 'test-owner', repo: '' },
      { token: 'test-token', baseUrl: 'https://api.github.com' }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid repo parameter');
    }
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchOpenPullRequests(
      { owner: 'test-owner', repo: 'test-repo' },
      { token: 'test-token', baseUrl: 'https://api.github.com' }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Network error');
    }
  });
});

// ============================================================================
// PRMonitor Constructor Tests
// ============================================================================

describe('PRMonitor constructor', () => {
  it('should create instance with valid config', () => {
    const config = createTestConfig();
    const monitor = new PRMonitor(config);

    expect(monitor).toBeInstanceOf(PRMonitor);
    expect(monitor.isActive()).toBe(false);
  });

  it('should throw error for missing token', () => {
    expect(() => {
      new PRMonitor({
        token: '',
        repositories: [{ owner: 'test', repo: 'test' }],
      });
    }).toThrow('Invalid configuration');
  });

  it('should throw error for invalid pollIntervalMs', () => {
    expect(() => {
      new PRMonitor({
        token: 'test-token',
        repositories: [{ owner: 'test', repo: 'test' }],
        pollIntervalMs: 100, // Too low
      });
    }).toThrow('Invalid configuration');
  });

  it('should use default values for optional config', () => {
    const config = createTestConfig({ baseUrl: undefined, pollIntervalMs: undefined });
    const monitor = new PRMonitor(config);

    expect(monitor).toBeInstanceOf(PRMonitor);
  });
});

// ============================================================================
// PRMonitor Repository Management Tests
// ============================================================================

describe('PRMonitor repository management', () => {
  let monitor: PRMonitor;

  beforeEach(() => {
    monitor = createMonitor(createTestConfig());
  });

  it('should return initial repositories', () => {
    const repos = monitor.getRepositories();
    expect(repos).toHaveLength(1);
    expect(repos[0]).toEqual({ owner: 'test-owner', repo: 'test-repo' });
  });

  it('should add new repository', () => {
    monitor.addRepository({ owner: 'new-owner', repo: 'new-repo' });
    const repos = monitor.getRepositories();
    expect(repos).toHaveLength(2);
  });

  it('should not add duplicate repository', () => {
    monitor.addRepository({ owner: 'test-owner', repo: 'test-repo' });
    const repos = monitor.getRepositories();
    expect(repos).toHaveLength(1);
  });

  it('should remove repository', () => {
    monitor.removeRepository({ owner: 'test-owner', repo: 'test-repo' });
    const repos = monitor.getRepositories();
    expect(repos).toHaveLength(0);
  });

  it('should throw error when adding invalid repository', () => {
    expect(() => {
      monitor.addRepository({ owner: '', repo: 'test' });
    }).toThrow('Invalid owner parameter');
  });
});

// ============================================================================
// PRMonitor Event Emission Tests
// ============================================================================

describe('PRMonitor event emission', () => {
  let monitor: PRMonitor;

  beforeEach(() => {
    mockFetch.mockReset();
    monitor = createMonitor(createTestConfig());
  });

  afterEach(() => {
    monitor.stop();
  });

  it('should emit new_pr event for new PRs', async () => {
    const mockPR = createMockPRResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPR],
    });

    const events: NewPREvent[] = [];
    monitor.on('new_pr', (event: NewPREvent) => events.push(event));

    await monitor.poll();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('new_pr');
    expect(events[0].pr.number).toBe(1);
  });

  it('should emit updated_pr event when PR is updated', async () => {
    const mockPR1 = createMockPRResponse({ updated_at: '2024-01-01T00:00:00Z' });
    const mockPR2 = createMockPRResponse({ updated_at: '2024-01-02T00:00:00Z' });

    // First poll - PR is new
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPR1],
    });

    const newEvents: NewPREvent[] = [];
    const updateEvents: UpdatedPREvent[] = [];

    monitor.on('new_pr', (event: NewPREvent) => newEvents.push(event));
    monitor.on('updated_pr', (event: UpdatedPREvent) => updateEvents.push(event));

    await monitor.poll();

    expect(newEvents).toHaveLength(1);
    expect(updateEvents).toHaveLength(0);

    // Second poll - PR is updated
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockPR2],
    });

    await monitor.poll();

    expect(newEvents).toHaveLength(1); // No new PRs
    expect(updateEvents).toHaveLength(1);
    expect(updateEvents[0].type).toBe('updated_pr');
  });

  it('should not emit event for unchanged PR', async () => {
    const mockPR = createMockPRResponse();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [mockPR],
    });

    const events: (NewPREvent | UpdatedPREvent)[] = [];
    monitor.on('new_pr', (event: NewPREvent) => events.push(event));
    monitor.on('updated_pr', (event: UpdatedPREvent) => events.push(event));

    await monitor.poll();
    await monitor.poll();

    expect(events).toHaveLength(1); // Only initial new_pr event
  });

  it('should emit error event on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server Error',
    });

    const errorEvents: MonitorErrorEvent[] = [];
    monitor.on('error', (event: MonitorErrorEvent) => errorEvents.push(event));

    await monitor.poll();

    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0].type).toBe('error');
    expect(errorEvents[0].repository).toEqual({ owner: 'test-owner', repo: 'test-repo' });
  });
});

// ============================================================================
// PRMonitor Lifecycle Tests
// ============================================================================

describe('PRMonitor lifecycle', () => {
  let monitor: PRMonitor;

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    if (monitor) {
      monitor.stop();
    }
  });

  it('should start and stop correctly', async () => {
    monitor = createMonitor(createTestConfig());

    expect(monitor.isActive()).toBe(false);

    await monitor.start();
    expect(monitor.isActive()).toBe(true);

    monitor.stop();
    expect(monitor.isActive()).toBe(false);
  });

  it('should throw error when starting with no repositories', async () => {
    monitor = createMonitor(createTestConfig({ repositories: [] }));

    await expect(monitor.start()).rejects.toThrow('No repositories configured');
  });

  it('should not start twice', async () => {
    monitor = createMonitor(createTestConfig());

    await monitor.start();
    await monitor.start(); // Should not throw

    expect(monitor.isActive()).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only one initial poll
  });

  it('should clear seen PRs', async () => {
    monitor = createMonitor(createTestConfig());

    const mockPR = createMockPRResponse();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [mockPR],
    });

    const events: NewPREvent[] = [];
    monitor.on('new_pr', (event: NewPREvent) => events.push(event));

    await monitor.poll();
    expect(events).toHaveLength(1);

    monitor.clearSeenPRs();
    expect(monitor.getTrackedPRCount()).toBe(0);

    await monitor.poll();
    expect(events).toHaveLength(2); // PR is seen as new again
  });
});

// ============================================================================
// Configuration from Environment Tests
// ============================================================================

describe('createConfigFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error when GITHUB_TOKEN is not set', () => {
    delete process.env.GITHUB_TOKEN;

    expect(() => createConfigFromEnv()).toThrow('GITHUB_TOKEN environment variable is not set');
  });

  it('should create config with default values', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    delete process.env.GITHUB_API_URL;
    delete process.env.PR_MONITOR_REPOSITORIES;
    delete process.env.PR_MONITOR_POLL_INTERVAL_MS;

    const config = createConfigFromEnv();

    expect(config.token).toBe('test-token');
    expect(config.baseUrl).toBe('https://api.github.com');
    expect(config.pollIntervalMs).toBe(60000);
    expect(config.repositories).toEqual([]);
  });

  it('should parse repositories from environment', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.PR_MONITOR_REPOSITORIES = 'owner1/repo1,owner2/repo2';

    const config = createConfigFromEnv();

    expect(config.repositories).toEqual([
      { owner: 'owner1', repo: 'repo1' },
      { owner: 'owner2', repo: 'repo2' },
    ]);
  });

  it('should parse poll interval from environment', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.PR_MONITOR_POLL_INTERVAL_MS = '30000';

    const config = createConfigFromEnv();

    expect(config.pollIntervalMs).toBe(30000);
  });

  it('should use custom base URL from environment', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_API_URL = 'https://github.example.com/api/v3';

    const config = createConfigFromEnv();

    expect(config.baseUrl).toBe('https://github.example.com/api/v3');
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createMonitor', () => {
  it('should create PRMonitor instance', () => {
    const monitor = createMonitor(createTestConfig());

    expect(monitor).toBeInstanceOf(PRMonitor);
    expect(monitor.isActive()).toBe(false);
  });
});

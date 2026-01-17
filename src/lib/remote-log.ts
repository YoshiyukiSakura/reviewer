/**
 * Remote logging module for sending logs to external services
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface RemoteLogConfig {
  endpoint: string;
  apiKey?: string;
  batchSize?: number;
  flushInterval?: number;
}

const defaultConfig: Partial<RemoteLogConfig> = {
  batchSize: 10,
  flushInterval: 5000,
};

let config: RemoteLogConfig | null = null;
let logBuffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize the remote logger with configuration
 */
export function initRemoteLog(userConfig: RemoteLogConfig): void {
  config = { ...defaultConfig, ...userConfig };
  startFlushTimer();
}

/**
 * Send a single log entry to the remote service
 */
export async function sendLog(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): Promise<void> {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  logBuffer.push(entry);

  if (config && logBuffer.length >= (config.batchSize ?? 10)) {
    await flush();
  }
}

/**
 * Convenience methods for different log levels
 */
export const log = {
  debug: (message: string, context?: Record<string, unknown>) =>
    sendLog('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    sendLog('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    sendLog('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    sendLog('error', message, context),
};

/**
 * Flush all buffered logs to the remote service
 */
export async function flush(): Promise<void> {
  if (!config || logBuffer.length === 0) {
    return;
  }

  const logsToSend = [...logBuffer];
  logBuffer = [];

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ logs: logsToSend }),
    });

    if (!response.ok) {
      console.error(`Failed to send logs: ${response.status} ${response.statusText}`);
      logBuffer.unshift(...logsToSend);
    }
  } catch (error) {
    console.error('Failed to send logs:', error);
    logBuffer.unshift(...logsToSend);
  }
}

/**
 * Start the automatic flush timer
 */
function startFlushTimer(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
  }

  if (config?.flushInterval) {
    flushTimer = setInterval(() => {
      flush().catch(console.error);
    }, config.flushInterval);
  }
}

/**
 * Stop the remote logger and flush remaining logs
 */
export async function shutdown(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  await flush();
  config = null;
}

/**
 * Get the current buffer size (for testing/monitoring)
 */
export function getBufferSize(): number {
  return logBuffer.length;
}

/**
 * Clear the buffer without sending (for testing)
 */
export function clearBuffer(): void {
  logBuffer = [];
}

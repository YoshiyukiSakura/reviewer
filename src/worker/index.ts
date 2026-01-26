/**
 * Worker Module
 *
 * Entry point for the worker process that:
 * 1. Starts the PR Monitor to detect new/updated Pull Requests
 * 2. Listens for PR events and processes them with the Review Processor
 * 3. Handles graceful shutdown on SIGINT/SIGTERM signals
 */

import { EventEmitter } from 'events';
import { PRMonitor } from './pr-monitor';
import { ReviewProcessor, createReviewProcessor } from './review-processor';
import type { NewPREvent, UpdatedPREvent, MonitorErrorEvent } from './pr-monitor';
import type { ProcessPRParams } from './review-processor';
import { log } from '../lib/remote-log';

// ============================================================================
// Types
// ============================================================================

/**
 * Worker configuration options
 */
export interface WorkerConfig {
  /** PR Monitor instance */
  monitor: PRMonitor;
  /** Review Processor instance */
  processor: ReviewProcessor;
  /** Custom logger function */
  logger?: (message: string) => void;
}

// ============================================================================
// Worker Implementation
// ============================================================================

/**
 * Worker that coordinates PR monitoring and review processing
 */
export class Worker {
  private monitor: PRMonitor;
  private processor: ReviewProcessor;
  private logger: (message: string) => void;
  private isShuttingDown = false;
  private shutdownResolve?: () => void;

  constructor(config: WorkerConfig) {
    this.monitor = config.monitor;
    this.processor = config.processor;
    this.logger = config.logger ?? ((message: string) => console.log(`[Worker] ${message}`));
  }

  /**
   * Start the worker
   *
   * Initializes event listeners and starts the PR monitor
   */
  async start(): Promise<void> {
    this.logMessage('Starting worker...');

    // Set up event listeners
    this.setupEventListeners();

    // Start the PR monitor
    await this.monitor.start();

    this.logMessage('Worker started successfully');

    // Set up signal handlers for graceful shutdown
    this.setupSignalHandlers();

    // Wait for shutdown signal
    await this.waitForShutdown();
  }

  /**
   * Set up event listeners for PR events
   */
  private setupEventListeners(): void {
    // Cast to EventEmitter to access event methods
    const emitter = this.monitor as unknown as EventEmitter;

    // Handle new PR events
    emitter.on('new_pr', async (event: NewPREvent) => {
      await this.handleNewPR(event);
    });

    // Handle updated PR events
    emitter.on('updated_pr', async (event: UpdatedPREvent) => {
      await this.handleUpdatedPR(event);
    });

    // Handle errors
    emitter.on('error', (event: MonitorErrorEvent) => {
      this.logMessage(`Monitor error: ${event.error}${event.repository ? ` (${event.repository.owner}/${event.repository.repo})` : ''}`);
    });
  }

  /**
   * Handle new PR event
   */
  private async handleNewPR(event: NewPREvent): Promise<void> {
    if (this.isShuttingDown) {
      this.logMessage(`Skipping new PR #${event.pr.number} - worker is shutting down`);
      return;
    }

    this.logMessage(`Processing new PR #${event.pr.number}: ${event.pr.title}`);

    const params = this.createProcessParams(event.pr);
    const result = await this.processor.processPR(params);

    if (result.success) {
      this.logMessage(`Successfully processed new PR #${event.pr.number} - review ID: ${result.reviewId}`);
    } else {
      this.logMessage(`Failed to process new PR #${event.pr.number}: ${result.error}`);
    }
  }

  /**
   * Handle updated PR event
   */
  private async handleUpdatedPR(event: UpdatedPREvent): Promise<void> {
    if (this.isShuttingDown) {
      this.logMessage(`Skipping updated PR #${event.pr.number} - worker is shutting down`);
      return;
    }

    this.logMessage(`Processing updated PR #${event.pr.number}: ${event.pr.title}`);

    const params = this.createProcessParams(event.pr);
    const result = await this.processor.processPR(params);

    if (result.success) {
      this.logMessage(`Successfully processed updated PR #${event.pr.number} - review ID: ${result.reviewId}`);
    } else {
      this.logMessage(`Failed to process updated PR #${event.pr.number}: ${result.error}`);
    }
  }

  /**
   * Create ProcessPRParams from DetectedPullRequest
   */
  private createProcessParams(pr: NewPREvent['pr']): ProcessPRParams {
    return {
      owner: pr.owner,
      repo: pr.repo,
      pullNumber: pr.number,
      prTitle: pr.title,
      prDescription: pr.body ?? undefined,
      authorName: pr.authorLogin,
    };
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const shutdown = async (signal: string) => {
      this.logMessage(`Received ${signal}, initiating graceful shutdown...`);
      await this.shutdown();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * Wait for shutdown to complete
   */
  private waitForShutdown(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.shutdownResolve = resolve;
    });
  }

  /**
   * Perform graceful shutdown
   */
  private async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logMessage('Shutting down...');

    try {
      // Stop the PR monitor first to prevent new events
      this.monitor.stop();
      this.logMessage('PR monitor stopped');

      // Log status before exiting
      const trackedPRs = this.monitor.getTrackedPRCount();
      this.logMessage(`Shutdown complete. Tracked ${trackedPRs} PR(s).`);
    } catch (error) {
      this.logMessage(`Error during shutdown: ${error}`);
    } finally {
      // Resolve the shutdown promise to exit
      if (this.shutdownResolve) {
        this.shutdownResolve();
      }
    }
  }

  /**
   * Log a message
   */
  private logMessage(message: string): void {
    this.logger(message);
    log.info(message);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a worker from environment configuration
 */
export function createWorker(): Worker {
  const monitor = PRMonitor.fromEnv();
  const processor = createReviewProcessor();

  return new Worker({
    monitor,
    processor,
  });
}

/**
 * Create a worker with custom configuration
 */
export function createWorkerWithConfig(config: {
  monitor: PRMonitor;
  processor?: ReviewProcessor;
}): Worker {
  return new Worker({
    monitor: config.monitor,
    processor: config.processor ?? createReviewProcessor(),
  });
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Start the worker when running this file directly
 */
function main(): void {
  const worker = createWorker();

  worker.start().catch((error) => {
    console.error('Worker failed:', error);
    process.exit(1);
  });
}

main();
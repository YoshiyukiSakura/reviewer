/**
 * Background Worker Main Module
 *
 * This module coordinates:
 * 1. PR Monitor - watches for new/updated pull requests
 * 2. Review Processor - performs AI code review and saves to database
 */

import { PRMonitor } from './pr-monitor';
import { ReviewProcessor } from './review-processor';
import { log } from '../lib/remote-log';

async function startWorker() {
  try {
    console.log('[Worker] Initializing PR Monitor...');

    // Create PR Monitor from environment variables
    const monitor = PRMonitor.fromEnv();
    const processor = new ReviewProcessor();

    // Get configuration summary
    const repos = monitor.getRepositories();
    console.log(`[Worker] Monitoring ${repos.length} repositories:`);
    repos.forEach((repo) => {
      console.log(`[Worker]   - ${repo.owner}/${repo.repo}`);
    });

    // Set up event handlers
    monitor.on('new_pr', async (event) => {
      const { pr } = event;
      console.log(`[Worker] New PR detected: ${pr.owner}/${pr.repo}#${pr.number} - ${pr.title}`);

      await log.info('New PR detected', {
        owner: pr.owner,
        repo: pr.repo,
        pullNumber: pr.number,
        title: pr.title,
        author: pr.authorLogin,
      });

      // Process the PR review
      try {
        console.log(`[Worker] Starting review for PR #${pr.number}...`);

        const result = await processor.processPR(
          {
            owner: pr.owner,
            repo: pr.repo,
            pullNumber: pr.number,
            prTitle: pr.title,
            prDescription: pr.body || undefined,
            authorId: pr.authorLogin,
            authorName: pr.authorLogin,
          },
          (status) => {
            console.log(`[Worker]   [${status.phase}] ${status.message}`);
          }
        );

        if (result.success) {
          console.log(`[Worker] Review completed for PR #${pr.number}`);
          console.log(`[Worker]   Review ID: ${result.reviewId}`);
          console.log(`[Worker]   Score: ${result.aiResult?.score}/10`);
          console.log(`[Worker]   Comments: ${result.aiResult?.comments.length || 0}`);
          console.log(`[Worker]   Approval: ${result.aiResult?.approval}`);
          console.log(`[Worker]   Duration: ${result.durationMs}ms`);
        } else {
          console.error(`[Worker] Review failed for PR #${pr.number}: ${result.error}`);
          await log.error('Review failed', {
            owner: pr.owner,
            repo: pr.repo,
            pullNumber: pr.number,
            error: result.error,
            errorCode: result.errorCode,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Worker] Error processing PR #${pr.number}:`, error);
        await log.error('Error processing PR', {
          owner: pr.owner,
          repo: pr.repo,
          pullNumber: pr.number,
          error: errorMessage,
        });
      }
    });

    monitor.on('updated_pr', async (event) => {
      const { pr } = event;
      console.log(`[Worker] PR updated: ${pr.owner}/${pr.repo}#${pr.number} - ${pr.title}`);

      await log.info('PR updated', {
        owner: pr.owner,
        repo: pr.repo,
        pullNumber: pr.number,
        title: pr.title,
      });

      // Process the updated PR
      try {
        console.log(`[Worker] Re-reviewing updated PR #${pr.number}...`);

        const result = await processor.processPR(
          {
            owner: pr.owner,
            repo: pr.repo,
            pullNumber: pr.number,
            prTitle: pr.title,
            prDescription: pr.body || undefined,
            authorId: pr.authorLogin,
            authorName: pr.authorLogin,
          },
          (status) => {
            console.log(`[Worker]   [${status.phase}] ${status.message}`);
          }
        );

        if (result.success) {
          console.log(`[Worker] Re-review completed for PR #${pr.number}`);
        } else {
          console.error(`[Worker] Re-review failed for PR #${pr.number}: ${result.error}`);
        }
      } catch (error) {
        console.error(`[Worker] Error re-processing PR #${pr.number}:`, error);
      }
    });

    monitor.on('error', async (event) => {
      console.error('[Worker] Monitor error:', event.error);
      if (event.repository) {
        console.error(`[Worker]   Repository: ${event.repository.owner}/${event.repository.repo}`);
      }

      await log.error('Monitor error', {
        error: event.error,
        repository: event.repository,
      });
    });

    // Start monitoring
    console.log('[Worker] Starting PR monitor...');
    await monitor.start();
    console.log('[Worker] Worker is now running and monitoring for PRs');

    // Keep the process alive
    process.on('SIGTERM', () => {
      console.log('[Worker] SIGTERM received, shutting down gracefully...');
      monitor.stop();
      setTimeout(() => process.exit(0), 1000);
    });

    process.on('SIGINT', () => {
      console.log('[Worker] SIGINT received, shutting down gracefully...');
      monitor.stop();
      setTimeout(() => process.exit(0), 1000);
    });
  } catch (error) {
    console.error('[Worker] Failed to start worker:', error);
    process.exit(1);
  }
}

// Start the worker
startWorker().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});

/**
 * GitHub Library
 *
 * This module provides utilities for interacting with GitHub APIs,
 * including URL parsing, PR actions, reviews, and diff operations.
 */

// URL Parser
export { parseGitHubPRUrl, type ParsedPRUrl } from './url-parser';

// PR Actions
export type {
  GitHubConfig,
  PRParams,
  PRState,
  ClosePRSuccess,
  PRActionError,
  ClosePRResult,
  MergePRSuccess,
  MergePRResult,
  MergePROptions,
} from './pr-actions';
export { closePullRequest, reopenPullRequest, mergePullRequest } from './pr-actions';

// PR Reviews
export type {
  GitHubConfig as ReviewGitHubConfig,
  PRParams as ReviewPRParams,
  ReviewEvent,
  ReviewState,
  ReviewComment,
  PullRequestReview,
  ListPRReviewsSuccess,
  PRReviewError,
  ListPRReviewsResult,
  GetPRReviewSuccess,
  GetPRReviewResult,
  CreateReviewOptions,
  CreatePRReviewSuccess,
  CreatePRReviewResult,
  SubmitReviewOptions,
  SubmitPRReviewSuccess,
  SubmitPRReviewResult,
  DeletePRReviewSuccess,
  DeletePRReviewResult,
} from './pr-reviews';
export {
  listPRReviews,
  getPRReview,
  createPRReview,
  submitPRReview,
  deletePRReview,
} from './pr-reviews';

// PR Diff
export type {
  GitHubConfig as DiffGitHubConfig,
  PullRequestFile,
  PullRequestDiff,
  GetPRDiffSuccess,
  GetPRDiffError,
  GetPRDiffResult,
  GetPRDiffParams,
} from './pr-diff';
export { getPRDiff, getPRRawDiff } from './pr-diff';
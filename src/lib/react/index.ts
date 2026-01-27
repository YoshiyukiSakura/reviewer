export { AuthProvider, useAuth, AuthContext } from './auth-context'
export type { AuthContextValue } from './auth-context'
export { AuthGuard } from './auth-guard'
export type { AuthGuardProps } from './auth-guard'

// Data fetching hooks
export { useDataFetch, usePaginatedDataFetch } from './use-data-fetch'
export type { UseDataFetchResult, UsePaginatedDataFetchResult } from './use-data-fetch'

// Review hooks
export {
  useReviews,
  useReview,
  useReviewActions,
  useReviewStatus,
} from './use-reviews'
export type { UseReviewsResult, UseReviewResult, UseReviewActionsResult, UseReviewStatusResult } from './use-reviews'

// Comment hooks
export {
  useComments,
  useReviewComments,
  useComment,
  useCommentActions,
  useUnresolvedComments,
} from './use-comments'
export type { UseCommentsResult, UseReviewCommentsResult, UseCommentResult, UseCommentActionsResult, UseUnresolvedCommentsResult } from './use-comments'

// Stats hooks
export {
  useDashboardStats,
  useReviewStats,
  useCommentStats,
  useActivityStats,
  useUserStats,
  useStatsActions,
} from './use-stats'
export type { UseDashboardStatsResult, UseReviewStatsResult, UseCommentStatsResult, UseActivityStatsResult, UseUserStatsResult, UseStatsActionsResult, ActivityDataPoint, ActivityStatsOptions } from './use-stats'

// Settings hooks
export {
  useProfileSettings,
  useNotificationSettings,
  usePasswordChange,
} from './use-settings'
export type { UseProfileSettingsResult, UseNotificationSettingsResult, UsePasswordChangeResult } from './use-settings'

// Test report hooks
export {
  useTestReports,
  useTestReport,
  useTestReportActions,
} from './use-test-reports'
export type { UseTestReportsResult, UseTestReportResult, UseTestReportActionsResult } from './use-test-reports'
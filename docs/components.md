# Component Documentation

This document describes the reusable UI components available in the application.

## Installation

All components are exported from `@/lib/ui` and can be imported directly:

```tsx
import { Button, Card, Badge } from '@/lib/ui'
```

---

## Button

A versatile button component with multiple variants, sizes, and states.

### Import

```tsx
import { Button } from '@/lib/ui'
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link' | 'default' | Visual style |
| size | 'sm' \| 'default' \| 'lg' \| 'icon' | 'default' | Button size |
| isLoading | boolean | false | Shows loading spinner |
| leftIcon | ReactNode | - | Icon before text |
| rightIcon | ReactNode | - | Icon after text |
| disabled | boolean | - | Disabled state |
| onClick | () => void | - | Click handler |

### Usage Examples

```tsx
// Default button
<Button onClick={handleClick}>Click me</Button>

// Destructive action
<Button variant="destructive" onClick={handleDelete}>
  Delete Item
</Button>

// Outline button
<Button variant="outline">Cancel</Button>

// Secondary action
<Button variant="secondary">Save Draft</Button>

// Ghost button (subtle)
<Button variant="ghost">Learn More</Button>

// Link-style button
<Button variant="link">View All</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// Loading state
<Button isLoading>Saving...</Button>

// With icons
<Button leftIcon={<PlusIcon />}>Add Item</Button>
<Button rightIcon={<ArrowIcon />}>Next</Button>

// Icon-only button
<Button size="icon" onClick={handleClose}>
  <CloseIcon />
</Button>
```

---

## Card

A container component with optional header, title, description, content, and footer sections.

### Import

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/lib/ui'
```

### Props (Card)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| hoverable | boolean | false | Adds hover shadow effect |
| children | ReactNode | - | Card content |

### Usage Examples

```tsx
// Basic card
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Hoverable card
<Card hoverable onClick={() => navigate('/details')}>
  <CardContent>Click to view details</CardContent>
</Card>

// Card with footer alignment options
<Card>
  <CardContent>Content</CardContent>
  <CardFooter align="start">
    <Button variant="outline">Left</Button>
  </CardFooter>
</Card>

<Card>
  <CardContent>Content</CardContent>
  <CardFooter align="center">
    <Button>Center</Button>
  </CardFooter>
</Card>

<Card>
  <CardContent>Content</CardContent>
  <CardFooter align="between">
    <Button variant="outline">Back</Button>
    <Button>Next</Button>
  </CardFooter>
</Card>
```

---

## Badge

A small label component for statuses, tags, or categories.

### Import

```tsx
import { Badge } from '@/lib/ui'
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'default' \| 'secondary' \| 'destructive' \| 'outline' \| 'success' \| 'warning' | 'default' | Color scheme |
| size | 'sm' \| 'default' \| 'lg' | 'default' | Badge size |
| children | ReactNode | - | Badge content |

### Usage Examples

```tsx
// Default badge
<Badge>New</Badge>

// Status badges
<Badge variant="secondary">Draft</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Error</Badge>

// Outline variant
<Badge variant="outline">Outlined</Badge>

// Different sizes
<Badge size="sm">Small</Badge>
<Badge size="lg">Large</Badge>

// Custom styling
<Badge className="bg-purple-100 text-purple-800">Custom</Badge>

// Use with review status
<Badge variant={status === 'APPROVED' ? 'success' : 'warning'}>
  {status.replace('_', ' ')}
</Badge>
```

---

## Modal

A dialog overlay component with portal rendering and accessibility features.

### Import

```tsx
import { Modal } from '@/lib/ui'
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | boolean | - | Controls visibility |
| onClose | () => void | - | Close handler |
| title | string | - | Modal title |
| children | ReactNode | - | Modal content |
| footer | ReactNode | - | Footer actions |
| size | 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full' | 'md' | Modal width |
| showCloseButton | boolean | true | Show X button |
| closeOnBackdropClick | boolean | true | Close on backdrop click |
| closeOnEscape | boolean | true | Close on Escape key |
| closeIcon | ReactElement | - | Custom close icon |

### Usage Examples

```tsx
// Basic modal
const [isOpen, setIsOpen] = useState(false)

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure you want to proceed?</p>
  <Modal.Footer>
    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button onClick={handleConfirm}>Confirm</Button>
  </Modal.Footer>
</Modal>

// Different sizes
<Modal isOpen={isOpen} onClose={onClose} size="sm">Small</Modal>
<Modal isOpen={isOpen} onClose={onClose} size="lg">Large</Modal>
<Modal isOpen={isOpen} onClose={onClose} size="full">Full Screen</Modal>

// Custom footer
<Modal
  isOpen={isOpen}
  onClose={onClose}
  footer={
    <>
      <Button variant="secondary">Save Draft</Button>
      <Button>Publish</Button>
    </>
  }
>
  Content
</Modal>

// Without close on backdrop
<Modal
  isOpen={isOpen}
  onClose={onClose}
  closeOnBackdropClick={false}
>
  Important dialog that shouldn't close on backdrop click
</Modal>
```

---

## Input

A text input component with standard styling.

### Import

```tsx
import { Input } from '@/lib/ui'
```

### Props

Inherits all standard HTML input attributes plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | string | - | Input label |
| error | string | - | Error message |
| helperText | string | - | Helper text below input |

### Usage Examples

```tsx
// Basic input
<Input
  placeholder="Enter text..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// With label
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
/>

// With error
<Input
  label="Password"
  type="password"
  error="Password is required"
/>

// With helper text
<Input
  label="Username"
  helperText="Must be at least 8 characters"
/>

// Disabled
<Input disabled placeholder="Disabled input" />
```

---

## Table

A data table component for displaying structured data.

### Import

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/lib/ui'
```

### Usage Examples

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Date</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell><Badge>Active</Badge></TableCell>
      <TableCell>2024-01-15</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Jane Smith</TableCell>
      <TableCell><Badge variant="warning">Pending</Badge></TableCell>
      <TableCell>2024-01-16</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## RatingStars

A star rating component for displaying and collecting ratings.

### Import

```tsx
import { RatingStars } from '@/lib/ui'
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| rating | number | - | Current rating (0-5) |
| maxStars | number | 5 | Maximum stars |
| interactive | boolean | false | Allow user interaction |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Star size |
| showValue | boolean | false | Show numerical value |
| onRatingChange | (rating: number) => void | - | Callback when rating changes |
| ariaLabel | string | 'Rating' | Accessibility label |

### Usage Examples

```tsx
// Display-only rating
<RatingStars rating={4} />

// Interactive rating
<RatingStars
  rating={0}
  interactive
  onRatingChange={(r) => console.log(r)}
/>

// Different sizes
<RatingStars rating={3.5} size="sm" />
<RatingStars rating={4} size="lg" />

// With value display
<RatingStars rating={4.5} showValue />

// Half-star support
<RatingStars rating={3.5} />
```

---

## ReviewCard

A specialized card component for displaying review information.

### Import

```tsx
import { ReviewCard } from '@/lib/ui'
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| review | Review | - | Review data object |
| onClick | () => void | - | Click handler |
| clickable | boolean | false | Makes card interactive |
| showAuthor | boolean | true | Show author info |
| showDescription | boolean | true | Show description |
| showSource | boolean | true | Show source type |

### Usage Examples

```tsx
// Basic usage
<ReviewCard review={reviewData} />

// Clickable card
<ReviewCard
  review={reviewData}
  clickable
  onClick={() => navigate(`/reviews/${reviewData.id}`)}
/>

// With custom actions
<ReviewCard
  review={reviewData}
  footerActions={
    <Button size="sm">View Details</Button>
  }
/>

// Minimal display
<ReviewCard
  review={reviewData}
  showAuthor={false}
  showDescription={false}
  showSource={false}
/>
```

### Review Type

```tsx
interface Review {
  id: string
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'CLOSED'
  sourceType?: string
  sourceId?: string
  sourceUrl?: string
  authorId: string
  authorName?: string
  createdAt: Date
  updatedAt: Date
  comments?: ReviewComment[]
}
```

---

## CommentList

A list component for displaying comments with optional threading.

### Import

```tsx
import { CommentList } from '@/lib/ui'
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| comments | ReviewComment[] | - | Array of comments |
| nested | boolean | true | Enable comment nesting |
| maxDepth | number | 3 | Maximum nesting depth |
| showFilePath | boolean | true | Show file paths |
| showLineNumbers | boolean | true | Show line numbers |
| showResolveButton | boolean | false | Show resolve button |
| onResolve | (id: string, resolved: boolean) => void | - | Resolve callback |
| onClick | (comment: ReviewComment) => void | - | Click handler |
| emptyState | ReactNode | - | Custom empty state |

### Usage Examples

```tsx
// Basic usage
<CommentList comments={comments} />

// With resolve functionality
<CommentList
  comments={comments}
  showResolveButton
  onResolve={(id, resolved) => updateComment(id, { isResolved: resolved })}
/>

// Without nesting
<CommentList comments={comments} nested={false} />

// With click handler
<CommentList
  comments={comments}
  onClick={(comment) => navigate(`/comments/${comment.id}`)}
/>

// Custom empty state
<CommentList
  comments={[]}
  emptyState={<p>No comments yet. Be the first!</p>}
/>
```

### ReviewComment Type

```tsx
interface ReviewComment {
  id: string
  content: string
  filePath?: string
  lineStart?: number
  lineEnd?: number
  isResolved: boolean
  severity?: 'INFO' | 'SUGGESTION' | 'WARNING' | 'ERROR' | 'CRITICAL'
  authorId: string
  authorName?: string
  parentId?: string
  replies?: ReviewComment[]
  reviewId: string
  createdAt: Date
  updatedAt: Date
}
```

---

## StatsChart

A statistics visualization component with multiple chart types.

### Import

```tsx
import { StatsChart } from '@/lib/ui'
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| stats | DashboardStats | - | Statistics data |
| chartType | 'overview' \| 'reviews' \| 'comments' \| 'activity' | 'overview' | Chart type |
| title | string | 'Statistics' | Card title |
| description | string | - | Card description |
| useCard | boolean | true | Wrap in Card |
| chartHeight | number | 200 | Chart height in pixels |

### Usage Examples

```tsx
// Overview with both charts
<StatsChart stats={statsData} />

// Activity bar chart
<StatsChart
  stats={statsData}
  chartType="activity"
  chartHeight={250}
/>

// Reviews breakdown
<StatsChart stats={statsData} chartType="reviews" />

// Comments severity breakdown
<StatsChart stats={statsData} chartType="comments" />

// Without card wrapper
<StatsChart stats={statsData} useCard={false} />
```

### DashboardStats Type

```tsx
interface DashboardStats {
  reviews: {
    total: number
    pending: number
    inProgress: number
    approved: number
    changesRequested: number
    closed: number
  }
  comments: {
    total: number
    unresolved: number
    bySeverity: {
      info: number
      suggestion: number
      warning: number
      critical: number
    }
  }
  activityOverTime: Array<{
    date: string
    reviews: number
    comments: number
  }>
}
```

---

## Authentication Components

### AuthProvider

A context provider for managing authentication state throughout the application.

### Import

```tsx
import { AuthProvider, useAuth } from '@/lib/react/auth-context'
```

### Usage

Wrap your application with the AuthProvider:

```tsx
// In your layout or app component
<AuthProvider>
  <App />
</AuthProvider>
```

### useAuth Hook

Access authentication state and methods:

```tsx
const { user, isAuthenticated, isLoading, login, logout, refreshUser } = useAuth()

// Check if user is logged in
if (isAuthenticated) {
  console.log(`Welcome, ${user?.name}`)
}

// Login
await login({ email: 'user@example.com', password: 'password123' })

// Logout
logout()

// Refresh user data
await refreshUser()
```

### AuthContextValue

```tsx
interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}
```

### AuthGuard

A component that protects routes from unauthenticated users.

```tsx
import { AuthGuard } from '@/lib/react/auth-guard'

// Protect a route
<AuthGuard>
  <Dashboard />
</AuthGuard>

// With fallback
<AuthGuard fallback={<LoadingScreen />}>
  <ProtectedPage />
</AuthGuard>
```

---

## React Hooks

### useReviews

Fetch and manage reviews list.

```tsx
import { useReviews } from '@/lib/react/use-reviews'

const { reviews, isLoading, error, pagination, fetchReviews } = useReviews({
  initialPage: 1,
  pageSize: 20,
  status: 'PENDING'
})

// Fetch with filters
await fetchReviews({
  search: 'auth',
  status: 'IN_PROGRESS'
})
```

### useReview

Fetch and manage single review.

```tsx
import { useReview } from '@/lib/react/use-review'

const { review, isLoading, error, updateReview, deleteReview } = useReview('review_id')

// Update review
await updateReview({ status: 'APPROVED' })

// Delete review
await deleteReview()
```

### useComments

Fetch and manage comments.

```tsx
import { useComments } from '@/lib/react/use-comments'

const { comments, createComment, updateComment, deleteComment } = useComments()

// Create comment
await createComment({
  content: 'Great work!',
  reviewId: 'review_123',
  severity: 'SUGGESTION'
})

// Update comment
await updateComment('comment_456', { isResolved: true })

// Delete comment
await deleteComment('comment_456')
```

### useDashboardStats

Fetch dashboard statistics.

```tsx
import { useDashboardStats } from '@/lib/react/use-dashboard-stats'

const { stats, isLoading, error, refetch } = useDashboardStats()

// Refetch with date range
await refetch({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
})
```

---

## Type References

### Core Types

```tsx
// User
interface User {
  id: string
  email?: string
  name?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

// Login credentials
interface LoginCredentials {
  email: string
  password: string
}

// Auth response
interface AuthResponse {
  user: User
  token: string
}

// Notification settings
interface NotificationSettings {
  id: string
  userId: string
  emailNotifications: boolean
  pushNotifications: boolean
  reviewAssignments: boolean
  reviewComments: boolean
  reviewStatusChanges: boolean
  weeklyDigest: boolean
}

// Pagination
interface PaginationParams {
  page?: number
  pageSize?: number
}

// Sort
interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
```

---

## Best Practices

1. **Import Components**: Import components directly from `@/lib/ui` for consistency.
2. **Use TypeScript**: All components are type-safe. Provide proper types for your data.
3. **Compose Components**: Combine smaller components to build complex UIs.
4. **Handle Loading States**: Use the `isLoading` prop when available for better UX.
5. **Accessibility**: Components include ARIA attributes. Add custom labels when needed.
6. **Responsive Design**: Use Tailwind classes for responsive layouts within components.
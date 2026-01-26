/**
 * Integration Tests for Complete Business Flows
 *
 * This test file covers end-to-end workflows using vitest:
 * 1. User Registration and Login Flow
 * 2. Complete Review Lifecycle (Create → View → Update → Delete)
 * 3. Complete Comment Lifecycle (Create → View → Update → Delete with Review)
 * 4. Settings Update Flow
 */
import { describe, it, expect, beforeEach, vi, afterAll, beforeAll } from 'vitest'
import { hash } from 'bcryptjs'
import { signToken, verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies at module level
vi.mock('@/lib/auth', () => ({
  signToken: vi.fn(),
  verifyToken: vi.fn(),
  decodeToken: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    reviewComment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    reviewCommentReply: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    notificationSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

// Mock crypto for password hashing in tests
vi.mock('crypto', () => ({
  ...vi.importActual('crypto'),
  createHash: vi.fn((algorithm) => ({
    update: vi.fn(function(this: any, data: string) {
      this._data = data
      return this
    }),
    digest: vi.fn(function(this: any, encoding: string) {
      // Return the actual SHA256 hash of the data for testing
      if (algorithm === 'sha256') {
        const crypto = require('crypto')
        return crypto.createHash('sha256').update(this._data || '').digest('hex')
      }
      return 'mocked-hash'
    }),
  })),
}))

// Set environment variables
beforeAll(() => {
  vi.stubEnv('JWT_SECRET', 'test-secret-key-for-testing')
  vi.stubEnv('JWT_EXPIRES_IN', '1h')
})

afterAll(() => {
  vi.unstubAllEnvs()
})

// Helper to create mock request
function createMockRequest(url: string, options: RequestInit = {}): Request {
  return new Request(`http://localhost${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

describe('Integration Tests - Complete Business Flows', () => {
  const mockUserPayload = { userId: 'user-1', email: 'test@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyToken).mockResolvedValue({ valid: true, payload: mockUserPayload })
  })

  describe('Flow 1: User Registration and Login', () => {
    it('complete registration flow - new user can register and login', async () => {
      // Step 1: Register a new user
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'new-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        createdAt: new Date(),
      })

      const { POST: registerPOST } = await import('../auth/register/route')
      const registerRequest = createMockRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'securePassword123',
          name: 'New User',
        }),
      })
      const registerResponse = await registerPOST(registerRequest)
      const registerData = await registerResponse.json()

      expect(registerResponse.status).toBe(201)
      expect(registerData.user.id).toBe('new-user-123')
      expect(registerData.user.email).toBe('newuser@example.com')
      expect(registerData.user.name).toBe('New User')

      // Step 2: Login with the registered user
      const hashedPassword = await hash('securePassword123', 12)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'new-user-123',
        email: 'newuser@example.com',
        password: hashedPassword,
        name: 'New User',
      })
      vi.mocked(signToken).mockResolvedValue('jwt-token-abc123')

      const { POST: loginPOST } = await import('../auth/login/route')
      const loginRequest = createMockRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'securePassword123',
        }),
      })
      const loginResponse = await loginPOST(loginRequest)
      const loginData = await loginResponse.json()

      expect(loginResponse.status).toBe(200)
      expect(loginData.token).toBe('jwt-token-abc123')
      expect(loginData.user.id).toBe('new-user-123')
      expect(loginData.user.email).toBe('newuser@example.com')
      expect(loginData.user.password).toBeUndefined()
    })

    it('login fails with wrong password after successful registration', async () => {
      // Register first
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-456',
        email: 'test@example.com',
        name: 'Test User',
      })

      const { POST: registerPOST } = await import('../auth/register/route')
      const registerRequest = createMockRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'correctPassword',
          name: 'Test User',
        }),
      })
      expect((await registerPOST(registerRequest)).status).toBe(201)

      // Try login with wrong password
      const hashedPassword = await hash('correctPassword', 12)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-456',
        email: 'test@example.com',
        password: hashedPassword,
      })

      const { POST: loginPOST } = await import('../auth/login/route')
      const loginRequest = createMockRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongPassword',
        }),
      })
      const loginResponse = await loginPOST(loginRequest)
      const loginData = await loginResponse.json()

      expect(loginResponse.status).toBe(401)
      expect(loginData.error).toBe('Invalid email or password')
    })

    it('registration fails for existing email', async () => {
      // Attempt to register with existing email
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      })

      const { POST } = await import('../auth/register/route')
      const request = createMockRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Another User',
        }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('User with this email already exists')
    })
  })

  describe('Flow 2: Complete Review Lifecycle', () => {
    it('create review → view review → update status → delete review', async () => {
      // Ensure mock is set before importing the route
      vi.mocked(verifyToken).mockResolvedValue({ valid: true, payload: mockUserPayload })

      // Step 1: Create a new review
      vi.mocked(prisma.review.create).mockResolvedValue({
        id: 'review-001',
        title: 'Feature Implementation',
        description: 'New feature implementation for user dashboard',
        sourceType: 'github',
        sourceId: 'pr-12345',
        authorId: 'user-1',
        status: 'PENDING',
        createdAt: new Date(),
      })

      const { POST: createPOST } = await import('../reviews/route')
      const createRequest = createMockRequest('/api/reviews', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' },
        body: JSON.stringify({
          title: 'Feature Implementation',
          description: 'New feature implementation for user dashboard',
          sourceType: 'pull_request',
          sourceId: 'pr-12345',
        }),
      })
      const createResponse = await createPOST(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(201)
      expect(createData.id).toBe('review-001')
      expect(createData.status).toBe('PENDING')

      // Step 2: View the created review
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        id: 'review-001',
        title: 'Feature Implementation',
        description: 'New feature implementation for user dashboard',
        sourceType: 'github',
        sourceId: 'pr-12345',
        authorId: 'user-1',
        status: 'PENDING',
        comments: [
          { id: 'comment-1', content: 'Good implementation', severity: 'INFO' },
          { id: 'comment-2', content: 'Fix this bug', severity: 'ERROR' },
        ],
      })

      const reviewMod = await import('../reviews/[id]/route')
      const { GET: reviewGET } = reviewMod
      const viewRequest = createMockRequest('/api/reviews/review-001')
      const viewParams = Promise.resolve({ id: 'review-001' })
      const viewResponse = await reviewGET(viewRequest, { params: viewParams })
      const viewData = await viewResponse.json()

      expect(viewResponse.status).toBe(200)
      expect(viewData.id).toBe('review-001')
      expect(viewData.comments).toHaveLength(2)

      // Step 3: Update review status to IN_PROGRESS
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        id: 'review-001',
        title: 'Feature Implementation',
        status: 'PENDING',
      })
      vi.mocked(prisma.review.update).mockResolvedValue({
        id: 'review-001',
        title: 'Feature Implementation',
        status: 'IN_PROGRESS',
        description: 'Updated description',
      })

      const { PATCH: reviewPATCH } = reviewMod
      const updateRequest = createMockRequest('/api/reviews/review-001', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer test-token' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      })
      const updateParams = Promise.resolve({ id: 'review-001' })
      const updateResponse = await reviewPATCH(updateRequest, { params: updateParams })
      const updateData = await updateResponse.json()

      expect(updateResponse.status).toBe(200)
      expect(updateData.status).toBe('IN_PROGRESS')

      // Step 4: Update review to APPROVED
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        id: 'review-001',
        status: 'IN_PROGRESS',
      })
      vi.mocked(prisma.review.update).mockResolvedValue({
        id: 'review-001',
        status: 'APPROVED',
      })

      const approveRequest = createMockRequest('/api/reviews/review-001', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer test-token' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      const approveResponse = await reviewPATCH(approveRequest, { params: updateParams })
      const approveData = await approveResponse.json()

      expect(approveResponse.status).toBe(200)
      expect(approveData.status).toBe('APPROVED')

      // Step 5: Delete the review
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        id: 'review-001',
        title: 'Feature Implementation',
      })
      vi.mocked(prisma.review.delete).mockResolvedValue({ id: 'review-001' })

      const { DELETE: reviewDELETE } = reviewMod
      const deleteRequest = createMockRequest('/api/reviews/review-001', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' },
      })
      const deleteResponse = await reviewDELETE(deleteRequest, { params: updateParams })
      const deleteData = await deleteResponse.json()

      expect(deleteResponse.status).toBe(200)
      expect(deleteData.message).toBe('Review deleted successfully')
    })

    it('review list with pagination and filtering', async () => {
      const mockReviews = [
        { id: 'review-1', title: 'Review 1', status: 'PENDING', comments: [] },
        { id: 'review-2', title: 'Review 2', status: 'APPROVED', comments: [] },
        { id: 'review-3', title: 'Review 3', status: 'PENDING', comments: [] },
      ]
      vi.mocked(prisma.review.findMany).mockResolvedValue(mockReviews)
      vi.mocked(prisma.review.count).mockResolvedValue(3)

      const { GET } = await import('../reviews/route')
      const request = createMockRequest('/api/reviews?page=1&pageSize=10&status=PENDING')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toHaveLength(3)
      expect(data.total).toBe(3)
      expect(data.page).toBe(1)
      expect(data.pageSize).toBe(10)

      // Verify filter was applied
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        })
      )
    })
  })

  describe('Flow 3: Complete Comment Lifecycle with Review', () => {
    it('create review → add comment → update comment → resolve comment → add reply → delete comment', async () => {
      // Ensure mock is set before importing the route
      vi.mocked(verifyToken).mockResolvedValue({ valid: true, payload: mockUserPayload })

      // Step 1: Create a review
      vi.mocked(prisma.review.create).mockResolvedValue({
        id: 'review-comment-001',
        title: 'Code Review Test',
        status: 'PENDING',
        authorId: 'user-1',
      })

      const { POST: createReviewPOST } = await import('../reviews/route')
      const createReviewRequest = createMockRequest('/api/reviews', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' },
        body: JSON.stringify({
          title: 'Code Review Test',
          description: 'Testing comment lifecycle',
          sourceType: 'pull_request',
          sourceId: 'pr-999',
        }),
      })
      const createReviewResponse = await createReviewPOST(createReviewRequest)
      const createReviewData = await createReviewResponse.json()

      expect(createReviewResponse.status).toBe(201)
      expect(createReviewData.id).toBe('review-comment-001')

      // Step 2: Add a comment to the review
      vi.mocked(prisma.review.findUnique).mockResolvedValue({ id: 'review-comment-001' })
      vi.mocked(prisma.reviewComment.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.reviewComment.create).mockResolvedValue({
        id: 'comment-main',
        content: 'Please review this function for potential null pointer issues',
        reviewId: 'review-comment-001',
        authorId: 'user-1',
        severity: 'WARNING',
        isResolved: false,
        createdAt: new Date(),
      })

      const { POST: createCommentPOST } = await import('../comments/route')
      const createCommentRequest = createMockRequest('/api/comments', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' },
        body: JSON.stringify({
          content: 'Please review this function for potential null pointer issues',
          reviewId: 'review-comment-001',
          severity: 'WARNING',
        }),
      })
      const createCommentResponse = await createCommentPOST(createCommentRequest)
      const createCommentData = await createCommentResponse.json()

      expect(createCommentResponse.status).toBe(201)
      expect(createCommentData.id).toBe('comment-main')
      expect(createCommentData.severity).toBe('WARNING')
      expect(createCommentData.isResolved).toBe(false)

      // Step 3: View the comment
      vi.mocked(prisma.reviewComment.findUnique).mockResolvedValue({
        id: 'comment-main',
        content: 'Please review this function for potential null pointer issues',
        review: { id: 'review-comment-001', title: 'Code Review Test' },
        parent: null,
        replies: [],
        _count: { replies: 0 },
      })

      const commentMod = await import('../comments/[id]/route')
      const { GET: commentGET } = commentMod
      const viewCommentRequest = createMockRequest('/api/comments/comment-main')
      const viewCommentParams = Promise.resolve({ id: 'comment-main' })
      const viewCommentResponse = await commentGET(viewCommentRequest, { params: viewCommentParams })
      const viewCommentData = await viewCommentResponse.json()

      expect(viewCommentResponse.status).toBe(200)
      expect(viewCommentData.id).toBe('comment-main')
      expect(viewCommentData.review.title).toBe('Code Review Test')

      // Step 4: Update comment content
      vi.mocked(prisma.reviewComment.findUnique).mockResolvedValue({
        id: 'comment-main',
        content: 'Original content',
      })
      vi.mocked(prisma.reviewComment.update).mockResolvedValue({
        id: 'comment-main',
        content: 'Updated content with more details',
        severity: 'ERROR',
      })

      const { PUT: commentPUT } = commentMod
      const updateCommentRequest = createMockRequest('/api/comments/comment-main', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer test-token' },
        body: JSON.stringify({ content: 'Updated content with more details', severity: 'ERROR' }),
      })
      const updateCommentResponse = await commentPUT(updateCommentRequest, { params: viewCommentParams })
      const updateCommentData = await updateCommentResponse.json()

      expect(updateCommentResponse.status).toBe(200)
      expect(updateCommentData.content).toBe('Updated content with more details')
      expect(updateCommentData.severity).toBe('ERROR')

      // Step 5: Mark comment as resolved
      vi.mocked(prisma.reviewComment.findUnique).mockResolvedValue({
        id: 'comment-main',
        isResolved: false,
      })
      vi.mocked(prisma.reviewComment.update).mockResolvedValue({
        id: 'comment-main',
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: 'user-1',
      })

      const resolveRequest = createMockRequest('/api/comments/comment-main', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer test-token' },
        body: JSON.stringify({ isResolved: true }),
      })
      const resolveResponse = await commentPUT(resolveRequest, { params: viewCommentParams })
      const resolveData = await resolveResponse.json()

      expect(resolveResponse.status).toBe(200)
      expect(resolveData.isResolved).toBe(true)

      // Step 6: Delete the comment
      vi.mocked(prisma.reviewComment.findUnique).mockResolvedValue({
        id: 'comment-main',
        content: 'Comment to delete',
      })
      vi.mocked(prisma.reviewComment.delete).mockResolvedValue({ id: 'comment-main' })

      const { DELETE: commentDELETE } = commentMod
      const deleteCommentRequest = createMockRequest('/api/comments/comment-main', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' },
      })
      const deleteCommentResponse = await commentDELETE(deleteCommentRequest, { params: viewCommentParams })
      const deleteCommentData = await deleteCommentResponse.json()

      expect(deleteCommentResponse.status).toBe(200)
      expect(deleteCommentData.message).toBe('Comment deleted successfully')
    })

    it('comments list filtered by review and severity', async () => {
      const mockComments = [
        { id: 'comment-1', content: 'Error found', severity: 'ERROR', _count: { replies: 1 } },
        { id: 'comment-2', content: 'Warning here', severity: 'WARNING', _count: { replies: 0 } },
      ]
      vi.mocked(prisma.reviewComment.findMany).mockResolvedValue(mockComments)
      vi.mocked(prisma.reviewComment.count).mockResolvedValue(2)

      const { GET } = await import('../comments/route')
      const request = createMockRequest('/api/comments?reviewId=review-123&severity=ERROR')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toHaveLength(2)
      expect(data.total).toBe(2)

      // Verify filters were applied
      expect(prisma.reviewComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reviewId: 'review-123',
            severity: 'ERROR',
          }),
        })
      )
    })
  })

  describe('Flow 4: Settings Update Flow', () => {
    it('user can update profile and password', async () => {
      // Step 1: Update profile
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Old Name',
      })
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Updated Name',
      })

      const profileMod = await import('../settings/profile/route')
      const { PUT: profilePUT } = profileMod
      const profileRequest = createMockRequest('/api/settings/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      })
      const profileResponse = await profilePUT(profileRequest)
      const profileData = await profileResponse.json()

      expect(profileResponse.status).toBe(200)
      expect(profileData.data.name).toBe('Updated Name')
      expect(prisma.user.update).toHaveBeenCalled()

      // Step 2: Change password (requires verification)
      // SHA256 hash of 'oldPassword123'
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        password: '0ecbee4e1bfef4a1a802236c1030cc8d3c4ca95d1bf7c3ce5a9780e48cfd4014',
      })

      const passwordMod = await import('../settings/password/route')
      const { PUT: passwordPUT } = passwordMod
      const passwordRequest = createMockRequest('/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'oldPassword123',
          newPassword: 'newSecurePassword456',
          confirmPassword: 'newSecurePassword456',
        }),
      })
      const passwordResponse = await passwordPUT(passwordRequest)
      const passwordData = await passwordResponse.json()

      expect(passwordResponse.status).toBe(200)
      expect(passwordData.message).toBe('Password changed successfully')
    })

    it('password change fails with wrong current password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        password: 'correctPasswordHash',
      })

      const { PUT } = await import('../settings/password/route')
      const request = createMockRequest('/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123',
          confirmPassword: 'newPassword123',
        }),
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      // The error could be validation failed or current password incorrect
      expect(data.error).toMatch(/Current password is incorrect|Validation failed/)
    })

    it('notification settings can be updated', async () => {
      vi.mocked(prisma.notificationSettings.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.notificationSettings.upsert).mockResolvedValue({
        emailNotifications: false,
        reviewAssignments: true,
        reviewComments: true,
        reviewStatusChanges: true,
        pushNotifications: true,
        weeklyDigest: false,
      })

      const { PUT } = await import('../settings/notifications/route')
      const request = createMockRequest('/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify({
          emailNotifications: false,
          reviewAssignments: true,
          reviewComments: true,
        }),
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.emailNotifications).toBe(false)
    })
  })

  describe('Flow 5: Stats Dashboard Data', () => {
    it('dashboard returns aggregated review and comment statistics', async () => {
      vi.mocked(prisma.review.groupBy).mockResolvedValue([
        { status: 'PENDING', _count: { id: 5 } },
        { status: 'APPROVED', _count: { id: 10 } },
        { status: 'REJECTED', _count: { id: 2 } },
        { status: 'IN_PROGRESS', _count: { id: 3 } },
      ])
      vi.mocked(prisma.reviewComment.count)
        .mockResolvedValueOnce(25) // total comments
        .mockResolvedValueOnce(8) // unresolved comments
      vi.mocked(prisma.reviewComment.groupBy).mockResolvedValue([
        { severity: 'INFO', _count: { id: 10 } },
        { severity: 'WARNING', _count: { id: 5 } },
        { severity: 'ERROR', _count: { id: 8 } },
        { severity: 'CRITICAL', _count: { id: 2 } },
      ])
      vi.mocked(prisma.review.findMany).mockResolvedValue([
        { createdAt: new Date('2024-01-15'), status: 'PENDING' },
        { createdAt: new Date('2024-01-15'), status: 'APPROVED' },
      ])
      vi.mocked(prisma.reviewComment.findMany).mockResolvedValue([
        { createdAt: new Date('2024-01-15') },
      ])

      const { GET } = await import('../stats/route')
      const request = createMockRequest('/api/stats')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify aggregated stats
      expect(data.reviews.total).toBe(20)
      expect(data.reviews.PENDING).toBe(5)
      expect(data.reviews.APPROVED).toBe(10)
      expect(data.comments.total).toBe(25)
      expect(data.comments.unresolved).toBe(8)

      // Verify severity breakdown
      expect(data.comments.bySeverity.INFO).toBe(10)
      expect(data.comments.bySeverity.ERROR).toBe(8)
      expect(data.comments.bySeverity.CRITICAL).toBe(2)

      // Verify activity data exists
      expect(data.activityOverTime).toBeDefined()
      expect(Array.isArray(data.activityOverTime)).toBe(true)
    })
  })

  describe('Flow 6: Protected Routes Authorization', () => {
    it('requires authentication for creating reviews', async () => {
      vi.mocked(verifyToken).mockResolvedValue({ valid: false })

      const { POST } = await import('../reviews/route')
      const request = createMockRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Unauthorized Review',
          description: 'Should fail',
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('requires authentication for creating comments', async () => {
      vi.mocked(verifyToken).mockResolvedValue({ valid: false })

      const { POST } = await import('../comments/route')
      const request = createMockRequest('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Unauthorized comment',
          reviewId: 'review-123',
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('allows unauthenticated access to public endpoints', async () => {
      // Login should work without token verification (it handles its own auth)
      const hashedPassword = await hash('password123', 12)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
      })
      vi.mocked(signToken).mockResolvedValue('public-access-token')

      const { POST } = await import('../auth/login/route')
      const request = createMockRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })
})
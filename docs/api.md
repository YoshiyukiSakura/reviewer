# API Documentation

This document describes the REST API endpoints for the AI Code Reviewer application.

## Base URL

All API endpoints are relative to the server root. In development:
```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

---

## Authentication Endpoints

### Register User

Creates a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address (must be unique) |
| password | string | Yes | Password (minimum 6 characters) |
| name | string | No | User's display name (defaults to email username) |

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "error": "Validation error",
  "details": { "fieldErrors": [...] }
}
```

**Error Response (409):**
```json
{
  "error": "User with this email already exists"
}
```

---

### Login

Authenticates a user and returns a JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email address |
| password | string | Yes | User's password |

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid email or password"
}
```

---

## Reviews Endpoints

### List Reviews

Retrieves a paginated list of reviews.

**Endpoint:** `GET /api/reviews`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (1-indexed) |
| pageSize | number | 20 | Items per page |
| sortBy | string | createdAt | Field to sort by |
| sortOrder | asc \| desc | desc | Sort direction |
| status | string | - | Filter by status |
| authorId | string | - | Filter by author ID |
| search | string | - | Search in title/description |

**Response (200):**
```json
{
  "items": [
    {
      "id": "review_abc123",
      "title": "Fix authentication bug",
      "description": "Resolved login issue",
      "status": "PENDING",
      "sourceType": "pull_request",
      "sourceId": "pr_456",
      "sourceUrl": "https://github.com/...",
      "authorId": "user_abc123",
      "authorName": "John Doe",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "comments": [{ "id": "comment_1" }]
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

---

### Get Single Review

Retrieves details of a specific review including all comments.

**Endpoint:** `GET /api/reviews/:id`

**Response (200):**
```json
{
  "id": "review_abc123",
  "title": "Fix authentication bug",
  "description": "Resolved login issue",
  "status": "PENDING",
  "sourceType": "pull_request",
  "sourceId": "pr_456",
  "sourceUrl": "https://github.com/...",
  "authorId": "user_abc123",
  "authorName": "John Doe",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "comments": [
    {
      "id": "comment_1",
      "content": "Great work!",
      "filePath": "src/auth.ts",
      "lineStart": 42,
      "lineEnd": 42,
      "isResolved": false,
      "severity": "SUGGESTION",
      "authorId": "user_def456",
      "authorName": "Jane Smith",
      "createdAt": "2024-01-15T11:00:00Z"
    }
  ]
}
```

**Error Response (404):**
```json
{
  "error": "Review not found"
}
```

---

### Create Review

Creates a new code review.

**Endpoint:** `POST /api/reviews`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "title": "Feature implementation review",
  "description": "Review for new dashboard feature",
  "sourceType": "pull_request",
  "sourceId": "pr_789",
  "sourceUrl": "https://github.com/org/repo/pull/789",
  "authorName": "John Doe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Review title |
| description | string | No | Review description |
| sourceType | string | No | Source type (pull_request, commit, file) |
| sourceId | string | No | External reference ID |
| sourceUrl | string | No | URL to the source |
| authorName | string | No | Display name for author |

**Response (201):**
```json
{
  "id": "review_new123",
  "title": "Feature implementation review",
  "status": "PENDING",
  "authorId": "user_abc123",
  "createdAt": "2024-01-15T12:00:00Z",
  ...
}
```

---

### Update Review

Updates an existing review.

**Endpoint:** `PATCH /api/reviews/:id`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "APPROVED"
}
```

| Field | Type | Description |
|-------|------|-------------|
| title | string | Updated title |
| description | string | Updated description |
| status | string | New status (PENDING, IN_PROGRESS, APPROVED, REJECTED, CHANGES_REQUESTED, CLOSED) |

**Response (200):**
```json
{
  "id": "review_abc123",
  "title": "Updated title",
  "status": "APPROVED",
  ...
}
```

---

### Delete Review

Deletes a review and all its comments.

**Endpoint:** `DELETE /api/reviews/:id`

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "message": "Review deleted successfully"
}
```

---

## Comments Endpoints

### List Comments

Retrieves a paginated list of comments.

**Endpoint:** `GET /api/comments`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| pageSize | number | 20 | Items per page |
| sortBy | string | createdAt | Field to sort by |
| sortOrder | asc \| desc | desc | Sort direction |
| reviewId | string | - | Filter by review ID |
| isResolved | boolean | - | Filter by resolved status |
| severity | string | - | Filter by severity |
| authorId | string | - | Filter by author ID |

**Response (200):**
```json
{
  "items": [
    {
      "id": "comment_1",
      "content": "Great work!",
      "filePath": "src/auth.ts",
      "lineStart": 42,
      "isResolved": false,
      "severity": "SUGGESTION",
      "authorId": "user_abc123",
      "authorName": "John Doe",
      "createdAt": "2024-01-15T11:00:00Z",
      "_count": { "replies": 2 }
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

---

### Get Single Comment

Retrieves details of a specific comment including replies.

**Endpoint:** `GET /api/comments/:id`

**Response (200):**
```json
{
  "id": "comment_1",
  "content": "Great work!",
  "filePath": "src/auth.ts",
  "lineStart": 42,
  "isResolved": false,
  "severity": "SUGGESTION",
  "authorId": "user_abc123",
  "authorName": "John Doe",
  "review": { "id": "review_abc123", "title": "Review title" },
  "parent": null,
  "replies": [...],
  "createdAt": "2024-01-15T11:00:00Z"
}
```

---

### Create Comment

Creates a new comment on a review.

**Endpoint:** `POST /api/comments`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "content": "Consider using a more efficient algorithm here.",
  "reviewId": "review_abc123",
  "filePath": "src/processing.ts",
  "lineStart": 150,
  "lineEnd": 160,
  "severity": "SUGGESTION",
  "parentId": null,
  "authorName": "John Doe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | Yes | Comment text |
| reviewId | string | Yes | ID of the review |
| filePath | string | No | File being commented on |
| lineStart | number | No | Starting line number |
| lineEnd | number | No | Ending line number |
| severity | string | No | Comment severity (INFO, SUGGESTION, WARNING, ERROR, CRITICAL) |
| parentId | string | No | Parent comment ID for threaded replies |
| authorName | string | No | Display name for author |

**Response (201):**
```json
{
  "id": "comment_new456",
  "content": "Consider using...",
  "reviewId": "review_abc123",
  "createdAt": "2024-01-15T12:30:00Z",
  ...
}
```

---

### Update Comment

Updates an existing comment.

**Endpoint:** `PUT /api/comments/:id`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "content": "Updated comment text",
  "isResolved": true,
  "severity": "WARNING"
}
```

**Response (200):**
```json
{
  "id": "comment_1",
  "content": "Updated comment text",
  "isResolved": true,
  "severity": "WARNING",
  ...
}
```

---

### Delete Comment

Deletes a comment.

**Endpoint:** `DELETE /api/comments/:id`

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "message": "Comment deleted successfully"
}
```

---

## Stats Endpoints

### Get Dashboard Statistics

Retrieves aggregated statistics for the dashboard.

**Endpoint:** `GET /api/stats`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | Start date (ISO format) |
| endDate | string | End date (ISO format) |

**Response (200):**
```json
{
  "reviews": {
    "total": 150,
    "PENDING": 20,
    "IN_PROGRESS": 15,
    "APPROVED": 80,
    "REJECTED": 10,
    "CHANGES_REQUESTED": 20,
    "CLOSED": 5
  },
  "comments": {
    "total": 500,
    "unresolved": 45,
    "bySeverity": {
      "INFO": 100,
      "SUGGESTION": 200,
      "WARNING": 120,
      "ERROR": 70,
      "CRITICAL": 10
    }
  },
  "activityOverTime": [
    { "date": "2024-01-01", "reviews": 5, "comments": 20 },
    { "date": "2024-01-02", "reviews": 8, "comments": 35 },
    ...
  ]
}
```

---

## Settings Endpoints

### Get Profile

Retrieves the current user's profile.

**Endpoint:** `GET /api/settings/profile`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "avatarUrl": "https://github.com/john.png",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

---

### Update Profile

Updates the current user's profile.

**Endpoint:** `PUT /api/settings/profile`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "avatarUrl": "https://github.com/john.png"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    ...
  }
}
```

---

### Get Notification Settings

Retrieves the current user's notification preferences.

**Endpoint:** `GET /api/settings/notifications`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "notif_abc123",
    "userId": "user_abc123",
    "emailNotifications": true,
    "pushNotifications": true,
    "reviewAssignments": true,
    "reviewComments": true,
    "reviewStatusChanges": true,
    "weeklyDigest": false
  }
}
```

---

### Update Notification Settings

Updates the current user's notification preferences.

**Endpoint:** `PUT /api/settings/notifications`

**Request Body:**
```json
{
  "emailNotifications": true,
  "pushNotifications": false,
  "reviewAssignments": true,
  "reviewComments": true,
  "reviewStatusChanges": true,
  "weeklyDigest": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "notif_abc123",
    "userId": "user_abc123",
    "emailNotifications": true,
    "pushNotifications": false,
    ...
  }
}
```

---

### Change Password

Changes the current user's password.

**Endpoint:** `PUT /api/settings/password`

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Current password is incorrect"
}
```

---

## Error Responses

All endpoints use standard HTTP status codes:

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created (new resource) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 404 | Not Found (resource doesn't exist) |
| 409 | Conflict (duplicate resource) |
| 500 | Internal Server Error |

**Error Response Format:**
```json
{
  "error": "Human-readable error message",
  "details": { /* Optional validation details */ }
}
```

---

## Enums

### Review Status
- `PENDING` - Review not started
- `IN_PROGRESS` - Review in progress
- `APPROVED` - Review approved
- `REJECTED` - Review rejected
- `CHANGES_REQUESTED` - Changes requested
- `CLOSED` - Review closed

### Comment Severity
- `INFO` - Informational
- `SUGGESTION` - Improvement suggestion
- `WARNING` - Warning about potential issue
- `ERROR` - Error that should be fixed
- `CRITICAL` - Critical issue requiring immediate attention
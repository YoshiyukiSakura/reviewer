/**
 * GitHub Webhook API Route
 *
 * Receives GitHub webhook events at POST /api/webhook/github
 * - Validates webhook signatures
 * - Processes PR events in real-time
 * - Supports event retry mechanism
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebhookHandler, createWebhookHandler } from '../../../../lib/github/webhook-handler';
import { log } from '../../../../lib/remote-log';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Maximum payload size in bytes (10MB)
 */
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024;

/**
 * Simple in-memory rate limiter for webhook endpoints
 */
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks and updates rate limit for an IP
 * @param ip - Client IP address
 * @returns True if request is allowed
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  const maxRequests = 100; // Max requests per window

  const record = rateLimiter.get(ip);

  if (!record || record.resetTime < now) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// ============================================================================
// GET Handler (Health Check)
// ============================================================================

/**
 * Handles GET requests - returns webhook endpoint status
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'GitHub Webhook endpoint is active',
    timestamp: new Date().toISOString(),
    methods: ['GET', 'POST'],
  });
}

// ============================================================================
// POST Handler (Webhook Events)
// ============================================================================

/**
 * Handles POST requests - receives GitHub webhook events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // Get request headers
  const signature = request.headers.get('X-Hub-Signature-256');
  const eventType = request.headers.get('X-GitHub-Event');
  const deliveryId = request.headers.get('X-GitHub-Delivery') || crypto.randomUUID();
  const contentType = request.headers.get('Content-Type');
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Log incoming webhook
  await log.info('Incoming webhook request', {
    deliveryId,
    eventType,
    ip,
    contentType,
  });

  // Check content type
  if (contentType !== 'application/json') {
    await log.warn('Invalid content type for webhook', {
      deliveryId,
      contentType,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid content type. Expected application/json',
      },
      { status: 415 }
    );
  }

  // Check rate limit
  if (!checkRateLimit(ip)) {
    await log.warn('Webhook rate limit exceeded', {
      deliveryId,
      ip,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
      },
      { status: 429 }
    );
  }

  // Check payload size
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    await log.warn('Webhook payload too large', {
      deliveryId,
      contentLength,
      maxSize: MAX_PAYLOAD_SIZE,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Payload too large',
      },
      { status: 413 }
    );
  }

  // Read and validate the request body
  let payload: string;
  try {
    payload = await request.text();
  } catch (error) {
    await log.warn('Failed to read webhook payload', {
      deliveryId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to read request body',
      },
      { status: 400 }
    );
  }

  // Validate payload is not empty
  if (!payload || payload.trim().length === 0) {
    await log.warn('Empty webhook payload', {
      deliveryId,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Empty payload',
      },
      { status: 400 }
    );
  }

  // Create webhook handler
  let handler: WebhookHandler;
  try {
    handler = createWebhookHandler();
  } catch (error) {
    await log.error('Failed to create webhook handler', {
      deliveryId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }

  // Process the webhook
  const result = await handler.handleRequest(payload, signature, deliveryId, eventType || '');

  // Calculate processing time
  const processingTimeMs = Date.now() - startTime;

  // Log processing result
  if (result.success) {
    await log.info('Webhook processed successfully', {
      deliveryId,
      eventType: result.eventType,
      action: result.action,
      repository: result.repository,
      reviewCompleted: result.reviewResult?.success,
      processingTimeMs,
    });
  } else {
    await log.warn('Webhook processing failed', {
      deliveryId,
      error: result.error,
      processingTimeMs,
    });
  }

  // Return appropriate status code
  let statusCode: number;
  if (result.error?.includes('not allowed')) {
    statusCode = 403;
  } else if (result.error?.includes('Unknown event type')) {
    statusCode = 400;
  } else if (!result.success) {
    statusCode = 401;
  } else {
    statusCode = 200;
  }

  // Return response
  return NextResponse.json(
    {
      success: result.success,
      eventId: result.eventId,
      eventType: result.eventType,
      action: result.action,
      repository: result.repository,
      processingTimeMs,
    },
    { status: statusCode }
  );
}

// ============================================================================
// Export Default Handler
// ============================================================================

export default async function webhookHandler(request: NextRequest): Promise<NextResponse> {
  if (request.method === 'GET') {
    return GET();
  } else if (request.method === 'POST') {
    return POST(request);
  }

  return NextResponse.json(
    {
      success: false,
      error: `Method ${request.method} not allowed`,
    },
    { status: 405 }
  );
}
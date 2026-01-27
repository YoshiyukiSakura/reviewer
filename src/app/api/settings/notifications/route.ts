import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notificationSettingsSchema } from '@/lib/validators/settings'

/**
 * GET /api/settings/notifications
 * Get current user's notification settings
 */
export async function GET(request: Request) {
  try {
    // In a real application, you would get the user ID from the token
    const userId = 'user-1'

    // Try to find existing notification settings
    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    })

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          userId,
          emailNotifications: true,
          pushNotifications: true,
          reviewAssignments: true,
          reviewComments: true,
          reviewStatusChanges: true,
          weeklyDigest: false,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/notifications
 * Update current user's notification settings
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = notificationSettingsSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // In a real application, you would get the user ID from the token
    const userId = 'user-1'

    // Upsert notification settings
    const settings = await prisma.notificationSettings.upsert({
      where: { userId },
      update: {
        ...data,
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...data,
      },
    })

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notification settings' },
      { status: 500 }
    )
  }
}
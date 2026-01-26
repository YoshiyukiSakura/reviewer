import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { profileSettingsSchema } from '@/lib/validators/settings'

/**
 * GET /api/settings/profile
 * Get current user's profile settings
 */
export async function GET(request: Request) {
  try {
    // In a real application, you would get the user ID from the token
    // For now, we'll use a mock user ID
    const userId = 'user-1'

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Error fetching profile settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/profile
 * Update current user's profile settings
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = profileSettingsSchema.safeParse(body)
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

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedUser,
    })
  } catch (error) {
    console.error('Error updating profile settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile settings' },
      { status: 500 }
    )
  }
}
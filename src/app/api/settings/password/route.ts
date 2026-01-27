import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { passwordChangeSchema } from '@/lib/validators/settings'
import * as crypto from 'crypto'

/**
 * Simple password hashing using crypto (for demonstration)
 * In production, use bcrypt or argon2
 */
async function hashPassword(password: string): Promise<string> {
  const hash = crypto.createHash('sha256')
  hash.update(password)
  return hash.digest('hex')
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

/**
 * PUT /api/settings/password
 * Change current user's password
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = passwordChangeSchema.safeParse(body)
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

    // Get the user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password (if user has a password set)
    if (user.password) {
      const isValidPassword = await verifyPassword(data.currentPassword, user.password)
      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        )
      }
    }

    // Hash and update the new password
    const newPasswordHash = await hashPassword(data.newPassword)

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newPasswordHash,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    )
  }
}
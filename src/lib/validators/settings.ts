import { z } from 'zod'

export const profileSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email address').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').max(500, 'URL too long').optional().nullable(),
  bio: z.string().max(500, 'Bio too long').optional().nullable(),
})

export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  reviewAssignments: z.boolean().default(true),
  reviewComments: z.boolean().default(true),
  reviewStatusChanges: z.boolean().default(true),
  weeklyDigest: z.boolean().default(false),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>
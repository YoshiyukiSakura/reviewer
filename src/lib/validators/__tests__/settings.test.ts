/**
 * Unit tests for settings validators
 */

import {
  profileSettingsSchema,
  notificationSettingsSchema,
  passwordChangeSchema,
} from '../settings'

describe('settings validators', () => {
  describe('profileSettingsSchema', () => {
    it('should validate valid profile data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        avatarUrl: 'https://example.com/avatar.png',
        bio: 'Software developer',
      }

      const result = profileSettingsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
      }
    })

    it('should accept empty object', () => {
      const result = profileSettingsSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should validate email format', () => {
      const result = profileSettingsSchema.safeParse({ email: 'invalid-email' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })

    it('should accept valid email', () => {
      const result = profileSettingsSchema.safeParse({ email: 'test@example.com' })
      expect(result.success).toBe(true)
    })

    it('should validate avatarUrl format', () => {
      const result = profileSettingsSchema.safeParse({ avatarUrl: 'not-a-url' })
      expect(result.success).toBe(false)
    })

    it('should accept valid avatarUrl', () => {
      const result = profileSettingsSchema.safeParse({
        avatarUrl: 'https://github.com/avatar.png',
      })
      expect(result.success).toBe(true)
    })

    it('should accept null avatarUrl', () => {
      const result = profileSettingsSchema.safeParse({ avatarUrl: null })
      expect(result.success).toBe(true)
    })

    it('should reject name that is too long', () => {
      const result = profileSettingsSchema.safeParse({ name: 'x'.repeat(101) })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name too long')
      }
    })

    it('should reject bio that is too long', () => {
      const result = profileSettingsSchema.safeParse({ bio: 'x'.repeat(501) })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Bio too long')
      }
    })
  })

  describe('notificationSettingsSchema', () => {
    it('should validate valid notification settings', () => {
      const validData = {
        emailNotifications: true,
        pushNotifications: false,
        reviewAssignments: true,
        reviewComments: true,
        reviewStatusChanges: false,
        weeklyDigest: true,
      }

      const result = notificationSettingsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should use default values', () => {
      const result = notificationSettingsSchema.parse({})
      expect(result.emailNotifications).toBe(true)
      expect(result.pushNotifications).toBe(true)
      expect(result.reviewAssignments).toBe(true)
      expect(result.reviewComments).toBe(true)
      expect(result.reviewStatusChanges).toBe(true)
      expect(result.weeklyDigest).toBe(false)
    })

    it('should validate boolean types', () => {
      const result = notificationSettingsSchema.safeParse({
        emailNotifications: 'true',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('passwordChangeSchema', () => {
    it('should validate valid password change data', () => {
      const validData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456',
        confirmPassword: 'newpassword456',
      }

      const result = passwordChangeSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require currentPassword', () => {
      const result = passwordChangeSchema.safeParse({
        newPassword: 'newpassword',
        confirmPassword: 'newpassword',
      })
      expect(result.success).toBe(false)
    })

    it('should require confirmPassword', () => {
      const result = passwordChangeSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      })
      expect(result.success).toBe(false)
    })

    it('should reject short new password', () => {
      const result = passwordChangeSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: 'short',
        confirmPassword: 'short',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters')
      }
    })

    it('should reject mismatched passwords', () => {
      const result = passwordChangeSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'differentpassword',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match')
      }
    })

    it('should accept matching passwords', () => {
      const result = passwordChangeSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      })
      expect(result.success).toBe(true)
    })

    it('should set error path to confirmPassword on mismatch', () => {
      const result = passwordChangeSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'different',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword')
      }
    })
  })
})
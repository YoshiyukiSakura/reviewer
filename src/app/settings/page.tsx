'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/react'
import { axiosInstance, HttpError } from '@/lib/http'
import type { ApiResponse, User } from '@/types'
import type { ProfileSettingsInput, NotificationSettingsInput, PasswordChangeInput } from '@/lib/validators/settings'
import { profileSettingsSchema, notificationSettingsSchema, passwordChangeSchema } from '@/lib/validators/settings'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/lib/ui'
import { Button } from '@/lib/ui/button'
import { Input } from '@/lib/ui/input'
import { User, Bell, Lock } from 'lucide-react'

/**
 * Tab type for settings sections
 */
type SettingsTab = 'profile' | 'notifications' | 'security'

/**
 * Profile settings section component
 */
interface ProfileSettingsProps {
  user: User | null
  onSave: (data: ProfileSettingsInput) => Promise<void>
  isSaving: boolean
}

function ProfileSettings({ user, onSave, isSaving }: ProfileSettingsProps) {
  const [formData, setFormData] = useState<ProfileSettingsInput>({
    name: user?.name || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || null,
    bio: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || null,
        bio: '',
      })
    }
  }, [user])

  const handleChange = (field: keyof ProfileSettingsInput, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
    setSuccessMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')

    const result = profileSettingsSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      const zodError = result.error
      zodError.issues.forEach((issue) => {
        const path = issue.path[0]
        if (path) {
          fieldErrors[path as string] = issue.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    try {
      await onSave(formData)
      setSuccessMessage('Profile updated successfully')
    } catch {
      setErrors({ general: 'Failed to update profile. Please try again.' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successMessage && (
        <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
          {successMessage}
        </div>
      )}
      {errors.general && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {errors.general}
        </div>
      )}

      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        error={errors.name}
        placeholder="Your name"
      />

      <Input
        label="Email"
        type="email"
        value={formData.email || ''}
        onChange={(e) => handleChange('email', e.target.value)}
        error={errors.email}
        placeholder="your@email.com"
      />

      <Input
        label="Avatar URL"
        value={formData.avatarUrl || ''}
        onChange={(e) => handleChange('avatarUrl', e.target.value || null)}
        error={errors.avatarUrl}
        placeholder="https://example.com/avatar.jpg"
        helperText="Enter a URL for your profile picture"
      />

      <div className="space-y-2">
        <label htmlFor="bio" className="block text-sm font-medium text-foreground">
          Bio
        </label>
        <textarea
          id="bio"
          value={formData.bio || ''}
          onChange={(e) => handleChange('bio', e.target.value || null)}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Tell us about yourself"
        />
        {errors.bio && <p className="text-sm text-destructive">{errors.bio}</p>}
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSaving}>
          Save Changes
        </Button>
      </div>
    </form>
  )
}

/**
 * Notification settings section component
 */
interface NotificationSettingsProps {
  settings: NotificationSettingsInput
  onSave: (data: NotificationSettingsInput) => Promise<void>
  isSaving: boolean
}

function NotificationSettings({ settings, onSave, isSaving }: NotificationSettingsProps) {
  const [formData, setFormData] = useState<NotificationSettingsInput>(settings)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleToggle = (field: keyof NotificationSettingsInput) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }))
    setSuccessMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')

    const result = notificationSettingsSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      const zodError = result.error
      zodError.issues.forEach((issue) => {
        const path = issue.path[0]
        if (path) {
          fieldErrors[path as string] = issue.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    try {
      await onSave(formData)
      setSuccessMessage('Notification settings updated successfully')
    } catch {
      setErrors({ general: 'Failed to update notification settings. Please try again.' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successMessage && (
        <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
          {successMessage}
        </div>
      )}
      {errors.general && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {errors.general}
        </div>
      )}

      {/* General notifications */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">General</h3>
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <label className="text-sm">Email Notifications</label>
            <p className="text-xs text-muted-foreground">Receive notifications via email</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('emailNotifications')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              formData.emailNotifications ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.emailNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <label className="text-sm">Push Notifications</label>
            <p className="text-xs text-muted-foreground">Receive push notifications in browser</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('pushNotifications')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              formData.pushNotifications ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.pushNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="border-t my-6" />

      {/* Review notifications */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Reviews</h3>
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <label className="text-sm">Review Assignments</label>
            <p className="text-xs text-muted-foreground">When you are assigned to review code</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('reviewAssignments')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              formData.reviewAssignments ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.reviewAssignments ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <label className="text-sm">Review Comments</label>
            <p className="text-xs text-muted-foreground">When someone comments on your reviews</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('reviewComments')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              formData.reviewComments ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.reviewComments ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <label className="text-sm">Status Changes</label>
            <p className="text-xs text-muted-foreground">When review status is updated</p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('reviewStatusChanges')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              formData.reviewStatusChanges ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.reviewStatusChanges ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="border-t my-6" />

      {/* Digest notifications */}
      <div className="flex items-center justify-between py-2">
        <div className="space-y-0.5">
          <label className="text-sm">Weekly Digest</label>
          <p className="text-xs text-muted-foreground">Receive a weekly summary of activity</p>
        </div>
        <button
          type="button"
          onClick={() => handleToggle('weeklyDigest')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            formData.weeklyDigest ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              formData.weeklyDigest ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSaving}>
          Save Changes
        </Button>
      </div>
    </form>
  )
}

/**
 * Security settings section component
 */
interface SecuritySettingsProps {
  onPasswordChange: (data: PasswordChangeInput) => Promise<void>
  isSaving: boolean
}

function SecuritySettings({ onPasswordChange, isSaving }: SecuritySettingsProps) {
  const [formData, setFormData] = useState<PasswordChangeInput>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const handleChange = (field: keyof PasswordChangeInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
    setSuccessMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')

    const result = passwordChangeSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      const zodError = result.error
      zodError.issues.forEach((issue) => {
        const path = issue.path[0]
        if (path) {
          fieldErrors[path as string] = issue.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    try {
      await onPasswordChange(formData)
      setSuccessMessage('Password changed successfully')
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      if (error instanceof HttpError) {
        setErrors({ general: error.message || 'Failed to change password. Please try again.' })
      } else {
        setErrors({ general: 'Failed to change password. Please try again.' })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successMessage && (
        <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
          {successMessage}
        </div>
      )}
      {errors.general && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {errors.general}
        </div>
      )}

      <Input
        label="Current Password"
        type="password"
        value={formData.currentPassword}
        onChange={(e) => handleChange('currentPassword', e.target.value)}
        error={errors.currentPassword}
        placeholder="Enter current password"
      />

      <Input
        label="New Password"
        type="password"
        value={formData.newPassword}
        onChange={(e) => handleChange('newPassword', e.target.value)}
        error={errors.newPassword}
        placeholder="Enter new password"
        helperText="Must be at least 8 characters"
      />

      <Input
        label="Confirm New Password"
        type="password"
        value={formData.confirmPassword}
        onChange={(e) => handleChange('confirmPassword', e.target.value)}
        error={errors.confirmPassword}
        placeholder="Confirm new password"
      />

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSaving}>
          Change Password
        </Button>
      </div>
    </form>
  )
}

/**
 * Settings page component
 */
export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsInput>({
    emailNotifications: true,
    pushNotifications: true,
    reviewAssignments: true,
    reviewComments: true,
    reviewStatusChanges: true,
    weeklyDigest: false,
  })

  const handleProfileSave = useCallback(async (data: ProfileSettingsInput) => {
    setIsSaving(true)
    try {
      await axiosInstance.put<ApiResponse<User>>('/settings/profile', data)
      await refreshUser()
    } finally {
      setIsSaving(false)
    }
  }, [refreshUser])

  const handleNotificationSave = useCallback(async (data: NotificationSettingsInput) => {
    setIsSaving(true)
    try {
      await axiosInstance.put<ApiResponse<{ success: boolean }>>('/settings/notifications', data)
      setNotificationSettings(data)
    } finally {
      setIsSaving(false)
    }
  }, [])

  const handlePasswordChange = useCallback(async (data: PasswordChangeInput) => {
    setIsSaving(true)
    try {
      await axiosInstance.put<ApiResponse<{ success: boolean; message?: string }>>('/settings/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
    } finally {
      setIsSaving(false)
    }
  }, [])

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="h-4 w-4" /> },
  ]

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tabs sidebar */}
        <div className="w-full md:w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              {activeTab === 'profile' && (
                <>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>Manage your personal information</CardDescription>
                </>
              )}
              {activeTab === 'notifications' && (
                <>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Control how and when you receive notifications</CardDescription>
                </>
              )}
              {activeTab === 'security' && (
                <>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your password and security preferences</CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent>
              {activeTab === 'profile' && (
                <ProfileSettings
                  user={user}
                  onSave={handleProfileSave}
                  isSaving={isSaving}
                />
              )}
              {activeTab === 'notifications' && (
                <NotificationSettings
                  settings={notificationSettings}
                  onSave={handleNotificationSave}
                  isSaving={isSaving}
                />
              )}
              {activeTab === 'security' && (
                <SecuritySettings
                  onPasswordChange={handlePasswordChange}
                  isSaving={isSaving}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
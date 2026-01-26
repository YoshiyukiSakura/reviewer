'use client'

import { useState, useCallback } from 'react'
import { axiosInstance } from '@/lib/http'
import type { ApiResponse, User, NotificationSettings } from '@/types'
import type { ProfileSettingsInput, NotificationSettingsInput, PasswordChangeInput } from '@/lib/validators/settings'

/**
 * Result type for profile settings hook
 */
export interface UseProfileSettingsResult {
  profile: User | null
  isLoading: boolean
  error: string | null
  updateProfile: (data: ProfileSettingsInput) => Promise<void>
  refetch: () => Promise<void>
}

/**
 * Hook for managing user profile settings
 */
export function useProfileSettings(): UseProfileSettingsResult {
  const [profile, setProfile] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get<ApiResponse<User>>('/settings/profile')
      if (response.data.success && response.data.data) {
        setProfile(response.data.data)
      } else {
        setError(response.data.error || 'Failed to fetch profile')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (data: ProfileSettingsInput) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.put<ApiResponse<User>>('/settings/profile', data)
      if (response.data.success && response.data.data) {
        setProfile(response.data.data)
      } else {
        setError(response.data.error || 'Failed to update profile')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refetch: fetchProfile,
  }
}

/**
 * Result type for notification settings hook
 */
export interface UseNotificationSettingsResult {
  settings: NotificationSettings | null
  isLoading: boolean
  error: string | null
  updateSettings: (data: NotificationSettingsInput) => Promise<void>
  refetch: () => Promise<void>
}

/**
 * Hook for managing notification settings
 */
export function useNotificationSettings(): UseNotificationSettingsResult {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get<ApiResponse<NotificationSettings>>('/settings/notifications')
      if (response.data.success && response.data.data) {
        setSettings(response.data.data)
      } else {
        setError(response.data.error || 'Failed to fetch notification settings')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notification settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (data: NotificationSettingsInput) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.put<ApiResponse<NotificationSettings>>('/settings/notifications', data)
      if (response.data.success && response.data.data) {
        setSettings(response.data.data)
      } else {
        setError(response.data.error || 'Failed to update notification settings')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refetch: fetchSettings,
  }
}

/**
 * Result type for password change hook
 */
export interface UsePasswordChangeResult {
  isLoading: boolean
  error: string | null
  changePassword: (data: PasswordChangeInput) => Promise<boolean>
}

/**
 * Hook for changing password
 */
export function usePasswordChange(): UsePasswordChangeResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changePassword = useCallback(async (data: PasswordChangeInput): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.put<ApiResponse<{ success: boolean; message?: string }>>('/settings/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      if (response.data.success) {
        return true
      } else {
        setError(response.data.error || 'Failed to change password')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    error,
    changePassword,
  }
}
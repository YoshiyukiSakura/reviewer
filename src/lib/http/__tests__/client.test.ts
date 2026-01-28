import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import {
  axiosInstance,
  createAxiosInstance,
  HttpError,
  getAuthToken,
  setAuthToken,
} from '../client'
import * as config from '../config'

// Mock axios-mock-adapter
let mock: MockAdapter

describe('http/client', () => {
  beforeEach(() => {
    mock = new MockAdapter(axiosInstance)
  })

  afterEach(() => {
    mock.restore()
  })

  describe('createAxiosInstance', () => {
    it('should create an axios instance with correct config', () => {
      jest.spyOn(config, 'getHttpClientConfig').mockReturnValue({
        baseURL: 'http://test.example.com',
        timeout: 5000,
        withCredentials: true,
      })

      const instance = createAxiosInstance()

      expect(instance.defaults.baseURL).toBe('http://test.example.com')
      expect(instance.defaults.timeout).toBe(5000)
      expect(instance.defaults.withCredentials).toBe(true)
    })

    it('should return the same instance on multiple calls', () => {
      const instance1 = createAxiosInstance()
      const instance2 = createAxiosInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('request interceptor', () => {
    it('should add Authorization header when token exists', async () => {
      setAuthToken('test-token-123')

      mock.onGet('/test').reply(200, { success: true })

      await axiosInstance.get('/test')

      const request = mock.history.get[0]
      expect(request.headers?.Authorization).toBe('Bearer test-token-123')
    })

    it('should not add Authorization header when no token exists', async () => {
      setAuthToken(null)

      mock.onGet('/test').reply(200, { success: true })

      await axiosInstance.get('/test')

      const request = mock.history.get[0]
      expect(request.headers?.Authorization).toBeUndefined()
    })
  })

  describe('response interceptor', () => {
    it('should return data on successful request', async () => {
      mock.onGet('/test').reply(200, { data: 'test-data' })

      const response = await axiosInstance.get('/test')

      expect(response.data).toEqual({ data: 'test-data' })
    })

    it('should throw HttpError on 401 status', async () => {
      mock.onGet('/test').reply(401, { message: 'Unauthorized' })

      await expect(axiosInstance.get('/test')).rejects.toThrow(HttpError)
    })

    it('should throw HttpError on 404 status', async () => {
      mock.onGet('/test').reply(404, { message: 'Not found' })

      await expect(axiosInstance.get('/test')).rejects.toThrow(HttpError)
    })

    it('should throw HttpError on 500 status', async () => {
      mock.onGet('/test').reply(500, { message: 'Internal server error' })

      await expect(axiosInstance.get('/test')).rejects.toThrow(HttpError)
    })

    it('should extract error message from response data', async () => {
      mock.onGet('/test').reply(400, { error: 'Custom error message' })

      try {
        await axiosInstance.get('/test')
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError)
        if (error instanceof HttpError) {
          expect(error.message).toBe('Custom error message')
          expect(error.status).toBe(400)
        }
      }
    })

    it('should throw HttpError with network error message on no response', async () => {
      mock.onGet('/test').networkError()

      await expect(axiosInstance.get('/test')).rejects.toThrow()
    })
  })

  describe('HttpError', () => {
    it('should create error with status and message', () => {
      const error = new HttpError('Test error', 404)
      expect(error.message).toBe('Test error')
      expect(error.status).toBe(404)
      expect(error.name).toBe('HttpError')
    })

    it('should include data in error', () => {
      const errorData = { field: 'value' }
      const error = new HttpError('Test error', 400, errorData)
      expect(error.data).toEqual(errorData)
    })
  })

  describe('getAuthToken', () => {
    it('should return null when no token is set', () => {
      setAuthToken(null)
      expect(getAuthToken()).toBeNull()
    })

    it('should return token when set', () => {
      setAuthToken('my-token')
      expect(getAuthToken()).toBe('my-token')
    })
  })

  describe('setAuthToken', () => {
    it('should set token in localStorage', () => {
      setAuthToken('new-token')
      expect(getAuthToken()).toBe('new-token')
    })

    it('should remove token when set to null', () => {
      setAuthToken('test-token')
      setAuthToken(null)
      expect(getAuthToken()).toBeNull()
    })
  })
})

describe('http/config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getBaseURL', () => {
    it('should return API_BASE_URL when set', () => {
      process.env.API_BASE_URL = 'http://api.example.com'
      jest.isolateModules(() => {
        const { getBaseURL } = require('../config')
        expect(getBaseURL()).toBe('http://api.example.com')
      })
    })

    it('should return NEXT_PUBLIC_API_URL as fallback', () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://next-api.example.com'
      delete process.env.API_BASE_URL
      jest.isolateModules(() => {
        const { getBaseURL } = require('../config')
        expect(getBaseURL()).toBe('http://next-api.example.com')
      })
    })

    it('should return basePath + /api as default', () => {
      delete process.env.API_BASE_URL
      delete process.env.NEXT_PUBLIC_API_URL
      delete process.env.NEXT_PUBLIC_BASE_PATH
      jest.isolateModules(() => {
        const { getBaseURL } = require('../config')
        expect(getBaseURL()).toBe('/reviewer/api')
      })
    })
  })

  describe('getTimeout', () => {
    it('should return API_TIMEOUT when set', () => {
      process.env.API_TIMEOUT = '5000'
      jest.isolateModules(() => {
        const { getTimeout } = require('../config')
        expect(getTimeout()).toBe(5000)
      })
    })

    it('should return 10000 as default', () => {
      delete process.env.API_TIMEOUT
      jest.isolateModules(() => {
        const { getTimeout } = require('../config')
        expect(getTimeout()).toBe(10000)
      })
    })

    it('should return 10000 for invalid timeout', () => {
      process.env.API_TIMEOUT = 'invalid'
      jest.isolateModules(() => {
        const { getTimeout } = require('../config')
        expect(getTimeout()).toBe(10000)
      })
    })
  })

  describe('getWithCredentials', () => {
    it('should return true when set to "true"', () => {
      process.env.API_WITH_CREDENTIALS = 'true'
      jest.isolateModules(() => {
        const { getWithCredentials } = require('../config')
        expect(getWithCredentials()).toBe(true)
      })
    })

    it('should return false when set to "false"', () => {
      process.env.API_WITH_CREDENTIALS = 'false'
      jest.isolateModules(() => {
        const { getWithCredentials } = require('../config')
        expect(getWithCredentials()).toBe(false)
      })
    })

    it('should return false by default', () => {
      delete process.env.API_WITH_CREDENTIALS
      jest.isolateModules(() => {
        const { getWithCredentials } = require('../config')
        expect(getWithCredentials()).toBe(false)
      })
    })
  })
})
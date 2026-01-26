import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export interface TokenPayload extends JWTPayload {
  userId: string
  email?: string
  name?: string
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

export type VerifyResult = {
  valid: true
  payload: TokenPayload
} | {
  valid: false
  error: string
}

const getJwtSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

const getExpiresIn = (): string => {
  return process.env.JWT_EXPIRES_IN || '7d'
}

export async function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  const secret = getJwtSecret()
  const expiresIn = getExpiresIn()

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)

  return token
}

export async function verifyToken(token: string): Promise<VerifyResult> {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)

    if (!payload.userId || typeof payload.userId !== 'string') {
      return { valid: false, error: 'Invalid token payload: missing userId' }
    }

    return {
      valid: true,
      payload: payload as TokenPayload,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return { valid: false, error: 'Token has expired' }
      }
      if (error.message.includes('signature')) {
        return { valid: false, error: 'Invalid token signature' }
      }
      return { valid: false, error: error.message }
    }
    return { valid: false, error: 'Token verification failed' }
  }
}

export async function decodeToken(token: string): Promise<TokenPayload | null> {
  const result = await verifyToken(token)
  if (result.valid) {
    return result.payload
  }
  return null
}

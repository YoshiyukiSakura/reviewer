import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, type TokenPayload } from '@/lib/auth'
import { log } from '@/lib/remote-log'

async function getTokenPayload(request: Request): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  const result = await verifyToken(token)
  return result.valid ? result.payload : null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const testReport = await prisma.testReport.findUnique({
      where: { id },
    })

    if (!testReport) {
      return NextResponse.json(
        { error: 'Test report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(testReport)
  } catch (error) {
    log.error('Get test report error:', { error: String(error) })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getTokenPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existingReport = await prisma.testReport.findUnique({
      where: { id },
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Test report not found' },
        { status: 404 }
      )
    }

    await prisma.testReport.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Test report deleted successfully' })
  } catch (error) {
    log.error('Delete test report error:', { error: String(error) })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
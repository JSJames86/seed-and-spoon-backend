import { NextRequest, NextResponse } from 'next/server'
import { enrollInSequence } from '@/lib/sequence-service'
import { SEQUENCE_IDS, SequenceKey } from '@/lib/sequence-ids'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { subscriberId, sequenceKey, sequenceId: rawSequenceId, metadata } = body as Record<string, unknown>

  if (!subscriberId || typeof subscriberId !== 'string') {
    return NextResponse.json({ error: 'subscriberId is required' }, { status: 422 })
  }

  let sequenceId: string | undefined = rawSequenceId as string | undefined

  if (!sequenceId && sequenceKey) {
    sequenceId = SEQUENCE_IDS[sequenceKey as SequenceKey]
    if (!sequenceId) {
      return NextResponse.json(
        { error: `Unknown sequenceKey "${sequenceKey}". Valid keys: ${Object.keys(SEQUENCE_IDS).join(', ')}` },
        { status: 422 }
      )
    }
  }

  if (!sequenceId) {
    return NextResponse.json({ error: 'Either sequenceKey or sequenceId is required' }, { status: 422 })
  }

  try {
    const enrollment = await enrollInSequence({
      subscriberId,
      sequenceId,
      metadata: metadata as Record<string, unknown> | undefined,
    })
    return NextResponse.json({ success: true, enrollment }, { status: 200 })
  } catch (err) {
    console.error('[sequence/enroll] error:', err)
    return NextResponse.json({ error: 'Failed to enroll subscriber in sequence' }, { status: 500 })
  }
}

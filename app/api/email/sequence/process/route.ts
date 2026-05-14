import { NextRequest, NextResponse } from 'next/server'
import { processSequenceQueue } from '@/lib/sequence-service'

// This endpoint is called by a Vercel Cron job (see vercel.json crons config).
// It processes all active sequence enrollments whose next_send_at is in the past.
//
// Protect it with CRON_SECRET so only Vercel (or your scheduler) can trigger it.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processSequenceQueue()
    return NextResponse.json({ success: true, ...result }, { status: 200 })
  } catch (err) {
    console.error('[sequence/process] error:', err)
    return NextResponse.json({ error: 'Sequence processing failed' }, { status: 500 })
  }
}

// Allow POST too so it can be triggered manually from the dashboard
export async function POST(req: NextRequest) {
  return GET(req)
}

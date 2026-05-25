import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-service'
import { renderDonationReceiptEmail } from '@/emails/templates/donation'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, email, amount, donationType, date, transactionId } = body as Record<string, string>

  if (!name || !email || !amount || !donationType || !date || !transactionId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 })
  }

  const firstName = name.split(' ')[0]

  const html = await renderDonationReceiptEmail({
    firstName,
    amount: parseFloat(amount),
    donationType: donationType as 'one-time' | 'monthly',
    date,
    transactionId,
  })

  const result = await sendEmail({
    to: email,
    subject: 'Your donation receipt — Seed & Spoon',
    html,
    emailType: 'donation_receipt',
    metadata: { amount, donationType, transactionId },
  })

  if (!result.success) {
    console.error('[donate] receipt email failed:', result.error)
    return NextResponse.json({ error: 'Failed to send receipt' }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: result.messageId }, { status: 200 })
}

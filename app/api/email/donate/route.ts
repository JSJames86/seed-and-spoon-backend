import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/send-email'
import { renderDonateConfirmation, renderDonateAdminAlert } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, email, amount, message, recurring } = body as Record<string, unknown>

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 422 })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 422 })
  }
  if (amount === undefined || amount === null) {
    return NextResponse.json({ error: 'Amount is required' }, { status: 422 })
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 422 })
  }

  const isRecurring = recurring === true || recurring === 'true'
  const adminEmail = process.env.RESEND_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || 'hello@seedandspoon.org'

  try {
    await Promise.all([
      sendEmail({
        to: (email as string).toLowerCase().trim(),
        subject: 'Thank you for your gift — Seed & Spoon',
        html: renderDonateConfirmation({ name: (name as string).trim(), amount: numericAmount, recurring: isRecurring }),
      }),
      sendEmail({
        to: adminEmail,
        subject: `New donation from ${(name as string).trim()}`,
        html: renderDonateAdminAlert({
          name: (name as string).trim(),
          email: (email as string).toLowerCase().trim(),
          amount: numericAmount,
          message: typeof message === 'string' ? message.trim() : undefined,
          recurring: isRecurring,
        }),
      }),
    ])
  } catch (err) {
    console.error('[donate] email error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

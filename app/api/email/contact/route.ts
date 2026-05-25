import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/send-email'
import { renderContactConfirmation, renderContactAdminAlert } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, email, subject, message } = body as Record<string, string>

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 422 })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 422 })
  }
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return NextResponse.json({ error: 'Message is required' }, { status: 422 })
  }

  const adminEmail = process.env.RESEND_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || 'hello@seedandspoon.org'

  try {
    await Promise.all([
      sendEmail({
        to: email.toLowerCase().trim(),
        subject: 'We received your message — Seed & Spoon',
        html: renderContactConfirmation({ name: name.trim(), message: message.trim() }),
      }),
      sendEmail({
        to: adminEmail,
        subject: `Contact form: ${subject?.trim() || '(no subject)'}`,
        html: renderContactAdminAlert({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          subject: subject?.trim(),
          message: message.trim(),
        }),
      }),
    ])
  } catch (err) {
    console.error('[contact] email error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

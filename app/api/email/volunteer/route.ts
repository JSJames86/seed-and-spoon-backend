import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/send-email'
import { renderVolunteerConfirmation, renderVolunteerAdminAlert } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, email, phone, availability, interests } = body as Record<string, string>

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 422 })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 422 })
  }

  const adminEmail = process.env.RESEND_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || 'hello@seedandspoon.org'

  try {
    await Promise.all([
      sendEmail({
        to: email.toLowerCase().trim(),
        subject: 'Thanks for your interest in volunteering — Seed & Spoon',
        html: renderVolunteerConfirmation({ name: name.trim() }),
      }),
      sendEmail({
        to: adminEmail,
        subject: `New volunteer interest from ${name.trim()}`,
        html: renderVolunteerAdminAlert({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone?.trim(),
          availability: availability?.trim(),
          interests: interests?.trim(),
        }),
      }),
    ])
  } catch (err) {
    console.error('[volunteer] email error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

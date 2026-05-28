import { NextRequest, NextResponse } from 'next/server'
import { renderDonationReceiptEmail } from '@/emails/templates/donation'
import { Resend } from 'resend'

// Temporary test-only route — remove after email preview is confirmed
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.TEST_RECEIPT_SECRET && secret !== 'seed-spoon-test-2025') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const to = req.nextUrl.searchParams.get('to') || 'janelle.shanise@gmail.com'

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const resend = new Resend(apiKey)

  const html = await renderDonationReceiptEmail({
    firstName: 'Janelle',
    amount: 25,
    donationType: 'one-time',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    transactionId: 'TEST-RECEIPT-PREVIEW',
  })

  const from = `${process.env.RESEND_FROM_NAME || 'Seed & Spoon'} <${process.env.RESEND_FROM_EMAIL || 'hello@seedandspoon.org'}>`

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'Your donation receipt — Seed & Spoon [TEST]',
    html,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, to, messageId: data!.id })
}

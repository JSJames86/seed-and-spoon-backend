/**
 * Sends a test donation receipt to a given email address.
 * Run with: bun scripts/send-test-receipt.ts [email]
 * Requires RESEND_API_KEY in .env.local
 */
import { renderDonationReceiptEmail } from '../emails/templates/donation'
import { Resend } from 'resend'

const to = process.argv[2] || 'janelle.shanise@gmail.com'

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  console.error('❌  RESEND_API_KEY not set. Add it to .env.local')
  process.exit(1)
}

const resend = new Resend(apiKey)

const html = await renderDonationReceiptEmail({
  firstName: 'Janelle',
  amount: 25,
  donationType: 'one-time',
  date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  transactionId: 'TEST-RECEIPT-PREVIEW',
})

const from =
  `${process.env.RESEND_FROM_NAME || 'Seed & Spoon'} <${process.env.RESEND_FROM_EMAIL || 'hello@seedandspoon.org'}>`

const { data, error } = await resend.emails.send({
  from,
  to,
  subject: 'Your donation receipt — Seed & Spoon [TEST]',
  html,
})

if (error) {
  console.error('❌  Failed to send:', error.message)
  process.exit(1)
}

console.log(`✅  Test receipt sent to ${to} (id: ${data!.id})`)

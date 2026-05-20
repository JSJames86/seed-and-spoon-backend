import { sendEmail } from './email-service'

const ORG_NAME = 'Seed & Spoon'
const ORG_EIN = process.env.ORG_EIN || ''

/**
 * Formats a dollar amount as a USD string (e.g. 25 → "$25.00")
 */
function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

/**
 * Formats a date as "Month Day, Year" from an ISO string or timestamp
 */
function formatDate(isoStringOrMs) {
  return new Date(isoStringOrMs).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Build the IRS-compliant substantiation paragraph required for gifts ≥ $250.
 * IRS Publication 1771 requires the organization to state whether goods or
 * services were provided in exchange for the contribution.
 */
function irsReceiptParagraph(amount, donationDate) {
  if (amount < 250) return ''

  const einLine = ORG_EIN ? `Our EIN is ${ORG_EIN}.` : ''

  return `
    <div style="margin:24px 0;padding:16px;background:#f9f9f9;border-left:4px solid #2d6a4f;font-size:13px;color:#444;">
      <strong>Tax Receipt — IRS Substantiation (26 U.S.C. § 170)</strong><br><br>
      ${ORG_NAME} is a 501(c)(3) nonprofit organization. ${einLine}
      Your contribution of <strong>${formatAmount(amount)}</strong> on ${formatDate(donationDate)}
      is tax-deductible to the full extent allowed by law.
      No goods or services were provided to you in exchange for this contribution.
      Please retain this receipt for your tax records.
    </div>
  `
}

/**
 * Send a donation confirmation email to the donor.
 *
 * @param {object} params
 * @param {string} params.donorEmail
 * @param {string} [params.donorName]
 * @param {number} params.amount  - dollars (not cents)
 * @param {string} params.currency
 * @param {string} params.paymentIntentId
 * @param {string|number} params.donationDate - ISO string or Unix timestamp (ms)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendDonationConfirmation({
  donorEmail,
  donorName,
  amount,
  currency = 'usd',
  paymentIntentId,
  donationDate,
}) {
  const greeting = donorName ? `Hi ${donorName},` : 'Hi there,'
  const formattedAmount = formatAmount(amount)
  const formattedDate = formatDate(donationDate)
  const receiptBlock = irsReceiptParagraph(amount, donationDate)

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#222;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#2d6a4f;margin:0;">${ORG_NAME}</h1>
      </div>

      <p style="font-size:16px;">${greeting}</p>
      <p style="font-size:16px;">
        Thank you for your generous donation of <strong>${formattedAmount}</strong> to ${ORG_NAME}.
        Your support helps us fight food insecurity in our community.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
        <tr style="background:#f0f7f4;">
          <td style="padding:10px 14px;font-weight:bold;">Amount</td>
          <td style="padding:10px 14px;">${formattedAmount} ${currency.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Date</td>
          <td style="padding:10px 14px;">${formattedDate}</td>
        </tr>
        <tr style="background:#f0f7f4;">
          <td style="padding:10px 14px;font-weight:bold;">Transaction ID</td>
          <td style="padding:10px 14px;font-family:monospace;">${paymentIntentId}</td>
        </tr>
      </table>

      ${receiptBlock}

      <p style="font-size:14px;color:#555;">
        If you have questions about your donation, please reply to this email or
        contact us at <a href="mailto:${process.env.RESEND_FROM_EMAIL}" style="color:#2d6a4f;">
        ${process.env.RESEND_FROM_EMAIL}</a>.
      </p>

      <p style="font-size:14px;">With gratitude,<br><strong>The ${ORG_NAME} Team</strong></p>
    </body>
    </html>
  `

  return sendEmail({
    to: donorEmail,
    subject: `Your donation to ${ORG_NAME} — ${formattedAmount} received`,
    html,
    emailType: 'donation_confirmation',
    metadata: { paymentIntentId, amount, currency },
  })
}

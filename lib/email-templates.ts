// ── Contact ────────────────────────────────────────────────────────────────

export function renderContactConfirmation({ name, message }: { name: string; message: string }): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2d6a4f">Hi ${name}, we got your message!</h2>
      <p>Thanks for reaching out to Seed &amp; Spoon. We'll get back to you within 1–2 business days.</p>
      <blockquote style="border-left:3px solid #2d6a4f;margin:16px 0;padding:8px 16px;color:#555">
        ${message}
      </blockquote>
      <p style="color:#888;font-size:13px">— The Seed &amp; Spoon Team</p>
    </div>
  `
}

export function renderContactAdminAlert({
  name,
  email,
  subject,
  message,
}: {
  name: string
  email: string
  subject?: string
  message: string
}): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2>New contact form submission</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;font-weight:bold">Name</td><td>${name}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Email</td><td>${email}</td></tr>
        ${subject ? `<tr><td style="padding:6px 0;font-weight:bold">Subject</td><td>${subject}</td></tr>` : ''}
        <tr><td style="padding:6px 0;font-weight:bold;vertical-align:top">Message</td><td>${message}</td></tr>
      </table>
    </div>
  `
}

// ── Volunteer ──────────────────────────────────────────────────────────────

export function renderVolunteerConfirmation({ name }: { name: string }): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2d6a4f">Thanks for volunteering, ${name}!</h2>
      <p>We're so excited to have you join the Seed &amp; Spoon community. A member of our team will be in touch soon with next steps.</p>
      <p style="color:#888;font-size:13px">— The Seed &amp; Spoon Team</p>
    </div>
  `
}

export function renderVolunteerAdminAlert({
  name,
  email,
  phone,
  availability,
  interests,
}: {
  name: string
  email: string
  phone?: string
  availability?: string
  interests?: string
}): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2>New volunteer interest</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;font-weight:bold">Name</td><td>${name}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Email</td><td>${email}</td></tr>
        ${phone ? `<tr><td style="padding:6px 0;font-weight:bold">Phone</td><td>${phone}</td></tr>` : ''}
        ${availability ? `<tr><td style="padding:6px 0;font-weight:bold">Availability</td><td>${availability}</td></tr>` : ''}
        ${interests ? `<tr><td style="padding:6px 0;font-weight:bold">Interests</td><td>${interests}</td></tr>` : ''}
      </table>
    </div>
  `
}

// ── Donate ─────────────────────────────────────────────────────────────────

export function renderDonateConfirmation({
  name,
  amount,
  recurring,
}: {
  name: string
  amount: string | number
  recurring?: boolean
}): string {
  const formattedAmount = typeof amount === 'number' ? `$${amount.toFixed(2)}` : amount
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2d6a4f">Thank you, ${name}!</h2>
      <p>Your ${recurring ? 'recurring ' : ''}gift of <strong>${formattedAmount}</strong> makes a real difference for the Seed &amp; Spoon community.</p>
      <p>We're deeply grateful for your generosity and support.</p>
      <p style="color:#888;font-size:13px">— The Seed &amp; Spoon Team</p>
    </div>
  `
}

export function renderDonateAdminAlert({
  name,
  email,
  amount,
  message,
  recurring,
}: {
  name: string
  email: string
  amount: string | number
  message?: string
  recurring?: boolean
}): string {
  const formattedAmount = typeof amount === 'number' ? `$${amount.toFixed(2)}` : amount
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2>New donation received</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;font-weight:bold">Name</td><td>${name}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Email</td><td>${email}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Amount</td><td>${formattedAmount}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Recurring</td><td>${recurring ? 'Yes' : 'No'}</td></tr>
        ${message ? `<tr><td style="padding:6px 0;font-weight:bold;vertical-align:top">Message</td><td>${message}</td></tr>` : ''}
      </table>
    </div>
  `
}

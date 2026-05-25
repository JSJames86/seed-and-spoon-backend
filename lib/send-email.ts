import { getResend } from './resend'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions): Promise<{ id: string }> {
  const resend = getResend()
  const sender =
    from ??
    `${process.env.RESEND_FROM_NAME || 'Seed & Spoon'} <${process.env.RESEND_FROM_EMAIL || 'hello@seedandspoon.org'}>`

  const { data, error } = await resend.emails.send({ from: sender, to, subject, html })
  if (error) throw new Error(error.message)
  return data!
}

import webpush from 'web-push'
import { supabase } from './supabaseClient'

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@seedandspoon.org'

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variables')
  }

  return { publicKey, privateKey, subject }
}

export function getVapidPublicKey(): string {
  return getVapidConfig().publicKey
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body?: string; data?: Record<string, unknown> }
): Promise<{ sent: number; failed: number }> {
  const { publicKey, privateKey, subject } = getVapidConfig()
  webpush.setVapidDetails(subject, publicKey, privateKey)

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error || !subscriptions?.length) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        sent++
      } catch (err: unknown) {
        failed++
        // Remove expired/invalid subscriptions (410 Gone)
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    })
  )

  return { sent, failed }
}

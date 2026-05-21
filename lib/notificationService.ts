import { supabase } from './supabaseClient'
import { sendEmail } from './email-service'
import { sendPushToUser } from './pushService'

type NotificationChannel = 'in_app' | 'email' | 'push'

export interface CreateNotificationOptions {
  userId: string
  type: 'donation' | 'message' | 'mention' | 'system' | 'grant' | 'volunteer' | 'partner'
  title: string
  body?: string
  data?: Record<string, unknown>
  channels?: NotificationChannel[]
  emailHtml?: string
  emailTo?: string
}

export async function createNotification(options: CreateNotificationOptions) {
  const {
    userId,
    type,
    title,
    body,
    data = {},
    channels = ['in_app'],
    emailHtml,
    emailTo,
  } = options

  // Always insert into notifications table for in_app and as a record
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, title, body, data, channels })
    .select()
    .single()

  if (error) {
    console.error('Failed to create notification:', error)
    return { success: false, error: error.message }
  }

  const dispatches: Promise<unknown>[] = []

  if (channels.includes('email') && emailHtml && emailTo) {
    dispatches.push(
      sendEmail({ to: emailTo, subject: title, html: emailHtml }).then(async (result) => {
        if (result.success) {
          await supabase
            .from('notifications')
            .update({ sent_at: new Date().toISOString() })
            .eq('id', notification.id)
        }
      })
    )
  }

  if (channels.includes('push')) {
    dispatches.push(
      sendPushToUser(userId, { title, body, data }).then(async ({ sent }) => {
        if (sent > 0) {
          await supabase
            .from('notifications')
            .update({ sent_at: new Date().toISOString() })
            .eq('id', notification.id)
        }
      })
    )
  }

  await Promise.allSettled(dispatches)

  return { success: true, notification }
}

export async function notifyChannelMembers(
  channelId: string,
  excludeUserId: string,
  options: Omit<CreateNotificationOptions, 'userId'>
) {
  const { data: members, error } = await supabase
    .from('channel_members')
    .select('user_id')
    .eq('channel_id', channelId)
    .neq('user_id', excludeUserId)

  if (error || !members?.length) return

  await Promise.allSettled(
    members.map((m) => createNotification({ ...options, userId: m.user_id }))
  )
}

import { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClientFrontend'

export type Message = {
  id: string
  channel_id: string
  sender_id: string
  content: string
  attachments: unknown[]
  reply_to: string | null
  edited_at: string | null
  deleted_at: string | null
  created_at: string
}

export type ChannelMember = {
  id: string
  channel_id: string
  user_id: string
  last_read_at: string
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown>
  channels: string[]
  read_at: string | null
  sent_at: string | null
  created_at: string
}

export function subscribeToMessages(
  channelId: string,
  onInsert: (message: Message) => void,
  onUpdate?: (message: Message) => void
): RealtimeChannel {
  const supabase = getSupabaseClient()

  return supabase
    .channel(`messages:${channelId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      (payload) => onUpdate?.(payload.new as Message)
    )
    .subscribe()
}

export function subscribeToChannelMembers(
  channelId: string,
  onInsert: (member: ChannelMember) => void,
  onDelete?: (member: Partial<ChannelMember>) => void
): RealtimeChannel {
  const supabase = getSupabaseClient()

  return supabase
    .channel(`members:${channelId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'channel_members', filter: `channel_id=eq.${channelId}` },
      (payload) => onInsert(payload.new as ChannelMember)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'channel_members', filter: `channel_id=eq.${channelId}` },
      (payload) => onDelete?.(payload.old as Partial<ChannelMember>)
    )
    .subscribe()
}

export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: Notification) => void
): RealtimeChannel {
  const supabase = getSupabaseClient()

  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as Notification)
    )
    .subscribe()
}

export function unsubscribe(channel: RealtimeChannel): void {
  getSupabaseClient().removeChannel(channel)
}

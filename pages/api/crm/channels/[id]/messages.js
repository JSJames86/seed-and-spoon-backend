import { requireAuth, getUserId } from '../../../../../lib/authMiddleware'
import { supabase } from '../../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../../lib/errorResponses'
import { notifyChannelMembers } from '../../../../../lib/notificationService'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function assertMember(channelId, userId) {
  const { data } = await supabase
    .from('channel_members')
    .select('id')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .single()
  return !!data
}

async function handleGet(req, res) {
  const { id } = req.query
  const { limit = 50, before } = req.query
  const userId = getUserId(req)

  try {
    const isMember = await assertMember(id, userId)
    if (!isMember) return Errors.forbidden(res, 'Not a member of this channel')

    let query = supabase
      .from('messages')
      .select('*')
      .eq('channel_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(Number(limit))

    if (before) query = query.lt('created_at', before)

    const { data, error } = await query
    if (error) return Errors.databaseError(res, error.message)

    // Update last_read_at
    await supabase
      .from('channel_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', id)
      .eq('user_id', userId)

    return sendSuccess(res, data.reverse())
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

async function handlePost(req, res) {
  const { id } = req.query
  const userId = getUserId(req)
  const { content, attachments, reply_to } = req.body

  if (!content?.trim()) return Errors.missingField(res, 'content')

  try {
    const isMember = await assertMember(id, userId)
    if (!isMember) return Errors.forbidden(res, 'Not a member of this channel')

    const { data, error } = await supabase
      .from('messages')
      .insert({ channel_id: id, sender_id: userId, content: content.trim(), attachments, reply_to })
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)

    // Notify other channel members in the background
    const { data: channel } = await supabase
      .from('channels')
      .select('name')
      .eq('id', id)
      .single()

    notifyChannelMembers(id, userId, {
      type: 'message',
      title: `New message in #${channel?.name ?? 'channel'}`,
      body: data.content.slice(0, 100),
      data: { channel_id: id, message_id: data.id },
      channels: ['in_app', 'push'],
    }).catch(() => {})

    return sendSuccess(res, data, 201)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

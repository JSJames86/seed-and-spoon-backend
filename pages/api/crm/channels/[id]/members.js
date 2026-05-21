import { requireAuth, getUserId } from '../../../../../lib/authMiddleware'
import { hasCrmRole } from '../../../../../lib/crmAuth'
import { supabase } from '../../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  if (req.method === 'DELETE') return handleDelete(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST', 'DELETE'])
}

async function handleGet(req, res) {
  const { id } = req.query
  const userId = getUserId(req)

  try {
    const { data: membership } = await supabase
      .from('channel_members')
      .select('id')
      .eq('channel_id', id)
      .eq('user_id', userId)
      .single()

    if (!membership) return Errors.forbidden(res, 'Not a member of this channel')

    const { data, error } = await supabase
      .from('channel_members')
      .select('*')
      .eq('channel_id', id)
      .order('created_at')

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

async function handlePost(req, res) {
  const isStaff = await hasCrmRole(req, ['admin', 'staff'])
  if (!isStaff) return Errors.forbidden(res, 'Admin or staff CRM role required')

  const { id } = req.query
  const { user_id } = req.body
  if (!user_id) return Errors.missingField(res, 'user_id')

  try {
    const { data, error } = await supabase
      .from('channel_members')
      .upsert({ channel_id: id, user_id }, { onConflict: 'channel_id,user_id' })
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

async function handleDelete(req, res) {
  const userId = getUserId(req)
  const { id } = req.query
  const { user_id } = req.body

  // Users can remove themselves; staff/admin can remove anyone
  const targetUserId = user_id || userId
  if (targetUserId !== userId) {
    const isStaff = await hasCrmRole(req, ['admin', 'staff'])
    if (!isStaff) return Errors.forbidden(res, 'Admin or staff CRM role required')
  }

  try {
    const { error } = await supabase
      .from('channel_members')
      .delete()
      .eq('channel_id', id)
      .eq('user_id', targetUserId)

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, { removed: true })
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

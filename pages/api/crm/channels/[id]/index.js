import { requireAuth, getUserId } from '../../../../../lib/authMiddleware'
import { hasCrmRole } from '../../../../../lib/crmAuth'
import { supabase } from '../../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'PUT') return handlePut(req, res)
  if (req.method === 'DELETE') return handleDelete(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'PUT', 'DELETE'])
}

async function handleGet(req, res) {
  const { id } = req.query
  const userId = getUserId(req)

  try {
    const { data, error } = await supabase
      .from('channels')
      .select(`*, channel_members(user_id, last_read_at)`)
      .eq('id', id)
      .single()

    if (error) return Errors.databaseError(res, error.message)
    if (!data) return Errors.notFound(res, 'Channel')

    const isMember = data.channel_members?.some(m => m.user_id === userId)
    if (!isMember && data.type !== 'public') return Errors.forbidden(res)

    return sendSuccess(res, data)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

async function handlePut(req, res) {
  const isStaff = await hasCrmRole(getUserId(req), ['admin', 'staff'])
  if (!isStaff) return Errors.forbidden(res, 'Admin or staff CRM role required')

  const { id } = req.query
  const { name, description, type, allowed_roles } = req.body

  try {
    const { data, error } = await supabase
      .from('channels')
      .update({ name, description, type, allowed_roles, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    if (!data) return Errors.notFound(res, 'Channel')
    return sendSuccess(res, data)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

async function handleDelete(req, res) {
  const isAdmin = await hasCrmRole(getUserId(req), 'admin')
  if (!isAdmin) return Errors.forbidden(res, 'Admin CRM role required')

  const { id } = req.query

  try {
    const { error } = await supabase.from('channels').delete().eq('id', id)
    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, { deleted: true })
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

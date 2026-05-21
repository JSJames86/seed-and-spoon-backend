import { requireAuth, getUserId } from '../../../../lib/authMiddleware'
import { hasCrmRole } from '../../../../lib/crmAuth'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function handleGet(req, res) {
  const { user_id } = req.query

  try {
    const query = supabase
      .from('crm_user_roles')
      .select('*, assigned_by_user:assigned_by(id, email)')
      .order('created_at', { ascending: false })

    if (user_id) query.eq('user_id', user_id)

    const { data, error } = await query
    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

async function handlePost(req, res) {
  const isAdmin = await hasCrmRole(getUserId(req), 'admin')
  if (!isAdmin) return Errors.forbidden(res, 'Admin CRM role required')

  const { user_id, role } = req.body
  if (!user_id || !role) return Errors.missingField(res, 'user_id and role')

  try {
    const { data, error } = await supabase
      .from('crm_user_roles')
      .upsert({ user_id, role, assigned_by: getUserId(req) }, { onConflict: 'user_id,role' })
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

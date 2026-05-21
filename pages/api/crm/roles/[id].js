import { requireAuth, getUserId } from '../../../../lib/authMiddleware'
import { hasCrmRole } from '../../../../lib/crmAuth'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'DELETE') return handleDelete(req, res)
  return Errors.methodNotAllowed(res, ['DELETE'])
}

async function handleDelete(req, res) {
  const isAdmin = await hasCrmRole(getUserId(req), 'admin')
  if (!isAdmin) return Errors.forbidden(res, 'Admin CRM role required')

  const { id } = req.query

  try {
    const { error } = await supabase
      .from('crm_user_roles')
      .delete()
      .eq('id', id)

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, { deleted: true })
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

/**
 * Admin Role Assignment Management
 * PUT: Update a role assignment (activate/deactivate)
 * DELETE: Remove a role assignment
 */
import { requireStaff } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PUT') {
    return handlePut(req, res, id)
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, id)
  }
  return Errors.methodNotAllowed(res, ['PUT', 'DELETE'])
}

async function handlePut(req, res, id) {
  const { is_active, notes } = req.body

  try {
    const { data, error } = await supabase
      .from('role_assignments')
      .update({ is_active, notes })
      .eq('id', id)
      .select('*, roles(name)')
      .single()

    if (error) return Errors.databaseError(res, error.message)
    if (!data) return Errors.notFound(res, 'Role assignment')
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handleDelete(req, res, id) {
  try {
    const { error } = await supabase
      .from('role_assignments')
      .delete()
      .eq('id', id)

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, { deleted: true })
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireStaff(handler)

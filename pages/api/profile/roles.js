/**
 * User Roles API - Get current user's roles
 * GET: Returns all active roles for the authenticated user
 */
import { requireAuth, getUserId } from '../../../lib/authMiddleware'
import { supabase } from '../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return Errors.methodNotAllowed(res, ['GET'])
  }

  try {
    const userId = getUserId(req)

    const { data, error } = await supabase
      .from('role_assignments')
      .select('*, roles(name, description)')
      .eq('profile_id', userId)
      .eq('is_active', true)

    if (error) return Errors.databaseError(res, error.message)

    const roles = data.map(ra => ({
      id: ra.id,
      name: ra.roles?.name,
      description: ra.roles?.description,
      assigned_at: ra.assigned_at
    }))

    return sendSuccess(res, { roles })
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

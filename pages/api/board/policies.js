/**
 * Board Policies API (self-service view)
 * GET: View policies accessible to the user's roles
 */
import { requireAuth, getUserId, getUserRoles } from '../../../lib/authMiddleware'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return Errors.methodNotAllowed(res, ['GET'])
  }

  const roles = getUserRoles(req.user, req.profile)
  const { policy_type, category } = req.query

  try {
    // Determine visibility levels this user can access
    const visibilityLevels = ['public']
    if (roles.length > 0) visibilityLevels.push('all_roles')
    if (roles.some(r => ['employee', 'executive_director', 'admin'].includes(r))) {
      visibilityLevels.push('employees')
    }
    if (roles.some(r => ['board_member', 'executive_director', 'admin'].includes(r))) {
      visibilityLevels.push('board_only')
    }

    let query = req.supabase
      .from('policies')
      .select('*')
      .in('visibility', visibilityLevels)
      .eq('status', 'active')
      .order('title')

    if (policy_type) query = query.eq('policy_type', policy_type)
    if (category) query = query.eq('category', category)

    const { data, error } = await query

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

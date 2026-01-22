/**
 * Admin Roles Management API
 * GET: List all roles and assignments
 * POST: Assign a role to a user
 */
import { requireStaff, getUserId } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  }
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function handleGet(req, res) {
  const { profile_id } = req.query

  try {
    if (profile_id) {
      // Get roles for a specific user
      const { data, error } = await supabase
        .from('role_assignments')
        .select('*, roles(name, description)')
        .eq('profile_id', profile_id)
        .eq('is_active', true)

      if (error) return Errors.databaseError(res, error.message)
      return sendSuccess(res, data)
    }

    // List all roles
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, roles)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const { profile_id, role_name, notes } = req.body

  if (!profile_id || !role_name) {
    return Errors.missingField(res, 'profile_id and role_name are required')
  }

  try {
    // Look up the role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role_name)
      .single()

    if (roleError || !role) {
      return res.status(404).json({ success: false, error: `Role '${role_name}' not found` })
    }

    // Create the assignment
    const { data, error } = await supabase
      .from('role_assignments')
      .upsert({
        profile_id,
        role_id: role.id,
        assigned_by: getUserId(req),
        is_active: true,
        notes
      }, { onConflict: 'profile_id,role_id' })
      .select('*, roles(name)')
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireStaff(handler)

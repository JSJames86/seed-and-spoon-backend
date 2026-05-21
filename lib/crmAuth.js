import { supabase } from './supabaseClient'

export async function getCrmRoles(userId) {
  const { data, error } = await supabase
    .from('crm_user_roles')
    .select('role')
    .eq('user_id', userId)

  if (error || !data) return []
  return data.map(r => r.role)
}

export async function hasCrmRole(userId, roles) {
  const userRoles = await getCrmRoles(userId)
  const roleList = Array.isArray(roles) ? roles : [roles]
  return roleList.some(r => userRoles.includes(r))
}

export async function requireCrmRole(roles, handler) {
  return async (req, res) => {
    const allowed = await hasCrmRole(req.user.id, roles)
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Insufficient CRM role' })
    }
    return handler(req, res)
  }
}

import { supabase } from './supabaseClient'

export async function getCrmRoles(userId) {
  const { data, error } = await supabase
    .from('crm_user_roles')
    .select('role')
    .eq('user_id', userId)

  if (error || !data) return []
  return data.map(r => r.role)
}

// Use profile.crmRoles if already loaded by auth middleware, otherwise query DB
export async function hasCrmRole(userIdOrReq, roles) {
  const roleList = Array.isArray(roles) ? roles : [roles]

  if (userIdOrReq && typeof userIdOrReq === 'object' && userIdOrReq.profile?.crmRoles) {
    return roleList.some(r => userIdOrReq.profile.crmRoles.includes(r))
  }

  const userId = typeof userIdOrReq === 'string' ? userIdOrReq : userIdOrReq?.user?.id
  if (!userId) return false

  const userRoles = await getCrmRoles(userId)
  return roleList.some(r => userRoles.includes(r))
}

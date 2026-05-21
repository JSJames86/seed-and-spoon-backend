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
  const userId = getUserId(req)

  try {
    // Return public channels + channels the user is a member of
    const { data, error } = await supabase
      .from('channels')
      .select(`
        *,
        channel_members!inner(user_id, last_read_at)
      `)
      .eq('channel_members.user_id', userId)
      .order('name')

    // Also fetch public channels not yet joined
    const { data: publicChannels, error: pubError } = await supabase
      .from('channels')
      .select('*')
      .eq('type', 'public')
      .order('name')

    if (error && pubError) return Errors.databaseError(res, error.message)

    // Merge, deduplicate by id
    const memberChannels = data || []
    const allPublic = publicChannels || []
    const memberIds = new Set(memberChannels.map(c => c.id))
    const combined = [
      ...memberChannels,
      ...allPublic.filter(c => !memberIds.has(c.id))
    ]

    return sendSuccess(res, combined)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

async function handlePost(req, res) {
  const userId = getUserId(req)
  const isStaff = await hasCrmRole(userId, ['admin', 'staff'])
  if (!isStaff) return Errors.forbidden(res, 'Admin or staff CRM role required')

  const { name, description, type = 'public', allowed_roles = [] } = req.body
  if (!name) return Errors.missingField(res, 'name')

  try {
    const { data, error } = await supabase
      .from('channels')
      .insert({ name, description, type, allowed_roles, created_by: userId })
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)

    // Auto-add creator as member
    await supabase
      .from('channel_members')
      .insert({ channel_id: data.id, user_id: userId })

    return sendSuccess(res, data, 201)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

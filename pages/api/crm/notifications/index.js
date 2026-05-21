import { requireAuth, getUserId } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  return Errors.methodNotAllowed(res, ['GET'])
}

async function handleGet(req, res) {
  const userId = getUserId(req)
  const { unread_only, limit = 50, offset = 0 } = req.query

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit))
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (unread_only === 'true') query = query.is('read_at', null)

    const { data, error, count } = await query
    if (error) return Errors.databaseError(res, error.message)

    return sendSuccess(res, { notifications: data, count })
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

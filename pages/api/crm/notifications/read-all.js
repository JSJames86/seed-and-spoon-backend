import { requireAuth, getUserId } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'PUT') return handlePut(req, res)
  return Errors.methodNotAllowed(res, ['PUT'])
}

async function handlePut(req, res) {
  const userId = getUserId(req)

  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
      .select('id')

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, { marked_read: data?.length ?? 0 })
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

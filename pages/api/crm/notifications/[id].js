import { requireAuth, getUserId } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'PUT') return handlePut(req, res)
  return Errors.methodNotAllowed(res, ['PUT'])
}

async function handlePut(req, res) {
  const { id } = req.query
  const userId = getUserId(req)

  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    if (!data) return Errors.notFound(res, 'Notification')
    return sendSuccess(res, data)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

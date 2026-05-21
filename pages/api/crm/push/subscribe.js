import { requireAuth, getUserId } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { getVapidPublicKey } from '../../../../lib/pushService'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  if (req.method === 'DELETE') return handleDelete(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST', 'DELETE'])
}

async function handleGet(req, res) {
  try {
    const publicKey = getVapidPublicKey()
    return sendSuccess(res, { vapidPublicKey: publicKey })
  } catch {
    return Errors.internalError(res, 'Push notifications not configured')
  }
}

async function handlePost(req, res) {
  const userId = getUserId(req)
  const { endpoint, p256dh, auth, userAgent } = req.body

  if (!endpoint || !p256dh || !auth) {
    return Errors.missingField(res, 'endpoint, p256dh, and auth')
  }

  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, endpoint, p256dh, auth, user_agent: userAgent },
        { onConflict: 'user_id,endpoint' }
      )
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

async function handleDelete(req, res) {
  const userId = getUserId(req)
  const { endpoint } = req.body

  if (!endpoint) return Errors.missingField(res, 'endpoint')

  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, { unsubscribed: true })
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

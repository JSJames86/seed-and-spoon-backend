/**
 * Recurring Donations API
 * GET: List user's recurring donations
 * POST: Create a recurring donation
 * PUT: Update (pause/resume/cancel) a recurring donation
 */
import { requireAuth, getUserId } from '../../../lib/authMiddleware'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  if (req.method === 'PUT') return handlePut(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST', 'PUT'])
}

async function handleGet(req, res) {
  const userId = getUserId(req)

  try {
    const { data, error } = await req.supabase
      .from('recurring_donations')
      .select('*, donors(name, email)')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const userId = getUserId(req)
  const { donor_id, amount, frequency, stripe_subscription_id } = req.body

  if (!donor_id || !amount || !frequency) {
    return Errors.missingField(res, 'donor_id, amount, and frequency are required')
  }

  const validFrequencies = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually']
  if (!validFrequencies.includes(frequency)) {
    return Errors.invalidInput(res, `frequency must be one of: ${validFrequencies.join(', ')}`)
  }

  try {
    const { data, error } = await req.supabase
      .from('recurring_donations')
      .insert({
        donor_id,
        profile_id: userId,
        amount,
        frequency,
        stripe_subscription_id,
        status: 'active'
      })
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePut(req, res) {
  const userId = getUserId(req)
  const { id, action } = req.body // action: 'pause', 'resume', 'cancel'

  if (!id || !action) {
    return Errors.missingField(res, 'id and action are required')
  }

  try {
    const updates = {}
    if (action === 'pause') {
      updates.status = 'paused'
      updates.paused_at = new Date().toISOString()
    } else if (action === 'resume') {
      updates.status = 'active'
      updates.paused_at = null
    } else if (action === 'cancel') {
      updates.status = 'cancelled'
      updates.cancelled_at = new Date().toISOString()
    } else {
      return Errors.invalidInput(res, 'action must be pause, resume, or cancel')
    }

    const { data, error } = await req.supabase
      .from('recurring_donations')
      .update(updates)
      .eq('id', id)
      .eq('profile_id', userId)
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

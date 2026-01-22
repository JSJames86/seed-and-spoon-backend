/**
 * Admin Background Checks API
 * GET: List background checks with filters
 * POST: Initiate a background check
 * PUT: Update background check status
 */
import { requireStaff } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  if (req.method === 'PUT') return handlePut(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST', 'PUT'])
}

async function handleGet(req, res) {
  const { status, profile_id } = req.query

  try {
    let query = supabase
      .from('background_checks')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (profile_id) query = query.eq('profile_id', profile_id)

    const { data, error } = await query

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const { profile_id, check_type, provider } = req.body

  if (!profile_id || !check_type) {
    return Errors.missingField(res, 'profile_id and check_type are required')
  }

  try {
    const { data, error } = await supabase
      .from('background_checks')
      .insert({
        profile_id,
        check_type,
        provider,
        status: 'pending',
        submitted_at: new Date().toISOString()
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
  const { id, status, reference_number, notes, expires_at } = req.body

  if (!id || !status) {
    return Errors.missingField(res, 'id and status are required')
  }

  try {
    const updates = { status, reference_number, notes, expires_at }
    if (status === 'passed' || status === 'failed') {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('background_checks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireStaff(handler)

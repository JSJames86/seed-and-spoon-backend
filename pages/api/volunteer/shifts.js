/**
 * Volunteer Shifts API
 * GET: List available shifts
 * POST: Sign up for a shift
 */
import { requireAuth, getUserId, getUserEmail } from '../../../lib/authMiddleware'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function handleGet(req, res) {
  const { view } = req.query // 'available' or 'mine'
  const email = getUserEmail(req)

  try {
    if (view === 'mine') {
      // Get volunteer record
      const { data: volunteer } = await req.supabase
        .from('volunteers')
        .select('id')
        .eq('email', email)
        .single()

      if (!volunteer) return sendSuccess(res, [])

      const { data, error } = await req.supabase
        .from('shift_signups')
        .select('*, shifts(*)')
        .eq('volunteer_id', volunteer.id)
        .order('created_at', { ascending: false })

      if (error) return Errors.databaseError(res, error.message)
      return sendSuccess(res, data)
    }

    // Available shifts
    const { data, error } = await req.supabase
      .from('shifts')
      .select('*, food_banks(name)')
      .eq('status', 'open')
      .gte('start_time', new Date().toISOString())
      .order('start_time')

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const email = getUserEmail(req)
  const { shift_id } = req.body

  if (!shift_id) {
    return Errors.missingField(res, 'shift_id is required')
  }

  try {
    // Get volunteer record
    const { data: volunteer } = await req.supabase
      .from('volunteers')
      .select('id')
      .eq('email', email)
      .single()

    if (!volunteer) {
      return res.status(400).json({ success: false, error: 'No volunteer record found. Please sign up as a volunteer first.' })
    }

    const { data, error } = await req.supabase
      .from('shift_signups')
      .insert({
        shift_id,
        volunteer_id: volunteer.id,
        status: 'registered'
      })
      .select('*, shifts(*)')
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

/**
 * Admin Shifts Management API
 * GET: List shifts with filters
 * POST: Create a new shift
 */
import { requireStaff, getUserId } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function handleGet(req, res) {
  const { status, from_date, to_date } = req.query

  try {
    let query = supabase
      .from('shifts')
      .select('*, shift_signups(count), food_banks(name)')
      .order('start_time', { ascending: true })

    if (status) query = query.eq('status', status)
    if (from_date) query = query.gte('start_time', from_date)
    if (to_date) query = query.lte('start_time', to_date)

    const { data, error } = await query

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const { title, description, location, food_bank_id, start_time, end_time, max_volunteers } = req.body

  if (!start_time || !end_time) {
    return Errors.missingField(res, 'start_time and end_time are required')
  }

  try {
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        title,
        description,
        location,
        food_bank_id,
        start_time,
        end_time,
        max_volunteers,
        status: 'open',
        created_by: getUserId(req)
      })
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireStaff(handler)

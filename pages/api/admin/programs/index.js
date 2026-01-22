/**
 * Admin Programs Management API
 * GET: List all programs with enrollment counts
 * POST: Create a new program
 */
import { requireStaff } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function handleGet(req, res) {
  const { status, type } = req.query

  try {
    let query = supabase
      .from('programs')
      .select('*, program_enrollments(count)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('program_type', type)

    const { data, error } = await query

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const { name, description, program_type, capacity, eligibility_criteria, start_date, end_date } = req.body

  if (!name) {
    return Errors.missingField(res, 'name is required')
  }

  try {
    const { data, error } = await supabase
      .from('programs')
      .insert({
        name,
        description,
        program_type,
        capacity,
        eligibility_criteria,
        start_date,
        end_date,
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

export default requireStaff(handler)

/**
 * Client Programs API
 * GET: List available programs and client's enrollments
 * POST: Apply/enroll in a program
 */
import { requireAuth, getUserId } from '../../../lib/authMiddleware'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function handleGet(req, res) {
  const userId = getUserId(req)
  const { view } = req.query // 'available' or 'enrolled'

  try {
    if (view === 'enrolled') {
      // Get user's enrollments
      const { data, error } = await req.supabase
        .from('program_enrollments')
        .select('*, programs(*)')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })

      if (error) return Errors.databaseError(res, error.message)
      return sendSuccess(res, data)
    }

    // List active programs
    const { data, error } = await req.supabase
      .from('programs')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const userId = getUserId(req)
  const { program_id, notes } = req.body

  if (!program_id) {
    return Errors.missingField(res, 'program_id is required')
  }

  try {
    // Get household if exists
    const { data: household } = await req.supabase
      .from('households')
      .select('id')
      .eq('primary_contact_id', userId)
      .single()

    const { data, error } = await req.supabase
      .from('program_enrollments')
      .insert({
        program_id,
        profile_id: userId,
        household_id: household?.id || null,
        status: 'pending',
        notes
      })
      .select('*, programs(*)')
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

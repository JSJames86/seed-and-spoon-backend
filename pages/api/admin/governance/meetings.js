/**
 * Board Meetings Management API
 * GET: List meetings
 * POST: Create a meeting
 */
import { requireStaff } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'
import { getUserId } from '../../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function handleGet(req, res) {
  const { status, upcoming } = req.query

  try {
    let query = supabase
      .from('board_meetings')
      .select('*, meeting_agendas(count)')
      .order('scheduled_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (upcoming === 'true') {
      query = query.gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
    }

    const { data, error } = await query

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const { title, description, meeting_type, scheduled_at, location, virtual_link } = req.body

  if (!title || !scheduled_at) {
    return Errors.missingField(res, 'title and scheduled_at are required')
  }

  try {
    const { data, error } = await supabase
      .from('board_meetings')
      .insert({
        title,
        description,
        meeting_type: meeting_type || 'regular',
        scheduled_at,
        location,
        virtual_link,
        status: 'scheduled',
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

/**
 * Board Member Meetings API (self-service)
 * GET: View upcoming meetings, agendas, and own attendance
 */
import { requireAnyRole, getUserId } from '../../../lib/authMiddleware'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return Errors.methodNotAllowed(res, ['GET'])
  }

  const userId = getUserId(req)
  const { meeting_id } = req.query

  try {
    if (meeting_id) {
      // Get specific meeting with agendas and votes
      const { data, error } = await req.supabase
        .from('board_meetings')
        .select('*, meeting_agendas(*, board_votes(*))')
        .eq('id', meeting_id)
        .single()

      if (error) return Errors.databaseError(res, error.message)
      return sendSuccess(res, data)
    }

    // List meetings
    const { data, error } = await req.supabase
      .from('board_meetings')
      .select('*, meeting_attendance!inner(status)')
      .eq('meeting_attendance.member_id', userId)
      .order('scheduled_at', { ascending: false })

    if (error) {
      // Fallback: if no attendance records, just list all meetings
      const { data: allMeetings, error: allError } = await req.supabase
        .from('board_meetings')
        .select('*')
        .order('scheduled_at', { ascending: false })

      if (allError) return Errors.databaseError(res, allError.message)
      return sendSuccess(res, allMeetings)
    }

    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAnyRole(['board_member', 'executive_director', 'admin'])(handler)

/**
 * Client Reports API (issues, concerns, feedback)
 * GET: List client's submitted reports
 * POST: Submit a new report
 */
import { requireAuth, getUserId } from '../../../lib/authMiddleware'
import { supabase } from '../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function handleGet(req, res) {
  const userId = getUserId(req)

  try {
    const { data, error } = await supabase
      .from('client_reports')
      .select('*')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false })

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const userId = getUserId(req)
  const { report_type, subject, description, severity, is_anonymous } = req.body

  if (!report_type || !description) {
    return Errors.missingField(res, 'report_type and description are required')
  }

  const validTypes = ['allergy', 'safety_concern', 'staff_behavior', 'service_issue', 'feedback', 'other']
  if (!validTypes.includes(report_type)) {
    return Errors.invalidInput(res, `report_type must be one of: ${validTypes.join(', ')}`)
  }

  try {
    const { data, error } = await supabase
      .from('client_reports')
      .insert({
        reporter_id: userId,
        report_type,
        subject,
        description,
        severity: severity || 'medium',
        is_anonymous: is_anonymous || false
      })
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

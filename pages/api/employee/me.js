/**
 * Employee Self-Service API
 * GET: Get own employee record, schedule, trainings, documents
 */
import { requireAuth, getUserId } from '../../../lib/authMiddleware'
import { supabase } from '../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return Errors.methodNotAllowed(res, ['GET'])
  }

  const userId = getUserId(req)
  const { include } = req.query // 'schedule', 'trainings', 'documents'

  try {
    // Get employee record
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('profile_id', userId)
      .single()

    if (error || !employee) {
      return res.status(404).json({ success: false, error: 'No employee record found' })
    }

    const result = { employee }

    if (include === 'schedule' || !include) {
      const { data: schedules } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', employee.id)
        .or(`effective_until.is.null,effective_until.gte.${new Date().toISOString().split('T')[0]}`)
        .order('day_of_week')

      result.schedules = schedules || []
    }

    if (include === 'trainings' || !include) {
      const { data: completions } = await supabase
        .from('training_completions')
        .select('*, trainings(*)')
        .eq('employee_id', employee.id)
        .order('completed_at', { ascending: false })

      // Also get required trainings not yet completed
      const { data: allTrainings } = await supabase
        .from('trainings')
        .select('*')
        .eq('is_required', true)

      result.completedTrainings = completions || []
      result.requiredTrainings = allTrainings || []
    }

    if (include === 'documents' || !include) {
      const { data: docs } = await supabase
        .from('employee_documents')
        .select('*')
        .or(`employee_id.eq.${employee.id},is_org_wide.eq.true`)
        .order('created_at', { ascending: false })

      result.documents = docs || []
    }

    return sendSuccess(res, result)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

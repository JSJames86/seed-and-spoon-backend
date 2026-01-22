/**
 * Admin Employees Management API
 * GET: List employees with filters
 * POST: Create an employee record
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
  const { status, department } = req.query

  try {
    let query = supabase
      .from('employees')
      .select('*, profiles(email)')
      .order('hire_date', { ascending: false })

    if (status) query = query.eq('status', status)
    if (department) query = query.eq('department', department)

    const { data, error } = await query

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const { profile_id, employee_number, department, position, hire_date, employment_type, is_minor, emergency_contact_name, emergency_contact_phone } = req.body

  if (!profile_id || !hire_date) {
    return Errors.missingField(res, 'profile_id and hire_date are required')
  }

  try {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        profile_id,
        employee_number,
        department,
        position,
        hire_date,
        employment_type: employment_type || 'full_time',
        is_minor: is_minor || false,
        emergency_contact_name,
        emergency_contact_phone,
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

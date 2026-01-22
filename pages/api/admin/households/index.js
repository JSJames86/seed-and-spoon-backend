/**
 * Admin Households Management API
 * GET: List all households with members
 */
import { requireStaff } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return Errors.methodNotAllowed(res, ['GET'])
  }

  const { status, page = 1, limit = 25 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)

  try {
    let query = supabase
      .from('households')
      .select('*, household_members(count), profiles!households_primary_contact_id_fkey(email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status) query = query.eq('status', status)

    const { data, count, error } = await query

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    })
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireStaff(handler)

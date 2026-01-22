/**
 * Policies & Bylaws Management API
 * GET: List policies
 * POST: Create a policy
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
  const { policy_type, category, status } = req.query

  try {
    let query = supabase
      .from('policies')
      .select('*')
      .order('title')

    if (policy_type) query = query.eq('policy_type', policy_type)
    if (category) query = query.eq('category', category)
    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const { title, description, policy_type, category, content, version, effective_date, visibility } = req.body

  if (!title) {
    return Errors.missingField(res, 'title is required')
  }

  try {
    const { data, error } = await supabase
      .from('policies')
      .insert({
        title,
        description,
        policy_type,
        category,
        content,
        version,
        effective_date,
        visibility: visibility || 'board_only',
        status: 'draft',
        approved_by: getUserId(req)
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

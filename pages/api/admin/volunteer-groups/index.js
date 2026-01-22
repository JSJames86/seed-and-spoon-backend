/**
 * Admin Volunteer Groups API
 * GET: List all volunteer groups
 * POST: Create a volunteer group
 */
import { requireStaff } from '../../../../lib/authMiddleware'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'
import crypto from 'crypto'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function handleGet(req, res) {
  const { status } = req.query

  try {
    let query = supabase
      .from('volunteer_groups')
      .select('*, volunteer_memberships(count), profiles!volunteer_groups_leader_id_fkey(email)')
      .order('name')

    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const { name, group_type, contact_name, contact_email, contact_phone, leader_id } = req.body

  if (!name) {
    return Errors.missingField(res, 'name is required')
  }

  try {
    // Generate unique QR code token
    const qr_code_token = crypto.randomBytes(16).toString('hex')

    const { data, error } = await supabase
      .from('volunteer_groups')
      .insert({
        name,
        group_type,
        contact_name,
        contact_email,
        contact_phone,
        leader_id,
        qr_code_token,
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

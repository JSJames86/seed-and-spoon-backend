/**
 * Volunteer Groups API (public-facing)
 * GET: List groups or get group by QR token
 * POST: Join a group via QR token
 */
import { requireAuth, getUserEmail } from '../../../lib/authMiddleware'
import { supabase } from '../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function handleGet(req, res) {
  const { token } = req.query
  const email = getUserEmail(req)

  try {
    if (token) {
      // Look up group by QR token
      const { data, error } = await supabase
        .from('volunteer_groups')
        .select('id, name, group_type, contact_name')
        .eq('qr_code_token', token)
        .eq('status', 'active')
        .single()

      if (error || !data) {
        return res.status(404).json({ success: false, error: 'Group not found or inactive' })
      }
      return sendSuccess(res, data)
    }

    // Get volunteer's memberships
    const { data: volunteer } = await supabase
      .from('volunteers')
      .select('id')
      .eq('email', email)
      .single()

    if (!volunteer) return sendSuccess(res, [])

    const { data, error } = await supabase
      .from('volunteer_memberships')
      .select('*, volunteer_groups(name, group_type)')
      .eq('volunteer_id', volunteer.id)
      .eq('is_active', true)

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const email = getUserEmail(req)
  const { token } = req.body

  if (!token) {
    return Errors.missingField(res, 'token (QR code token) is required')
  }

  try {
    // Get volunteer
    const { data: volunteer } = await supabase
      .from('volunteers')
      .select('id')
      .eq('email', email)
      .single()

    if (!volunteer) {
      return res.status(400).json({ success: false, error: 'No volunteer record found.' })
    }

    // Find group by token
    const { data: group } = await supabase
      .from('volunteer_groups')
      .select('id')
      .eq('qr_code_token', token)
      .eq('status', 'active')
      .single()

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found or inactive' })
    }

    // Join group
    const { data, error } = await supabase
      .from('volunteer_memberships')
      .upsert({
        volunteer_id: volunteer.id,
        group_id: group.id,
        role: 'member',
        is_active: true
      }, { onConflict: 'volunteer_id,group_id' })
      .select('*, volunteer_groups(name)')
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

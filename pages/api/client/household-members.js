/**
 * Client Household Members API
 * GET: List household members
 * POST: Add a household member (minors under 18)
 * DELETE: Remove a household member
 */
import { requireAuth, getUserId } from '../../../lib/authMiddleware'
import { supabase } from '../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  if (req.method === 'DELETE') return handleDelete(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST', 'DELETE'])
}

async function handleGet(req, res) {
  const userId = getUserId(req)

  try {
    // First get the household
    const { data: household, error: hError } = await supabase
      .from('households')
      .select('id')
      .eq('primary_contact_id', userId)
      .single()

    if (hError || !household) {
      return sendSuccess(res, [])
    }

    const { data, error } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at')

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const userId = getUserId(req)
  const { first_name, last_name, date_of_birth, relationship } = req.body

  if (!first_name) {
    return Errors.missingField(res, 'first_name is required')
  }

  try {
    // Get household
    const { data: household, error: hError } = await supabase
      .from('households')
      .select('id')
      .eq('primary_contact_id', userId)
      .single()

    if (hError || !household) {
      return res.status(400).json({ success: false, error: 'No household found. Create a household first.' })
    }

    // Calculate if minor
    let is_minor = false
    if (date_of_birth) {
      const age = Math.floor((Date.now() - new Date(date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      is_minor = age < 18
    }

    const { data, error } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        first_name,
        last_name,
        date_of_birth,
        relationship,
        is_minor
      })
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handleDelete(req, res) {
  const userId = getUserId(req)
  const { member_id } = req.query

  if (!member_id) {
    return Errors.missingField(res, 'member_id query parameter is required')
  }

  try {
    // Verify ownership through household
    const { data: household } = await supabase
      .from('households')
      .select('id')
      .eq('primary_contact_id', userId)
      .single()

    if (!household) {
      return Errors.forbidden(res)
    }

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('id', member_id)
      .eq('household_id', household.id)

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, { deleted: true })
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

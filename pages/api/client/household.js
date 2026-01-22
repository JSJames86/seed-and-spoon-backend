/**
 * Client Household API
 * GET: Get client's household info
 * POST: Create household
 * PUT: Update household preferences
 */
import { requireAuth, getUserId, hasAnyRole } from '../../../lib/authMiddleware'
import { supabase } from '../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  if (req.method === 'PUT') return handlePut(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST', 'PUT'])
}

async function handleGet(req, res) {
  const userId = getUserId(req)

  try {
    const { data, error } = await supabase
      .from('households')
      .select('*, household_members(*)')
      .eq('primary_contact_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return Errors.databaseError(res, error.message)
    }

    return sendSuccess(res, data || null)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePost(req, res) {
  const userId = getUserId(req)
  const { name, address, city, state, zip_code, phone, preferred_contact_method, delivery_preference, delivery_address, dietary_restrictions } = req.body

  try {
    const { data, error } = await supabase
      .from('households')
      .insert({
        primary_contact_id: userId,
        name,
        address,
        city,
        state,
        zip_code,
        phone,
        preferred_contact_method,
        delivery_preference,
        delivery_address,
        dietary_restrictions
      })
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data, 201)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

async function handlePut(req, res) {
  const userId = getUserId(req)
  const { name, address, city, state, zip_code, phone, preferred_contact_method, delivery_preference, delivery_address, dietary_restrictions } = req.body

  try {
    const { data, error } = await supabase
      .from('households')
      .update({
        name,
        address,
        city,
        state,
        zip_code,
        phone,
        preferred_contact_method,
        delivery_preference,
        delivery_address,
        dietary_restrictions
      })
      .eq('primary_contact_id', userId)
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

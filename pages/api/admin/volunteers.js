/**
 * Volunteers Management API - ADMIN ONLY
 * GET  /api/admin/volunteers - List all volunteers
 * POST /api/admin/volunteers - Create volunteer record
 *
 * Requires admin authentication.
 *
 * Security: Admin-only access to protect volunteer PII
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'
import { withCORS } from '../../../lib/corsMiddleware'
import { Errors, sendSuccess } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    return Errors.methodNotAllowed(res, ['GET', 'POST'])
  }
}

/**
 * GET /api/admin/volunteers
 * Returns list of volunteers with optional filtering
 */
async function handleGet(req, res) {
  try {
    const { status, food_bank_id, limit = 50, offset = 0 } = req.query

    let query = supabase
      .from('volunteers')
      .select(`
        *,
        food_banks (
          id,
          name
        )
      `, { count: 'exact' })

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Filter by food bank if provided
    if (food_bank_id) {
      query = query.eq('food_bank_id', food_bank_id)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Database error fetching volunteers:', error)
      return Errors.databaseError(res, 'Failed to fetch volunteers')
    }

    return sendSuccess(res, {
      volunteers: data,
      total: count,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    })
  } catch (error) {
    console.error('Error fetching volunteers:', error)
    return Errors.internalError(res, 'Failed to fetch volunteers')
  }
}

/**
 * POST /api/admin/volunteers
 * Creates a new volunteer record
 */
async function handlePost(req, res) {
  try {
    const volunteerData = {
      ...req.body,
      status: req.body.status || 'pending',
      created_at: new Date().toISOString()
    }

    // Validate required fields
    if (!volunteerData.name) {
      return Errors.missingField(res, 'name')
    }

    if (!volunteerData.email) {
      return Errors.missingField(res, 'email')
    }

    const { data, error } = await supabase
      .from('volunteers')
      .insert([volunteerData])
      .select()

    if (error) {
      console.error('Database error creating volunteer:', error)
      return Errors.databaseError(res, 'Failed to create volunteer record')
    }

    return sendSuccess(res, { volunteer: data[0] }, 201)
  } catch (error) {
    console.error('Error creating volunteer:', error)
    return Errors.internalError(res, 'Failed to create volunteer record')
  }
}

// Export with admin authentication and CORS
export default withCORS(requireAdmin(handler))

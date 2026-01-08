/**
 * Food Banks Directory API
 * GET  /api/directory/food-banks - PUBLIC (with CORS)
 * POST /api/directory/food-banks - ADMIN ONLY
 *
 * GET: Returns list of active food banks with optional proximity filtering
 * POST: Creates new food bank (admin only)
 *
 * Security:
 * - GET is public (directory information)
 * - POST requires admin authentication
 * - CORS restricted to frontend origin
 */

import { supabase } from '../../../lib/supabaseClient'
import { filterByProximity, getDirectionsUrl } from '../../../lib/googleMapsClient'
import { requireAdmin } from '../../../lib/authMiddleware'
import { withCORS } from '../../../lib/corsMiddleware'
import { Errors, sendSuccess } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    // POST requires admin auth - check if user is authenticated
    if (!req.user || !req.profile) {
      return Errors.unauthenticated(res)
    }
    return handlePost(req, res)
  } else {
    return Errors.methodNotAllowed(res, ['GET', 'POST'])
  }
}

/**
 * GET /api/directory/food-banks
 * Public endpoint - returns active food banks
 */
async function handleGet(req, res) {
  try {
    const {
      latitude,
      longitude,
      radius = 10,
      county,
      city,
      include_directions = false
    } = req.query

    let query = supabase
      .from('food_banks')
      .select('*')
      .eq('active', true)

    // Filter by county if provided
    if (county) {
      query = query.eq('county', county)
    }

    // Filter by city if provided
    if (city) {
      query = query.ilike('city', city)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error fetching food banks:', error)
      return Errors.databaseError(res, 'Failed to fetch food banks')
    }

    let foodBanks = data

    // If coordinates provided, filter by proximity and add distance
    if (latitude && longitude) {
      const userLat = parseFloat(latitude)
      const userLng = parseFloat(longitude)
      const radiusMiles = parseFloat(radius)

      // Validate coordinates
      if (isNaN(userLat) || isNaN(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
        return Errors.invalidInput(res, 'Invalid latitude or longitude')
      }

      foodBanks = filterByProximity(foodBanks, userLat, userLng, radiusMiles)

      // Optionally add directions URL
      if (include_directions === 'true') {
        foodBanks = foodBanks.map(fb => ({
          ...fb,
          directions_url: getDirectionsUrl(`${userLat},${userLng}`, fb.address)
        }))
      }
    } else {
      // No proximity filtering, just sort by name
      foodBanks = foodBanks.sort((a, b) => a.name.localeCompare(b.name))
    }

    return sendSuccess(res, {
      foodBanks,
      count: foodBanks.length,
      filters: {
        latitude: latitude || null,
        longitude: longitude || null,
        radius: latitude && longitude ? parseFloat(radius) : null,
        county: county || null,
        city: city || null
      }
    })
  } catch (error) {
    console.error('Error fetching food banks:', error)
    return Errors.internalError(res, 'Failed to fetch food banks')
  }
}

/**
 * POST /api/directory/food-banks
 * Admin only - creates new food bank
 */
async function handlePost(req, res) {
  try {
    const foodBankData = req.body

    // Validate required fields
    if (!foodBankData.name) {
      return Errors.missingField(res, 'name')
    }

    if (!foodBankData.address) {
      return Errors.missingField(res, 'address')
    }

    const { data, error } = await supabase
      .from('food_banks')
      .insert([foodBankData])
      .select()

    if (error) {
      console.error('Database error creating food bank:', error)
      return Errors.databaseError(res, 'Failed to create food bank')
    }

    return sendSuccess(res, { foodBank: data[0] }, 201)
  } catch (error) {
    console.error('Error creating food bank:', error)
    return Errors.internalError(res, 'Failed to create food bank')
  }
}

// Export with CORS and conditional admin auth (only for POST)
export default withCORS(async (req, res) => {
  if (req.method === 'POST') {
    // Apply admin auth for POST
    return requireAdmin(handler)(req, res)
  } else {
    // No auth for GET
    return handler(req, res)
  }
})

/**
 * Client Intake API Route
 * GET /api/intakes/me
 *
 * Allows clients to view their own intake/application data.
 * Clients can ONLY access their own records.
 *
 * Security: Requires 'client' role
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireRole, getUserId } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') {
    return getMyIntake(req, res)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/intakes/me
 * Returns intake data for the authenticated client
 */
async function getMyIntake(req, res) {
  try {
    const userId = getUserId(req)

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found'
      })
    }

    // Get client intake data - only their own records
    const { data: intakes, error: intakeError } = await supabase
      .from('client_intakes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (intakeError) {
      console.error('Error fetching intake data:', intakeError)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch intake data'
      })
    }

    // Get client's associated services/programs if available
    const { data: services, error: servicesError } = await supabase
      .from('client_services')
      .select('*, food_banks(name, address, city)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      // Don't fail the request, just return empty services
    }

    return res.status(200).json({
      success: true,
      data: {
        intakes: intakes || [],
        services: services || [],
        profile: req.profile
      }
    })
  } catch (error) {
    console.error('Error in getMyIntake:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch intake data',
      details: error.message
    })
  }
}

// Export with client authentication required
export default requireRole('client')(handler)

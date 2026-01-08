/**
 * Donor Donations API Route
 * GET /api/donations/me
 *
 * Allows donors to view their own donation history.
 * Donors can ONLY access their own records.
 *
 * Security: Requires 'donor' role
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireRole, getUserEmail, canAccessResource } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') {
    return getMyDonations(req, res)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/donations/me
 * Returns donation history for the authenticated donor
 */
async function getMyDonations(req, res) {
  try {
    const donorEmail = getUserEmail(req)
    const { limit = 50, offset = 0, status } = req.query

    if (!donorEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email not found'
      })
    }

    // Build query to get donations for this donor only
    let query = supabase
      .from('donations')
      .select('*')
      .eq('donor_email', donorEmail)

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Order by most recent first
    query = query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching donations:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch donation history'
      })
    }

    // Calculate summary statistics
    const totalAmount = data.reduce((sum, donation) => {
      if (donation.status === 'succeeded') {
        return sum + parseFloat(donation.amount || 0)
      }
      return sum
    }, 0)

    const successfulDonations = data.filter(d => d.status === 'succeeded').length

    return res.status(200).json({
      success: true,
      data: {
        donations: data,
        count: data.length,
        total: count,
        summary: {
          total_amount: Math.round(totalAmount * 100) / 100,
          successful_donations: successfulDonations,
          average_donation: successfulDonations > 0
            ? Math.round((totalAmount / successfulDonations) * 100) / 100
            : 0
        },
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    })
  } catch (error) {
    console.error('Error in getMyDonations:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch donation history',
      details: error.message
    })
  }
}

// Export with donor authentication required
export default requireRole('donor')(handler)

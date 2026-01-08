/**
 * Donation History API - ADMIN ONLY
 * GET /api/donations/history
 *
 * Returns all donation records with filtering options.
 * Requires admin authentication.
 *
 * Security: Admin-only access to prevent unauthorized access to donor data
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'
import { withCORS } from '../../../lib/corsMiddleware'
import { Errors, sendSuccess } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const {
        status,
        start_date,
        end_date,
        limit = 50,
        offset = 0,
        donor_email
      } = req.query

      let query = supabase
        .from('donations')
        .select('*', { count: 'exact' })

      // Filter by status if provided
      if (status) {
        query = query.eq('status', status)
      }

      // Filter by donor email if provided
      if (donor_email) {
        query = query.eq('donor_email', donor_email)
      }

      // Filter by date range if provided
      if (start_date) {
        query = query.gte('created_at', start_date)
      }

      if (end_date) {
        query = query.lte('created_at', end_date)
      }

      // Order by most recent first
      query = query
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Database error fetching donations:', error)
        return Errors.databaseError(res, 'Failed to fetch donation history')
      }

      // Calculate summary statistics
      const totalAmount = data.reduce((sum, donation) => {
        if (donation.status === 'succeeded') {
          return sum + parseFloat(donation.amount || 0)
        }
        return sum
      }, 0)

      const successfulDonations = data.filter(d => d.status === 'succeeded').length

      return sendSuccess(res, {
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
      })

    } catch (error) {
      console.error('Error fetching donation history:', error)
      return Errors.internalError(res, 'An unexpected error occurred')
    }
  } else {
    return Errors.methodNotAllowed(res, ['GET'])
  }
}

// Export with admin authentication and CORS
export default withCORS(requireAdmin(handler))

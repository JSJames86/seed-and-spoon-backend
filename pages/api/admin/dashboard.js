/**
 * Admin Dashboard API Route
 * GET /api/admin/dashboard
 *
 * Returns aggregate statistics for admin dashboard:
 * - Volunteer stats (total, active, pending)
 * - Donor stats (total donors, total raised, recent donations)
 * - Event stats (upcoming events, volunteers needed)
 * - Intake stats (recent applications)
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') {
    return getDashboardStats(req, res)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/admin/dashboard
 * Returns dashboard statistics
 */
async function getDashboardStats(req, res) {
  try {
    const { timeframe = '30' } = req.query // days to look back
    const days = parseInt(timeframe)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Parallel queries for performance
    const [
      volunteersResult,
      donorsResult,
      donationsResult,
      eventsResult,
      recentVolunteersResult,
      recentDonationsResult,
      volunteerHoursResult
    ] = await Promise.all([
      // Volunteer stats
      supabase
        .from('volunteers')
        .select('id, status, created_at', { count: 'exact' }),

      // Donor stats
      supabase
        .from('donors')
        .select('id, total_donated, status', { count: 'exact' }),

      // Donation stats
      supabase
        .from('donations')
        .select('amount, status, created_at')
        .eq('status', 'succeeded'),

      // Event stats
      supabase
        .from('events')
        .select('id, start_time, status, max_volunteers, registered_volunteers')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10),

      // Recent volunteer applications
      supabase
        .from('volunteers')
        .select('id, name, email, status, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Recent donations
      supabase
        .from('donations')
        .select('id, amount, donor_name, donor_email, created_at')
        .eq('status', 'succeeded')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Volunteer hours
      supabase
        .from('volunteer_hours')
        .select('hours, date, verified')
        .gte('date', startDate.toISOString().split('T')[0])
    ])

    // Check for errors
    if (volunteersResult.error) throw volunteersResult.error
    if (donorsResult.error) throw donorsResult.error
    if (donationsResult.error) throw donationsResult.error
    if (eventsResult.error) throw eventsResult.error

    // Process volunteer stats
    const volunteers = volunteersResult.data || []
    const volunteerStats = {
      total: volunteersResult.count || 0,
      active: volunteers.filter(v => v.status === 'approved' || v.status === 'active').length,
      pending: volunteers.filter(v => v.status === 'pending').length,
      inactive: volunteers.filter(v => v.status === 'inactive').length,
      newThisPeriod: volunteers.filter(v => new Date(v.created_at) >= startDate).length
    }

    // Process donor stats
    const donors = donorsResult.data || []
    const donorStats = {
      total: donorsResult.count || 0,
      active: donors.filter(d => d.status === 'active').length,
      totalRaised: donors.reduce((sum, d) => sum + parseFloat(d.total_donated || 0), 0)
    }

    // Process donation stats
    const donations = donationsResult.data || []
    const donationStats = {
      total: donations.length,
      totalAmount: donations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0),
      recentAmount: donations
        .filter(d => new Date(d.created_at) >= startDate)
        .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0),
      recentCount: donations.filter(d => new Date(d.created_at) >= startDate).length
    }

    // Process event stats
    const events = eventsResult.data || []
    const eventStats = {
      upcoming: events.length,
      volunteersNeeded: events.reduce((sum, e) => {
        const needed = (e.max_volunteers || 0) - (e.registered_volunteers || 0)
        return sum + (needed > 0 ? needed : 0)
      }, 0),
      nextEvent: events[0] || null
    }

    // Process volunteer hours
    const hours = volunteerHoursResult.data || []
    const hourStats = {
      totalHours: hours.reduce((sum, h) => sum + parseFloat(h.hours || 0), 0),
      verifiedHours: hours
        .filter(h => h.verified)
        .reduce((sum, h) => sum + parseFloat(h.hours || 0), 0),
      unverifiedHours: hours
        .filter(h => !h.verified)
        .reduce((sum, h) => sum + parseFloat(h.hours || 0), 0)
    }

    // Compile dashboard data
    const dashboard = {
      volunteers: volunteerStats,
      donors: donorStats,
      donations: donationStats,
      events: eventStats,
      hours: hourStats,
      recentActivity: {
        volunteers: recentVolunteersResult.data || [],
        donations: recentDonationsResult.data || []
      },
      timeframe: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    }

    return res.status(200).json({
      success: true,
      data: dashboard
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error.message
    })
  }
}

// Export with admin authentication required
export default requireAdmin(handler)

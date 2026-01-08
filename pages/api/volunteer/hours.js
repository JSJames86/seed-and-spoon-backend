/**
 * Volunteer Hours API Route
 * GET /api/volunteer/hours
 *
 * Allows volunteers to view their logged hours, schedules, and tasks.
 * Volunteers can ONLY access their own records.
 *
 * Security: Requires 'volunteer' role
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireRole, getUserId } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') {
    return getMyHours(req, res)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/volunteer/hours
 * Returns volunteer hours and stats for the authenticated volunteer
 */
async function getMyHours(req, res) {
  try {
    const userId = getUserId(req)
    const { start_date, end_date, limit = 100, offset = 0 } = req.query

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found'
      })
    }

    // Get volunteer record
    const { data: volunteer, error: volunteerError } = await supabase
      .from('volunteers')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (volunteerError) {
      console.error('Error fetching volunteer record:', volunteerError)
      return res.status(404).json({
        success: false,
        error: 'Volunteer record not found'
      })
    }

    // Build query for volunteer hours
    let hoursQuery = supabase
      .from('volunteer_hours')
      .select('*')
      .eq('volunteer_id', volunteer.id)

    if (start_date) {
      hoursQuery = hoursQuery.gte('date', start_date)
    }

    if (end_date) {
      hoursQuery = hoursQuery.lte('date', end_date)
    }

    hoursQuery = hoursQuery
      .order('date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    const { data: hours, error: hoursError } = await hoursQuery

    if (hoursError) {
      console.error('Error fetching hours:', hoursError)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch volunteer hours'
      })
    }

    // Get upcoming events/tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('volunteer_tasks')
      .select('*')
      .eq('volunteer_id', volunteer.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(10)

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      // Don't fail the request
    }

    // Calculate statistics
    const totalHours = hours.reduce((sum, h) => sum + parseFloat(h.hours || 0), 0)
    const verifiedHours = hours
      .filter(h => h.verified)
      .reduce((sum, h) => sum + parseFloat(h.hours || 0), 0)
    const unverifiedHours = hours
      .filter(h => !h.verified)
      .reduce((sum, h) => sum + parseFloat(h.hours || 0), 0)

    return res.status(200).json({
      success: true,
      data: {
        volunteer: {
          id: volunteer.id,
          name: volunteer.name,
          email: volunteer.email,
          status: volunteer.status,
          skills: volunteer.skills
        },
        hours: hours || [],
        tasks: tasks || [],
        stats: {
          total_hours: Math.round(totalHours * 100) / 100,
          verified_hours: Math.round(verifiedHours * 100) / 100,
          unverified_hours: Math.round(unverifiedHours * 100) / 100,
          total_sessions: hours.length
        },
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    })
  } catch (error) {
    console.error('Error in getMyHours:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch volunteer hours',
      details: error.message
    })
  }
}

// Export with volunteer authentication required
export default requireRole('volunteer')(handler)

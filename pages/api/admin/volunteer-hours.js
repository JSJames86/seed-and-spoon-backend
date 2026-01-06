/**
 * Volunteer Hours API Route
 * Track and manage volunteer hours
 *
 * GET    /api/admin/volunteer-hours - List all hours (with filters)
 * POST   /api/admin/volunteer-hours - Log new hours
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireStaff, getUserEmail } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') {
    return getHours(req, res)
  }

  if (req.method === 'POST') {
    return logHours(req, res)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/admin/volunteer-hours
 * List all volunteer hours with optional filters
 * Query params: volunteer_id, food_bank_id, verified, start_date, end_date, page, limit
 */
async function getHours(req, res) {
  try {
    const {
      volunteer_id,
      food_bank_id,
      verified,
      activity_type,
      start_date,
      end_date,
      page = '1',
      limit = '50',
      sort = 'date',
      order = 'desc'
    } = req.query

    let query = supabase
      .from('volunteer_hours')
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone),
        food_bank:food_banks(id, name, city, state),
        task:volunteer_tasks(id, title, task_type)
      `, { count: 'exact' })

    // Apply filters
    if (volunteer_id) {
      query = query.eq('volunteer_id', volunteer_id)
    }

    if (food_bank_id) {
      query = query.eq('food_bank_id', food_bank_id)
    }

    if (verified !== undefined) {
      query = query.eq('verified', verified === 'true')
    }

    if (activity_type) {
      query = query.eq('activity_type', activity_type)
    }

    if (start_date) {
      query = query.gte('date', start_date)
    }

    if (end_date) {
      query = query.lte('date', end_date)
    }

    // Pagination
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limitNum - 1)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    // Calculate total hours
    const totalHours = (data || []).reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0)
    const verifiedHours = (data || []).filter(h => h.verified).reduce((sum, h) => sum + parseFloat(h.hours || 0), 0)

    return res.status(200).json({
      success: true,
      data: data || [],
      summary: {
        totalHours: totalHours.toFixed(2),
        verifiedHours: verifiedHours.toFixed(2),
        unverifiedHours: (totalHours - verifiedHours).toFixed(2),
        entryCount: data?.length || 0
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    })
  } catch (error) {
    console.error('Get hours error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch volunteer hours',
      details: error.message
    })
  }
}

/**
 * POST /api/admin/volunteer-hours
 * Log new volunteer hours
 */
async function logHours(req, res) {
  try {
    const {
      volunteer_id,
      food_bank_id,
      task_id,
      date,
      hours,
      description,
      activity_type,
      verified = false,
      notes
    } = req.body

    // Validation
    if (!volunteer_id || !date || !hours) {
      return res.status(400).json({
        success: false,
        error: 'volunteer_id, date, and hours are required'
      })
    }

    if (hours <= 0 || hours > 24) {
      return res.status(400).json({
        success: false,
        error: 'Hours must be between 0 and 24'
      })
    }

    // Verify volunteer exists
    const { data: volunteer, error: volunteerError } = await supabase
      .from('volunteers')
      .select('id, name, email')
      .eq('id', volunteer_id)
      .single()

    if (volunteerError || !volunteer) {
      return res.status(404).json({
        success: false,
        error: 'Volunteer not found'
      })
    }

    // Verify food bank exists if provided
    if (food_bank_id) {
      const { data: foodBank, error: foodBankError } = await supabase
        .from('food_banks')
        .select('id')
        .eq('id', food_bank_id)
        .single()

      if (foodBankError || !foodBank) {
        return res.status(404).json({
          success: false,
          error: 'Food bank not found'
        })
      }
    }

    // Verify task exists if provided
    if (task_id) {
      const { data: task, error: taskError } = await supabase
        .from('volunteer_tasks')
        .select('id')
        .eq('id', task_id)
        .single()

      if (taskError || !task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        })
      }
    }

    // Create hours entry
    const hoursData = {
      volunteer_id,
      food_bank_id: food_bank_id || null,
      task_id: task_id || null,
      date,
      hours: parseFloat(hours),
      description: description || null,
      activity_type: activity_type || null,
      verified,
      notes: notes || null
    }

    // If verified, add verification details
    if (verified) {
      hoursData.verified_by = getUserEmail(req)
      hoursData.verified_at = new Date().toISOString()
    }

    const { data: hoursEntry, error: createError } = await supabase
      .from('volunteer_hours')
      .insert([hoursData])
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone),
        food_bank:food_banks(id, name, city, state),
        task:volunteer_tasks(id, title, task_type)
      `)
      .single()

    if (createError) {
      throw createError
    }

    return res.status(201).json({
      success: true,
      data: hoursEntry
    })
  } catch (error) {
    console.error('Log hours error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to log volunteer hours',
      details: error.message
    })
  }
}

// Export with staff authentication required
export default requireStaff(handler)

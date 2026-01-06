/**
 * Events API Route
 * Manage nonprofit events for calendar
 *
 * GET    /api/admin/events - List all events (with filters)
 * POST   /api/admin/events - Create new event
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireStaff, getUserEmail, optionalAuth } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') {
    return getEvents(req, res)
  }

  if (req.method === 'POST') {
    return createEvent(req, res)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/admin/events
 * List all events with optional filters
 * Query params: food_bank_id, event_type, status, visibility, start_date, end_date, page, limit
 * Note: Public events can be viewed without auth, but other visibility levels require auth
 */
async function getEvents(req, res) {
  try {
    const {
      food_bank_id,
      event_type,
      status,
      visibility,
      start_date,
      end_date,
      page = '1',
      limit = '50',
      sort = 'start_time',
      order = 'asc'
    } = req.query

    let query = supabase
      .from('events')
      .select(`
        *,
        food_bank:food_banks(id, name, address, city, state, phone)
      `, { count: 'exact' })

    // If no auth, only show public events
    if (!req.user) {
      query = query.eq('visibility', 'public')
    } else {
      // If auth provided and visibility filter specified, apply it
      if (visibility) {
        query = query.eq('visibility', visibility)
      }
    }

    // Apply filters
    if (food_bank_id) {
      query = query.eq('food_bank_id', food_bank_id)
    }

    if (event_type) {
      query = query.eq('event_type', event_type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (start_date) {
      query = query.gte('start_time', start_date)
    }

    if (end_date) {
      query = query.lte('end_time', end_date)
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

    // Get volunteer registrations for these events if authenticated
    let enrichedData = data || []

    if (req.user && enrichedData.length > 0) {
      const eventIds = enrichedData.map(e => e.id)
      const { data: registrations, error: regError } = await supabase
        .from('event_volunteers')
        .select('event_id, volunteer_id, status, role')
        .in('event_id', eventIds)

      if (!regError && registrations) {
        enrichedData = enrichedData.map(event => {
          const eventRegs = registrations.filter(r => r.event_id === event.id)
          return {
            ...event,
            volunteer_registrations: eventRegs,
            registered_count: eventRegs.length,
            confirmed_count: eventRegs.filter(r => r.status === 'confirmed' || r.status === 'attended').length
          }
        })
      }
    }

    return res.status(200).json({
      success: true,
      data: enrichedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    })
  } catch (error) {
    console.error('Get events error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      details: error.message
    })
  }
}

/**
 * POST /api/admin/events
 * Create a new event
 */
async function createEvent(req, res) {
  try {
    const {
      title,
      description,
      event_type,
      food_bank_id,
      location,
      start_time,
      end_time,
      all_day = false,
      recurring = false,
      recurrence_rule,
      max_volunteers,
      visibility = 'public',
      organizer_name,
      organizer_email,
      contact_phone,
      metadata
    } = req.body

    // Validation
    if (!title || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        error: 'title, start_time, and end_time are required'
      })
    }

    // Validate dates
    if (new Date(start_time) >= new Date(end_time)) {
      return res.status(400).json({
        success: false,
        error: 'end_time must be after start_time'
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

    // Create event
    const { data: event, error: createError } = await supabase
      .from('events')
      .insert([
        {
          title,
          description: description || null,
          event_type: event_type || null,
          food_bank_id: food_bank_id || null,
          location: location || null,
          start_time,
          end_time,
          all_day,
          recurring,
          recurrence_rule: recurrence_rule || null,
          max_volunteers: max_volunteers || null,
          status: 'scheduled',
          visibility,
          organizer_name: organizer_name || null,
          organizer_email: organizer_email || getUserEmail(req),
          contact_phone: contact_phone || null,
          metadata: metadata || null,
          created_by: getUserEmail(req)
        }
      ])
      .select(`
        *,
        food_bank:food_banks(id, name, address, city, state)
      `)
      .single()

    if (createError) {
      throw createError
    }

    return res.status(201).json({
      success: true,
      data: event
    })
  } catch (error) {
    console.error('Create event error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create event',
      details: error.message
    })
  }
}

// Export with optional authentication (public events visible, others require auth)
export default optionalAuth(handler)

/**
 * Individual Event API Route
 * Manage a specific event
 *
 * GET    /api/admin/events/[id] - Get event details with volunteers
 * PUT    /api/admin/events/[id] - Update event
 * DELETE /api/admin/events/[id] - Delete event
 */

import { supabase } from '../../../../lib/supabaseClient'
import { requireStaff, optionalAuth } from '../../../../lib/authMiddleware'

async function handler(req, res) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Event ID is required'
    })
  }

  if (req.method === 'GET') {
    return getEvent(req, res, id)
  }

  if (req.method === 'PUT') {
    return updateEvent(req, res, id)
  }

  if (req.method === 'DELETE') {
    return deleteEvent(req, res, id)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/admin/events/[id]
 * Get event details with volunteer registrations
 */
async function getEvent(req, res, id) {
  try {
    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        food_bank:food_banks(id, name, address, city, state, phone, email)
      `)
      .eq('id', id)
      .single()

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      })
    }

    // Check visibility - public events are visible to all, others require auth
    if (event.visibility !== 'public' && !req.user) {
      return res.status(403).json({
        success: false,
        error: 'Authentication required to view this event'
      })
    }

    // Get volunteer registrations
    const { data: volunteers, error: volunteersError } = await supabase
      .from('event_volunteers')
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone, status)
      `)
      .eq('event_id', id)
      .order('registered_at', { ascending: false })

    if (volunteersError) {
      console.error('Volunteers fetch error:', volunteersError)
    }

    return res.status(200).json({
      success: true,
      data: {
        ...event,
        volunteers: volunteers || [],
        registered_count: volunteers?.length || 0,
        confirmed_count: volunteers?.filter(v => v.status === 'confirmed' || v.status === 'attended').length || 0,
        attended_count: volunteers?.filter(v => v.status === 'attended').length || 0
      }
    })
  } catch (error) {
    console.error('Get event error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      details: error.message
    })
  }
}

/**
 * PUT /api/admin/events/[id]
 * Update event details
 */
async function updateEvent(req, res, id) {
  try {
    const {
      title,
      description,
      event_type,
      location,
      start_time,
      end_time,
      all_day,
      recurring,
      recurrence_rule,
      max_volunteers,
      status,
      visibility,
      organizer_name,
      organizer_email,
      contact_phone,
      metadata
    } = req.body

    // Build update object with only provided fields
    const updateData = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (event_type !== undefined) updateData.event_type = event_type
    if (location !== undefined) updateData.location = location
    if (start_time !== undefined) updateData.start_time = start_time
    if (end_time !== undefined) updateData.end_time = end_time
    if (all_day !== undefined) updateData.all_day = all_day
    if (recurring !== undefined) updateData.recurring = recurring
    if (recurrence_rule !== undefined) updateData.recurrence_rule = recurrence_rule
    if (max_volunteers !== undefined) updateData.max_volunteers = max_volunteers
    if (status !== undefined) updateData.status = status
    if (visibility !== undefined) updateData.visibility = visibility
    if (organizer_name !== undefined) updateData.organizer_name = organizer_name
    if (organizer_email !== undefined) updateData.organizer_email = organizer_email
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone
    if (metadata !== undefined) updateData.metadata = metadata

    // Validate dates if both are being updated
    if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
      return res.status(400).json({
        success: false,
        error: 'end_time must be after start_time'
      })
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      })
    }

    const { data: event, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        food_bank:food_banks(id, name, city, state)
      `)
      .single()

    if (error || !event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found or update failed'
      })
    }

    return res.status(200).json({
      success: true,
      data: event
    })
  } catch (error) {
    console.error('Update event error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update event',
      details: error.message
    })
  }
}

/**
 * DELETE /api/admin/events/[id]
 * Delete an event
 * Note: This will cascade delete all volunteer registrations (ON DELETE CASCADE)
 */
async function deleteEvent(req, res, id) {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return res.status(200).json({
      success: true,
      data: { id, deleted: true }
    })
  } catch (error) {
    console.error('Delete event error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      details: error.message
    })
  }
}

// Wrap handlers with different middleware
async function wrappedHandler(req, res) {
  // GET is optionalAuth (public events visible to all)
  if (req.method === 'GET') {
    return optionalAuth(handler)(req, res)
  }

  // PUT and DELETE require staff auth
  return requireStaff(handler)(req, res)
}

export default wrappedHandler

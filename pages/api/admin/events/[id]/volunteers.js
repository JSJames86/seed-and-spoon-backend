/**
 * Event Volunteer Registration API Route
 * Manage volunteer registrations for an event
 *
 * POST   /api/admin/events/[id]/volunteers - Register volunteer for event
 * PUT    /api/admin/events/[id]/volunteers - Update volunteer registration
 * DELETE /api/admin/events/[id]/volunteers - Remove volunteer from event
 */

import { supabase } from '../../../../../lib/supabaseClient'
import { requireStaff } from '../../../../../lib/authMiddleware'

async function handler(req, res) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Event ID is required'
    })
  }

  if (req.method === 'POST') {
    return registerVolunteer(req, res, id)
  }

  if (req.method === 'PUT') {
    return updateRegistration(req, res, id)
  }

  if (req.method === 'DELETE') {
    return removeVolunteer(req, res, id)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * POST /api/admin/events/[id]/volunteers
 * Register a volunteer for an event
 */
async function registerVolunteer(req, res, eventId) {
  try {
    const {
      volunteer_id,
      role = 'volunteer',
      status = 'registered'
    } = req.body

    // Validation
    if (!volunteer_id) {
      return res.status(400).json({
        success: false,
        error: 'volunteer_id is required'
      })
    }

    // Verify event exists and get details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, max_volunteers, registered_volunteers, status')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      })
    }

    // Check if event is cancelled
    if (event.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot register for a cancelled event'
      })
    }

    // Check if event is full
    if (event.max_volunteers && event.registered_volunteers >= event.max_volunteers) {
      return res.status(400).json({
        success: false,
        error: 'Event is full'
      })
    }

    // Verify volunteer exists
    const { data: volunteer, error: volunteerError } = await supabase
      .from('volunteers')
      .select('id, name, email, status')
      .eq('id', volunteer_id)
      .single()

    if (volunteerError || !volunteer) {
      return res.status(404).json({
        success: false,
        error: 'Volunteer not found'
      })
    }

    // Check if volunteer is already registered
    const { data: existing, error: checkError } = await supabase
      .from('event_volunteers')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('volunteer_id', volunteer_id)
      .single()

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Volunteer is already registered for this event',
        data: existing
      })
    }

    // Register volunteer
    const { data: registration, error: registerError } = await supabase
      .from('event_volunteers')
      .insert([
        {
          event_id: eventId,
          volunteer_id,
          status,
          role
        }
      ])
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone),
        event:events(id, title, start_time, end_time, location)
      `)
      .single()

    if (registerError) {
      throw registerError
    }

    // Update event registered_volunteers count
    await supabase
      .from('events')
      .update({ registered_volunteers: (event.registered_volunteers || 0) + 1 })
      .eq('id', eventId)

    return res.status(201).json({
      success: true,
      data: registration
    })
  } catch (error) {
    console.error('Register volunteer error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to register volunteer',
      details: error.message
    })
  }
}

/**
 * PUT /api/admin/events/[id]/volunteers
 * Update volunteer registration (status, role, hours credited)
 */
async function updateRegistration(req, res, eventId) {
  try {
    const {
      volunteer_id,
      status,
      role,
      hours_credited,
      notes
    } = req.body

    // Validation
    if (!volunteer_id) {
      return res.status(400).json({
        success: false,
        error: 'volunteer_id is required'
      })
    }

    // Build update object
    const updateData = {}
    if (status !== undefined) updateData.status = status
    if (role !== undefined) updateData.role = role
    if (hours_credited !== undefined) updateData.hours_credited = parseFloat(hours_credited)
    if (notes !== undefined) updateData.notes = notes

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      })
    }

    const { data: registration, error } = await supabase
      .from('event_volunteers')
      .update(updateData)
      .eq('event_id', eventId)
      .eq('volunteer_id', volunteer_id)
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone),
        event:events(id, title, start_time, end_time)
      `)
      .single()

    if (error || !registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found or update failed'
      })
    }

    return res.status(200).json({
      success: true,
      data: registration
    })
  } catch (error) {
    console.error('Update registration error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update registration',
      details: error.message
    })
  }
}

/**
 * DELETE /api/admin/events/[id]/volunteers
 * Remove a volunteer from an event
 */
async function removeVolunteer(req, res, eventId) {
  try {
    const { volunteer_id } = req.body

    // Validation
    if (!volunteer_id) {
      return res.status(400).json({
        success: false,
        error: 'volunteer_id is required'
      })
    }

    // Check if registration exists
    const { data: existing, error: checkError } = await supabase
      .from('event_volunteers')
      .select('id')
      .eq('event_id', eventId)
      .eq('volunteer_id', volunteer_id)
      .single()

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      })
    }

    // Remove registration
    const { error } = await supabase
      .from('event_volunteers')
      .delete()
      .eq('event_id', eventId)
      .eq('volunteer_id', volunteer_id)

    if (error) {
      throw error
    }

    // Update event registered_volunteers count
    const { data: event } = await supabase
      .from('events')
      .select('registered_volunteers')
      .eq('id', eventId)
      .single()

    if (event && event.registered_volunteers > 0) {
      await supabase
        .from('events')
        .update({ registered_volunteers: event.registered_volunteers - 1 })
        .eq('id', eventId)
    }

    return res.status(200).json({
      success: true,
      data: { event_id: eventId, volunteer_id, deleted: true }
    })
  } catch (error) {
    console.error('Remove volunteer error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to remove volunteer',
      details: error.message
    })
  }
}

// Export with staff authentication required
export default requireStaff(handler)

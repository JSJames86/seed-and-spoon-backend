/**
 * Individual Volunteer Hours Entry API Route
 * Manage a specific volunteer hours entry
 *
 * GET    /api/admin/volunteer-hours/[id] - Get hours entry details
 * PUT    /api/admin/volunteer-hours/[id] - Update hours entry
 * DELETE /api/admin/volunteer-hours/[id] - Delete hours entry
 */

import { supabase } from '../../../../lib/supabaseClient'
import { requireStaff, getUserEmail } from '../../../../lib/authMiddleware'

async function handler(req, res) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Hours entry ID is required'
    })
  }

  if (req.method === 'GET') {
    return getHoursEntry(req, res, id)
  }

  if (req.method === 'PUT') {
    return updateHoursEntry(req, res, id)
  }

  if (req.method === 'DELETE') {
    return deleteHoursEntry(req, res, id)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/admin/volunteer-hours/[id]
 * Get hours entry details
 */
async function getHoursEntry(req, res, id) {
  try {
    const { data: hoursEntry, error } = await supabase
      .from('volunteer_hours')
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone, status),
        food_bank:food_banks(id, name, address, city, state, phone),
        task:volunteer_tasks(id, title, task_type, status)
      `)
      .eq('id', id)
      .single()

    if (error || !hoursEntry) {
      return res.status(404).json({
        success: false,
        error: 'Hours entry not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: hoursEntry
    })
  } catch (error) {
    console.error('Get hours entry error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch hours entry',
      details: error.message
    })
  }
}

/**
 * PUT /api/admin/volunteer-hours/[id]
 * Update hours entry (including verification)
 */
async function updateHoursEntry(req, res, id) {
  try {
    const {
      date,
      hours,
      description,
      activity_type,
      verified,
      notes
    } = req.body

    // Build update object with only provided fields
    const updateData = {}

    if (date !== undefined) updateData.date = date
    if (hours !== undefined) {
      const hoursNum = parseFloat(hours)
      if (hoursNum <= 0 || hoursNum > 24) {
        return res.status(400).json({
          success: false,
          error: 'Hours must be between 0 and 24'
        })
      }
      updateData.hours = hoursNum
    }
    if (description !== undefined) updateData.description = description
    if (activity_type !== undefined) updateData.activity_type = activity_type
    if (notes !== undefined) updateData.notes = notes

    // Handle verification
    if (verified !== undefined) {
      updateData.verified = verified
      if (verified === true) {
        updateData.verified_by = getUserEmail(req)
        updateData.verified_at = new Date().toISOString()
      } else {
        updateData.verified_by = null
        updateData.verified_at = null
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      })
    }

    const { data: hoursEntry, error } = await supabase
      .from('volunteer_hours')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone),
        food_bank:food_banks(id, name, city, state),
        task:volunteer_tasks(id, title, task_type)
      `)
      .single()

    if (error || !hoursEntry) {
      return res.status(404).json({
        success: false,
        error: 'Hours entry not found or update failed'
      })
    }

    return res.status(200).json({
      success: true,
      data: hoursEntry
    })
  } catch (error) {
    console.error('Update hours entry error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update hours entry',
      details: error.message
    })
  }
}

/**
 * DELETE /api/admin/volunteer-hours/[id]
 * Delete an hours entry
 */
async function deleteHoursEntry(req, res, id) {
  try {
    const { error } = await supabase
      .from('volunteer_hours')
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
    console.error('Delete hours entry error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete hours entry',
      details: error.message
    })
  }
}

// Export with staff authentication required
export default requireStaff(handler)

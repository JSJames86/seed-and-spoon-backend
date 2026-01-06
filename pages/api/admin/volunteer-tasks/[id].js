/**
 * Individual Volunteer Task API Route
 * Manage a specific volunteer task
 *
 * GET    /api/admin/volunteer-tasks/[id] - Get task details
 * PUT    /api/admin/volunteer-tasks/[id] - Update task
 * DELETE /api/admin/volunteer-tasks/[id] - Delete task
 */

import { supabase } from '../../../../lib/supabaseClient'
import { requireStaff, getUserEmail } from '../../../../lib/authMiddleware'

async function handler(req, res) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Task ID is required'
    })
  }

  if (req.method === 'GET') {
    return getTask(req, res, id)
  }

  if (req.method === 'PUT') {
    return updateTask(req, res, id)
  }

  if (req.method === 'DELETE') {
    return deleteTask(req, res, id)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/admin/volunteer-tasks/[id]
 * Get task details
 */
async function getTask(req, res, id) {
  try {
    const { data: task, error } = await supabase
      .from('volunteer_tasks')
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone, status),
        food_bank:food_banks(id, name, address, city, state, phone)
      `)
      .eq('id', id)
      .single()

    if (error || !task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: task
    })
  } catch (error) {
    console.error('Get task error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch task',
      details: error.message
    })
  }
}

/**
 * PUT /api/admin/volunteer-tasks/[id]
 * Update task details
 */
async function updateTask(req, res, id) {
  try {
    const {
      title,
      description,
      task_type,
      status,
      priority,
      due_date,
      completed_at,
      notes
    } = req.body

    // Build update object with only provided fields
    const updateData = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (task_type !== undefined) updateData.task_type = task_type
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (due_date !== undefined) updateData.due_date = due_date
    if (notes !== undefined) updateData.notes = notes

    // If marking as completed, set completed_at
    if (status === 'completed' && !completed_at) {
      updateData.completed_at = new Date().toISOString()
    } else if (completed_at !== undefined) {
      updateData.completed_at = completed_at
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      })
    }

    const { data: task, error } = await supabase
      .from('volunteer_tasks')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone),
        food_bank:food_banks(id, name, city, state)
      `)
      .single()

    if (error || !task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or update failed'
      })
    }

    return res.status(200).json({
      success: true,
      data: task
    })
  } catch (error) {
    console.error('Update task error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update task',
      details: error.message
    })
  }
}

/**
 * DELETE /api/admin/volunteer-tasks/[id]
 * Delete a task
 */
async function deleteTask(req, res, id) {
  try {
    const { error } = await supabase
      .from('volunteer_tasks')
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
    console.error('Delete task error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete task',
      details: error.message
    })
  }
}

// Export with staff authentication required
export default requireStaff(handler)

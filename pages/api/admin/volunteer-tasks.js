/**
 * Volunteer Tasks API Route
 * Manage task assignments for volunteers
 *
 * GET    /api/admin/volunteer-tasks - List all tasks (with filters)
 * POST   /api/admin/volunteer-tasks - Create new task assignment
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireStaff, getUserEmail } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') {
    return getTasks(req, res)
  }

  if (req.method === 'POST') {
    return createTask(req, res)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/admin/volunteer-tasks
 * List all volunteer tasks with optional filters
 * Query params: volunteer_id, food_bank_id, status, priority, page, limit
 */
async function getTasks(req, res) {
  try {
    const {
      volunteer_id,
      food_bank_id,
      status,
      priority,
      task_type,
      page = '1',
      limit = '50',
      sort = 'created_at',
      order = 'desc'
    } = req.query

    let query = supabase
      .from('volunteer_tasks')
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone),
        food_bank:food_banks(id, name, city, state)
      `, { count: 'exact' })

    // Apply filters
    if (volunteer_id) {
      query = query.eq('volunteer_id', volunteer_id)
    }

    if (food_bank_id) {
      query = query.eq('food_bank_id', food_bank_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (task_type) {
      query = query.eq('task_type', task_type)
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

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum)
      }
    })
  } catch (error) {
    console.error('Get tasks error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch volunteer tasks',
      details: error.message
    })
  }
}

/**
 * POST /api/admin/volunteer-tasks
 * Create a new task assignment
 */
async function createTask(req, res) {
  try {
    const {
      volunteer_id,
      food_bank_id,
      title,
      description,
      task_type,
      priority = 'medium',
      due_date,
      notes
    } = req.body

    // Validation
    if (!volunteer_id || !title) {
      return res.status(400).json({
        success: false,
        error: 'volunteer_id and title are required'
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

    // Create task
    const { data: task, error: createError } = await supabase
      .from('volunteer_tasks')
      .insert([
        {
          volunteer_id,
          food_bank_id: food_bank_id || null,
          title,
          description: description || null,
          task_type: task_type || null,
          priority,
          status: 'assigned',
          due_date: due_date || null,
          assigned_by: getUserEmail(req),
          notes: notes || null
        }
      ])
      .select(`
        *,
        volunteer:volunteers(id, name, email, phone),
        food_bank:food_banks(id, name, city, state)
      `)
      .single()

    if (createError) {
      throw createError
    }

    return res.status(201).json({
      success: true,
      data: task
    })
  } catch (error) {
    console.error('Create task error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create volunteer task',
      details: error.message
    })
  }
}

// Export with staff authentication required
export default requireStaff(handler)

/**
 * Donors API Route
 * Manage donor profiles and contact information
 *
 * GET    /api/admin/donors - List all donors (with filters)
 * POST   /api/admin/donors - Create new donor profile
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireStaff } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') {
    return getDonors(req, res)
  }

  if (req.method === 'POST') {
    return createDonor(req, res)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/admin/donors
 * List all donors with optional filters
 * Query params: status, donor_type, min_donated, search, page, limit
 */
async function getDonors(req, res) {
  try {
    const {
      status,
      donor_type,
      min_donated,
      search,
      page = '1',
      limit = '50',
      sort = 'total_donated',
      order = 'desc'
    } = req.query

    let query = supabase
      .from('donors')
      .select('*', { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (donor_type) {
      query = query.eq('donor_type', donor_type)
    }

    if (min_donated) {
      query = query.gte('total_donated', parseFloat(min_donated))
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
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

    // Get donation stats for these donors
    const donorIds = (data || []).map(d => d.id)
    let donationsData = []

    if (donorIds.length > 0) {
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('donor_id, amount, status, created_at')
        .in('donor_id', donorIds)
        .eq('status', 'succeeded')

      if (!donationsError) {
        donationsData = donations || []
      }
    }

    // Enrich donor data with recent donations
    const enrichedData = (data || []).map(donor => {
      const donorDonations = donationsData.filter(d => d.donor_id === donor.id)
      const recentDonations = donorDonations
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)

      return {
        ...donor,
        recent_donations: recentDonations
      }
    })

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
    console.error('Get donors error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch donors',
      details: error.message
    })
  }
}

/**
 * POST /api/admin/donors
 * Create a new donor profile
 */
async function createDonor(req, res) {
  try {
    const {
      email,
      name,
      phone,
      address,
      city,
      state,
      zip_code,
      donor_type = 'individual',
      status = 'active',
      preferred_contact_method,
      communication_preferences,
      tax_id,
      notes
    } = req.body

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      })
    }

    // Check if donor with this email already exists
    const { data: existingDonor, error: checkError } = await supabase
      .from('donors')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single()

    if (existingDonor) {
      return res.status(409).json({
        success: false,
        error: 'Donor with this email already exists',
        data: existingDonor
      })
    }

    // Create donor
    const { data: donor, error: createError } = await supabase
      .from('donors')
      .insert([
        {
          email: email.toLowerCase(),
          name: name || null,
          phone: phone || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zip_code: zip_code || null,
          donor_type,
          status,
          preferred_contact_method: preferred_contact_method || null,
          communication_preferences: communication_preferences || null,
          tax_id: tax_id || null,
          notes: notes || null
        }
      ])
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return res.status(201).json({
      success: true,
      data: donor
    })
  } catch (error) {
    console.error('Create donor error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create donor',
      details: error.message
    })
  }
}

// Export with staff authentication required
export default requireStaff(handler)

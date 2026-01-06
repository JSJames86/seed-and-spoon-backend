/**
 * Individual Donor API Route
 * Manage a specific donor profile
 *
 * GET    /api/admin/donors/[id] - Get donor details with donation history
 * PUT    /api/admin/donors/[id] - Update donor profile
 * DELETE /api/admin/donors/[id] - Delete donor profile
 */

import { supabase } from '../../../../lib/supabaseClient'
import { requireStaff } from '../../../../lib/authMiddleware'

async function handler(req, res) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Donor ID is required'
    })
  }

  if (req.method === 'GET') {
    return getDonor(req, res, id)
  }

  if (req.method === 'PUT') {
    return updateDonor(req, res, id)
  }

  if (req.method === 'DELETE') {
    return deleteDonor(req, res, id)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/admin/donors/[id]
 * Get donor details with full donation history
 */
async function getDonor(req, res, id) {
  try {
    // Get donor profile
    const { data: donor, error: donorError } = await supabase
      .from('donors')
      .select('*')
      .eq('id', id)
      .single()

    if (donorError || !donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor not found'
      })
    }

    // Get full donation history
    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('*')
      .eq('donor_id', id)
      .order('created_at', { ascending: false })

    if (donationsError) {
      console.error('Donations fetch error:', donationsError)
    }

    // Calculate statistics
    const succeededDonations = (donations || []).filter(d => d.status === 'succeeded')
    const totalDonated = succeededDonations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
    const donationCount = succeededDonations.length

    return res.status(200).json({
      success: true,
      data: {
        ...donor,
        donations: donations || [],
        statistics: {
          total_donated: totalDonated.toFixed(2),
          donation_count: donationCount,
          average_donation: donationCount > 0 ? (totalDonated / donationCount).toFixed(2) : '0.00',
          first_donation: succeededDonations[succeededDonations.length - 1]?.created_at || null,
          last_donation: succeededDonations[0]?.created_at || null
        }
      }
    })
  } catch (error) {
    console.error('Get donor error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch donor',
      details: error.message
    })
  }
}

/**
 * PUT /api/admin/donors/[id]
 * Update donor profile
 */
async function updateDonor(req, res, id) {
  try {
    const {
      name,
      phone,
      address,
      city,
      state,
      zip_code,
      donor_type,
      status,
      preferred_contact_method,
      communication_preferences,
      tax_id,
      notes
    } = req.body

    // Build update object with only provided fields
    const updateData = {}

    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (zip_code !== undefined) updateData.zip_code = zip_code
    if (donor_type !== undefined) updateData.donor_type = donor_type
    if (status !== undefined) updateData.status = status
    if (preferred_contact_method !== undefined) updateData.preferred_contact_method = preferred_contact_method
    if (communication_preferences !== undefined) updateData.communication_preferences = communication_preferences
    if (tax_id !== undefined) updateData.tax_id = tax_id
    if (notes !== undefined) updateData.notes = notes

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      })
    }

    const { data: donor, error } = await supabase
      .from('donors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !donor) {
      return res.status(404).json({
        success: false,
        error: 'Donor not found or update failed'
      })
    }

    return res.status(200).json({
      success: true,
      data: donor
    })
  } catch (error) {
    console.error('Update donor error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update donor',
      details: error.message
    })
  }
}

/**
 * DELETE /api/admin/donors/[id]
 * Delete a donor profile
 * Note: This will set donor_id to NULL in related donations (ON DELETE SET NULL)
 */
async function deleteDonor(req, res, id) {
  try {
    const { error } = await supabase
      .from('donors')
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
    console.error('Delete donor error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete donor',
      details: error.message
    })
  }
}

// Export with staff authentication required
export default requireStaff(handler)

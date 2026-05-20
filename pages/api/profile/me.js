/**
 * User Profile API Route
 * GET /api/profile/me
 * PUT /api/profile/me
 *
 * Allows any authenticated user to view and update their own profile.
 * Demonstrates the requireAuth middleware for any logged-in user.
 *
 * Security: Requires authentication (any role)
 */

import { requireAuth, getUserId } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') {
    return getProfile(req, res)
  }

  if (req.method === 'PUT') {
    return updateProfile(req, res)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/profile/me
 * Returns the authenticated user's profile
 */
async function getProfile(req, res) {
  try {
    const userId = getUserId(req)

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found'
      })
    }

    // Profile is already loaded by middleware, but we can fetch additional data
    const { data: profile, error } = await req.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch profile'
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        profile,
        user: {
          id: req.user.id,
          email: req.user.email,
          created_at: req.user.created_at
        }
      }
    })
  } catch (error) {
    console.error('Error in getProfile:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      details: error.message
    })
  }
}

/**
 * PUT /api/profile/me
 * Updates the authenticated user's profile
 * Users can only update their own profile
 */
async function updateProfile(req, res) {
  try {
    const userId = getUserId(req)
    const { name, phone, address, preferences } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID not found'
      })
    }

    // Build update object with only allowed fields
    const updates = {}
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone
    if (address !== undefined) updates.address = address
    if (preferences !== undefined) updates.preferences = preferences

    // Users cannot change their own role
    // Role can only be changed by admins through a separate endpoint

    updates.updated_at = new Date().toISOString()

    const { data, error } = await req.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        profile: data
      },
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Error in updateProfile:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: error.message
    })
  }
}

// Export with authentication required (any role can access)
export default requireAuth(handler)

/**
 * Authentication & Authorization Middleware for Supabase Auth
 *
 * This middleware validates JWT tokens from Supabase Auth, loads user profiles,
 * and enforces role-based access control (RBAC).
 *
 * Supported roles: admin, client, donor, volunteer
 *
 * Security rules:
 * - Users can ONLY access their own records unless admin
 * - Donors: Can view donation history and pantry allocations
 * - Clients: Can only view their intake data
 * - Volunteers: Can view schedules, tasks, and logged hours
 * - Admins: Full access
 */

import { createClient } from '@supabase/supabase-js'
import { supabase as adminSupabase } from './supabaseClient'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Verify authentication token and load user profile
 * @param {string} authHeader - Authorization header value
 * @returns {Promise<{user: object, profile: object|null, error: null}|{user: null, profile: null, error: string}>}
 */
export async function verifyAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, profile: null, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    // Create a client with the anon key for token verification
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { user: null, profile: null, error: 'Invalid or expired token' }
    }

    // Load user profile from database
    const profile = await loadUserProfile(user.id)

    return { user, profile, error: null }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { user: null, profile: null, error: 'Authentication failed' }
  }
}

/**
 * Load user profile from the profiles table
 * @param {string} userId - User ID from Supabase Auth
 * @returns {Promise<object|null>} - User profile or null
 */
async function loadUserProfile(userId) {
  try {
    const { data, error } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Profile load error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Profile load error:', error)
    return null
  }
}

/**
 * Get user role from profile or auth metadata
 * Priority: profile.role > app_metadata.role > user_metadata.role
 * @param {object} user - User object from Supabase Auth
 * @param {object|null} profile - User profile from database
 * @returns {string|null} - User role (admin, client, donor, volunteer) or null
 */
export function getUserRole(user, profile) {
  // First check profile (highest priority)
  if (profile?.role) {
    return profile.role
  }

  // Check app_metadata (set by admin/backend)
  if (user?.app_metadata?.role) {
    return user.app_metadata.role
  }

  // Check user_metadata (set by user)
  if (user?.user_metadata?.role) {
    return user.user_metadata.role
  }

  return null
}

/**
 * Check if user has a specific role
 * @param {object} user - User object from Supabase Auth
 * @param {object|null} profile - User profile from database
 * @param {string} role - Role to check (admin, client, donor, volunteer)
 * @returns {boolean}
 */
export function hasRole(user, profile, role) {
  const userRole = getUserRole(user, profile)
  return userRole === role
}

/**
 * Check if user has any of the specified roles
 * @param {object} user - User object from Supabase Auth
 * @param {object|null} profile - User profile from database
 * @param {string[]} roles - Array of roles to check
 * @returns {boolean}
 */
export function hasAnyRole(user, profile, roles) {
  const userRole = getUserRole(user, profile)
  return roles.includes(userRole)
}

/**
 * Check if user has admin role
 * @param {object} user - User object from Supabase Auth
 * @param {object|null} profile - User profile from database
 * @returns {boolean}
 */
export function isAdmin(user, profile) {
  return hasRole(user, profile, 'admin')
}

/**
 * Check if user has donor role
 * @param {object} user - User object from Supabase Auth
 * @param {object|null} profile - User profile from database
 * @returns {boolean}
 */
export function isDonor(user, profile) {
  return hasRole(user, profile, 'donor')
}

/**
 * Check if user has client role
 * @param {object} user - User object from Supabase Auth
 * @param {object|null} profile - User profile from database
 * @returns {boolean}
 */
export function isClient(user, profile) {
  return hasRole(user, profile, 'client')
}

/**
 * Check if user has volunteer role
 * @param {object} user - User object from Supabase Auth
 * @param {object|null} profile - User profile from database
 * @returns {boolean}
 */
export function isVolunteer(user, profile) {
  return hasRole(user, profile, 'volunteer')
}

/**
 * Check if user has staff role (includes admin)
 * @param {object} user - User object from Supabase Auth
 * @param {object|null} profile - User profile from database
 * @returns {boolean}
 */
export function isStaff(user, profile) {
  return isAdmin(user, profile) || hasRole(user, profile, 'staff')
}

/**
 * Middleware wrapper for admin-only routes
 * @param {Function} handler - Next.js API route handler
 * @returns {Function} - Wrapped handler with auth check
 */
export function requireAdmin(handler) {
  return async (req, res) => {
    const { user, profile, error } = await verifyAuth(req.headers.authorization)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: error || 'Authentication required'
      })
    }

    if (!isAdmin(user, profile)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      })
    }

    // Attach user and profile to request for handler to use
    req.user = user
    req.profile = profile
    return handler(req, res)
  }
}

/**
 * Middleware wrapper for specific role requirement
 * @param {string} role - Required role (admin, client, donor, volunteer)
 * @returns {Function} - Middleware function
 */
export function requireRole(role) {
  return (handler) => {
    return async (req, res) => {
      const { user, profile, error } = await verifyAuth(req.headers.authorization)

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: error || 'Authentication required'
        })
      }

      if (!hasRole(user, profile, role)) {
        return res.status(403).json({
          success: false,
          error: `${role.charAt(0).toUpperCase() + role.slice(1)} access required`
        })
      }

      // Attach user and profile to request for handler to use
      req.user = user
      req.profile = profile
      return handler(req, res)
    }
  }
}

/**
 * Middleware wrapper for routes requiring any of the specified roles
 * @param {string[]} roles - Array of acceptable roles
 * @returns {Function} - Middleware function
 */
export function requireAnyRole(roles) {
  return (handler) => {
    return async (req, res) => {
      const { user, profile, error } = await verifyAuth(req.headers.authorization)

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: error || 'Authentication required'
        })
      }

      if (!hasAnyRole(user, profile, roles)) {
        return res.status(403).json({
          success: false,
          error: `Access requires one of the following roles: ${roles.join(', ')}`
        })
      }

      // Attach user and profile to request for handler to use
      req.user = user
      req.profile = profile
      return handler(req, res)
    }
  }
}

/**
 * Middleware wrapper for staff routes (includes admin)
 * @param {Function} handler - Next.js API route handler
 * @returns {Function} - Wrapped handler with auth check
 */
export function requireStaff(handler) {
  return async (req, res) => {
    const { user, profile, error } = await verifyAuth(req.headers.authorization)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: error || 'Authentication required'
      })
    }

    if (!isStaff(user, profile)) {
      return res.status(403).json({
        success: false,
        error: 'Staff access required'
      })
    }

    // Attach user and profile to request for handler to use
    req.user = user
    req.profile = profile
    return handler(req, res)
  }
}

/**
 * Middleware wrapper for authenticated routes (any logged-in user)
 * @param {Function} handler - Next.js API route handler
 * @returns {Function} - Wrapped handler with auth check
 */
export function requireAuth(handler) {
  return async (req, res) => {
    const { user, profile, error } = await verifyAuth(req.headers.authorization)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: error || 'Authentication required'
      })
    }

    // Attach user and profile to request for handler to use
    req.user = user
    req.profile = profile
    return handler(req, res)
  }
}

/**
 * Optional authentication - allows both authenticated and unauthenticated access
 * @param {Function} handler - Next.js API route handler
 * @returns {Function} - Wrapped handler with optional auth
 */
export function optionalAuth(handler) {
  return async (req, res) => {
    const { user, profile } = await verifyAuth(req.headers.authorization)

    // Attach user and profile if present, but don't block if not
    req.user = user || null
    req.profile = profile || null
    return handler(req, res)
  }
}

/**
 * Helper to check if user owns a resource
 * @param {object} req - Next.js API request
 * @param {string} resourceUserId - User ID of the resource owner
 * @returns {boolean} - True if user owns resource or is admin
 */
export function canAccessResource(req, resourceUserId) {
  const userId = req.user?.id
  const isUserAdmin = isAdmin(req.user, req.profile)

  return userId === resourceUserId || isUserAdmin
}

/**
 * Helper to get user ID from request
 * @param {object} req - Next.js API request
 * @returns {string|null} - User ID or null
 */
export function getUserId(req) {
  return req.user?.id || null
}

/**
 * Helper to get user email from request
 * @param {object} req - Next.js API request
 * @returns {string|null} - User email or null
 */
export function getUserEmail(req) {
  return req.user?.email || null
}

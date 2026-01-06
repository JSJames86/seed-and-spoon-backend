/**
 * Authentication & Authorization Middleware for Admin Routes
 *
 * This middleware validates JWT tokens from Supabase Auth and checks user roles.
 * Use this to protect admin-only API routes.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Verify authentication token and extract user info
 * @param {string} authHeader - Authorization header value
 * @returns {Promise<{user: object, error: null}|{user: null, error: string}>}
 */
export async function verifyAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    // Create a client with the anon key for token verification
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { user: null, error: 'Invalid or expired token' }
    }

    return { user, error: null }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { user: null, error: 'Authentication failed' }
  }
}

/**
 * Check if user has admin role
 * @param {object} user - User object from Supabase Auth
 * @returns {boolean}
 */
export function isAdmin(user) {
  // Check user metadata for admin role
  // Supabase stores custom claims in app_metadata or user_metadata
  return (
    user?.app_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'admin' ||
    user?.app_metadata?.roles?.includes('admin') ||
    user?.user_metadata?.roles?.includes('admin')
  )
}

/**
 * Check if user has staff role (includes admin)
 * @param {object} user - User object from Supabase Auth
 * @returns {boolean}
 */
export function isStaff(user) {
  return (
    isAdmin(user) ||
    user?.app_metadata?.role === 'staff' ||
    user?.user_metadata?.role === 'staff' ||
    user?.app_metadata?.roles?.includes('staff') ||
    user?.user_metadata?.roles?.includes('staff')
  )
}

/**
 * Middleware wrapper for admin-only routes
 * @param {Function} handler - Next.js API route handler
 * @returns {Function} - Wrapped handler with auth check
 */
export function requireAdmin(handler) {
  return async (req, res) => {
    const { user, error } = await verifyAuth(req.headers.authorization)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: error || 'Authentication required'
      })
    }

    if (!isAdmin(user)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      })
    }

    // Attach user to request for handler to use
    req.user = user
    return handler(req, res)
  }
}

/**
 * Middleware wrapper for staff routes (includes admin)
 * @param {Function} handler - Next.js API route handler
 * @returns {Function} - Wrapped handler with auth check
 */
export function requireStaff(handler) {
  return async (req, res) => {
    const { user, error } = await verifyAuth(req.headers.authorization)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: error || 'Authentication required'
      })
    }

    if (!isStaff(user)) {
      return res.status(403).json({
        success: false,
        error: 'Staff access required'
      })
    }

    // Attach user to request for handler to use
    req.user = user
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
    const { user, error } = await verifyAuth(req.headers.authorization)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: error || 'Authentication required'
      })
    }

    // Attach user to request for handler to use
    req.user = user
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
    const { user } = await verifyAuth(req.headers.authorization)

    // Attach user if present, but don't block if not
    req.user = user || null
    return handler(req, res)
  }
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

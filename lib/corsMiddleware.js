/**
 * CORS Middleware for Next.js API Routes
 *
 * Enforces strict origin allowlist to prevent unauthorized cross-origin requests.
 * Only allows requests from the configured frontend origin.
 *
 * Security Features:
 * - Origin allowlist (no wildcards)
 * - Preflight request handling
 * - Credentials support
 * - Header allowlist
 *
 * Usage:
 * import { withCORS } from '../../../lib/corsMiddleware'
 *
 * async function handler(req, res) {
 *   // Your API logic
 * }
 *
 * export default withCORS(handler)
 */

/**
 * Apply CORS headers to response
 * @param {object} req - Next.js request
 * @param {object} res - Next.js response
 * @returns {boolean} - True if origin is allowed
 */
export function applyCORS(req, res) {
  const origin = req.headers.origin
  const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000'

  // Check if origin is allowed
  if (origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, X-Requested-With'
    )
    res.setHeader('Access-Control-Max-Age', '86400') // 24 hours
    return true
  }

  // Origin not allowed
  return false
}

/**
 * CORS middleware wrapper for API routes
 * @param {Function} handler - Next.js API route handler
 * @returns {Function} - Wrapped handler with CORS
 */
export function withCORS(handler) {
  return async (req, res) => {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      const allowed = applyCORS(req, res)
      if (allowed) {
        return res.status(200).end()
      } else {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Origin not allowed'
        })
      }
    }

    // Apply CORS headers to actual request
    const allowed = applyCORS(req, res)

    if (!allowed && req.headers.origin) {
      // Origin provided but not allowed
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Origin not allowed'
      })
    }

    // Continue to handler
    return handler(req, res)
  }
}

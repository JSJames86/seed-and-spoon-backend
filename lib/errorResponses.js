/**
 * Standardized Error Responses for API
 *
 * Provides consistent error format across all API endpoints:
 * {
 *   "success": false,
 *   "error": "ERROR_CODE",
 *   "message": "Human-readable message"
 * }
 *
 * Security considerations:
 * - Never expose internal error details in production
 * - Use appropriate HTTP status codes
 * - Log detailed errors server-side only
 */

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT: 'INVALID_INPUT',

  // Not found (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Method not allowed (405)
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
}

/**
 * Create standardized error response
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Error code from ErrorCodes
 * @param {string} message - Human-readable message
 * @param {object} details - Optional additional details (only in development)
 * @returns {object} - Standardized error object
 */
export function createErrorResponse(statusCode, errorCode, message, details = null) {
  const response = {
    success: false,
    error: errorCode,
    message
  }

  // Only include details in development
  if (process.env.NODE_ENV === 'development' && details) {
    response.details = details
  }

  return { statusCode, body: response }
}

/**
 * Send standardized error response
 * @param {object} res - Next.js response object
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Error code from ErrorCodes
 * @param {string} message - Human-readable message
 * @param {object} details - Optional additional details
 */
export function sendError(res, statusCode, errorCode, message, details = null) {
  const { body } = createErrorResponse(statusCode, errorCode, message, details)
  return res.status(statusCode).json(body)
}

/**
 * Common error responses
 */
export const Errors = {
  // 401 Unauthenticated
  unauthenticated: (res, message = 'Authentication required') =>
    sendError(res, 401, ErrorCodes.UNAUTHENTICATED, message),

  invalidToken: (res, message = 'Invalid or expired authentication token') =>
    sendError(res, 401, ErrorCodes.INVALID_TOKEN, message),

  // 403 Forbidden
  forbidden: (res, message = 'You do not have access to this resource') =>
    sendError(res, 403, ErrorCodes.FORBIDDEN, message),

  insufficientPermissions: (res, message = 'Insufficient permissions for this action') =>
    sendError(res, 403, ErrorCodes.INSUFFICIENT_PERMISSIONS, message),

  // 400 Validation
  validationError: (res, message = 'Invalid request data', details = null) =>
    sendError(res, 400, ErrorCodes.VALIDATION_ERROR, message, details),

  missingField: (res, field) =>
    sendError(res, 400, ErrorCodes.MISSING_REQUIRED_FIELD, `Missing required field: ${field}`),

  invalidInput: (res, message = 'Invalid input provided') =>
    sendError(res, 400, ErrorCodes.INVALID_INPUT, message),

  // 404 Not Found
  notFound: (res, message = 'Resource not found') =>
    sendError(res, 404, ErrorCodes.NOT_FOUND, message),

  // 405 Method Not Allowed
  methodNotAllowed: (res, allowedMethods = []) => {
    res.setHeader('Allow', allowedMethods)
    return sendError(res, 405, ErrorCodes.METHOD_NOT_ALLOWED, `Method not allowed. Allowed: ${allowedMethods.join(', ')}`)
  },

  // 500 Internal Error
  internalError: (res, message = 'An unexpected error occurred', details = null) =>
    sendError(res, 500, ErrorCodes.INTERNAL_ERROR, message, details),

  databaseError: (res, message = 'Database operation failed') =>
    sendError(res, 500, ErrorCodes.DATABASE_ERROR, message),

  externalServiceError: (res, service = 'external service', message = null) =>
    sendError(res, 500, ErrorCodes.EXTERNAL_SERVICE_ERROR, message || `${service} is unavailable`)
}

/**
 * Success response helper
 * @param {object} res - Next.js response object
 * @param {object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  })
}

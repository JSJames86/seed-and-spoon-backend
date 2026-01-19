/**
 * Stripe Subscriptions API - INTERNAL (Admin Dashboard)
 * GET /api/stripe/subscriptions
 *
 * Fetches subscription list from Stripe for admin dashboard.
 * This is an internal endpoint for the admin dashboard.
 *
 * @query {number} limit - Number of subscriptions to fetch (default: 25, max: 100)
 *
 * @returns {object} - List of Stripe subscriptions
 */

import Stripe from 'stripe'
import { Errors, sendSuccess } from '../../../lib/errorResponses'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get limit from query params (default 25, max 100)
      const limit = Math.min(parseInt(req.query.limit) || 25, 100)

      // Fetch subscriptions from Stripe
      const subscriptions = await stripe.subscriptions.list({
        limit: limit,
        expand: ['data.customer'],
      })

      // Transform data for frontend (remove sensitive fields)
      const safeSubscriptions = subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end,
        canceled_at: sub.canceled_at,
        created: sub.created,
        customer: typeof sub.customer === 'object' ? {
          id: sub.customer.id,
          email: sub.customer.email,
          name: sub.customer.name,
        } : { id: sub.customer },
        metadata: sub.metadata,
      }))

      return sendSuccess(res, {
        subscriptions: safeSubscriptions,
        has_more: subscriptions.has_more,
        total_count: safeSubscriptions.length,
      })

    } catch (error) {
      console.error('Stripe subscriptions fetch error:', error)

      if (error.type) {
        return Errors.externalServiceError(res, 'Stripe', 'Failed to fetch subscriptions from Stripe')
      }

      return Errors.internalError(res, 'Failed to fetch Stripe subscriptions')
    }
  } else {
    return Errors.methodNotAllowed(res, ['GET'])
  }
}

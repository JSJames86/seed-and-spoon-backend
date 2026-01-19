/**
 * Stripe Customers API - INTERNAL (Admin Dashboard)
 * GET /api/stripe/customers
 *
 * Fetches customer list from Stripe for admin dashboard.
 * This is an internal endpoint for the admin dashboard.
 *
 * @query {number} limit - Number of customers to fetch (default: 25, max: 100)
 *
 * @returns {object} - List of Stripe customers
 */

import Stripe from 'stripe'
import { Errors, sendSuccess } from '../../../lib/errorResponses'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get limit from query params (default 25, max 100)
      const limit = Math.min(parseInt(req.query.limit) || 25, 100)

      // Fetch customers from Stripe
      const customers = await stripe.customers.list({
        limit: limit,
      })

      // Transform data for frontend (remove sensitive fields)
      const safeCustomers = customers.data.map(customer => ({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        created: customer.created,
        currency: customer.currency,
        balance: customer.balance,
        delinquent: customer.delinquent,
        description: customer.description,
        metadata: customer.metadata,
      }))

      return sendSuccess(res, {
        customers: safeCustomers,
        has_more: customers.has_more,
        total_count: safeCustomers.length,
      })

    } catch (error) {
      console.error('Stripe customers fetch error:', error)

      if (error.type) {
        return Errors.externalServiceError(res, 'Stripe', 'Failed to fetch customers from Stripe')
      }

      return Errors.internalError(res, 'Failed to fetch Stripe customers')
    }
  } else {
    return Errors.methodNotAllowed(res, ['GET'])
  }
}

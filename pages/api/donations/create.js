/**
 * Donation Creation API - PUBLIC (with CORS)
 * POST /api/donations/create
 *
 * Creates a Stripe Payment Intent for donations.
 * Public endpoint to allow anyone to donate.
 *
 * Security:
 * - CORS restricted to frontend origin only
 * - Input validation
 * - Stripe secret key never exposed
 * - Rate limiting recommended (implement in production)
 *
 * @body {number} amount - Donation amount in dollars (minimum $1)
 * @body {string} donor_email - Donor's email for receipt
 * @body {string} donor_name - Donor's name (optional)
 * @body {string} currency - Currency code (default: 'usd')
 * @body {object} metadata - Additional metadata (optional)
 *
 * @returns {object} - Payment intent details
 */

import Stripe from 'stripe'
import { supabase } from '../../../lib/supabaseClient'
import { withCORS } from '../../../lib/corsMiddleware'
import { Errors, sendSuccess } from '../../../lib/errorResponses'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const {
        amount,
        currency = 'usd',
        donor_email,
        donor_name,
        metadata = {}
      } = req.body

      // Validate required fields
      if (!amount || amount < 1) {
        return Errors.validationError(res, 'Amount must be at least $1.00')
      }

      if (!donor_email) {
        return Errors.missingField(res, 'donor_email')
      }

      // Validate email format (basic)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(donor_email)) {
        return Errors.invalidInput(res, 'Invalid email address')
      }

      // Validate amount is a number
      const donationAmount = parseFloat(amount)
      if (isNaN(donationAmount) || donationAmount < 1) {
        return Errors.validationError(res, 'Invalid donation amount')
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(donationAmount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        receipt_email: donor_email,
        description: `Donation to Seed & Spoon - ${donor_name || donor_email}`,
        metadata: {
          donor_name: donor_name || '',
          donor_email: donor_email,
          organization: 'Seed & Spoon',
          ...metadata
        }
      })

      // Log the pending donation in Supabase
      const { error: dbError } = await supabase
        .from('donations')
        .insert([{
          stripe_payment_intent_id: paymentIntent.id,
          amount: donationAmount,
          currency: currency,
          donor_email: donor_email,
          donor_name: donor_name || null,
          status: 'pending',
          metadata: metadata,
          created_at: new Date().toISOString()
        }])

      if (dbError) {
        console.error('Error logging donation:', dbError)
        // Don't fail the request - Stripe payment intent created successfully
        // The webhook will handle the final status update
      }

      // Return payment intent details (client_secret needed for frontend)
      // SECURITY: Never return stripe_secret_key or sensitive Stripe data
      return sendSuccess(res, {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: donationAmount,
        currency: currency
      })

    } catch (error) {
      console.error('Donation creation error:', error)

      // Check if error is from Stripe
      if (error.type) {
        return Errors.externalServiceError(res, 'Stripe', 'Payment processing failed. Please try again.')
      }

      return Errors.internalError(res, 'Failed to create donation')
    }
  } else {
    return Errors.methodNotAllowed(res, ['POST'])
  }
}

// Export with CORS (public endpoint, no auth required)
export default withCORS(handler)

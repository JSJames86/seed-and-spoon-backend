import Stripe from 'stripe'
import { supabase } from '../../../lib/supabaseClient'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
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
        return res.status(400).json({
          error: 'Invalid amount',
          message: 'Amount must be at least $1.00'
        })
      }

      if (!donor_email) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'Donor email is required'
        })
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
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
          amount: amount,
          currency: currency,
          donor_email: donor_email,
          donor_name: donor_name || null,
          status: 'pending',
          metadata: metadata,
          created_at: new Date().toISOString()
        }])

      if (dbError) {
        console.error('Error logging donation:', dbError)
        // Don't fail the request, just log the error
      }

      return res.status(200).json({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: amount,
        currency: currency
      })

    } catch (error) {
      console.error('Donation creation error:', error)
      return res.status(500).json({
        error: 'Failed to create donation',
        message: error.message
      })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}

import Stripe from 'stripe'
import { supabase } from '../../../lib/supabaseClient'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Donation ID is required' })
  }

  if (req.method === 'GET') {
    try {
      // First, try to fetch from Supabase
      const { data: donation, error } = await supabase
        .from('donations')
        .select('*')
        .eq('stripe_payment_intent_id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        return res.status(500).json({ error: error.message })
      }

      // If not found in Supabase, try Stripe
      if (!donation) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(id)

          return res.status(200).json({
            donation: {
              stripe_payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              status: paymentIntent.status,
              donor_email: paymentIntent.receipt_email,
              created_at: new Date(paymentIntent.created * 1000).toISOString(),
              metadata: paymentIntent.metadata
            },
            source: 'stripe'
          })
        } catch (stripeError) {
          return res.status(404).json({
            error: 'Donation not found',
            message: 'No donation found with this ID'
          })
        }
      }

      // Optionally fetch latest status from Stripe
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(donation.stripe_payment_intent_id)

        return res.status(200).json({
          donation: {
            ...donation,
            stripe_status: paymentIntent.status,
            stripe_updated_at: new Date(paymentIntent.created * 1000).toISOString()
          },
          source: 'database'
        })
      } catch (stripeError) {
        // If Stripe fetch fails, just return database data
        return res.status(200).json({
          donation: donation,
          source: 'database'
        })
      }

    } catch (error) {
      console.error('Error fetching donation:', error)
      return res.status(500).json({
        error: 'Failed to fetch donation',
        message: error.message
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}

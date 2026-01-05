import Stripe from 'stripe'
import { supabase } from '../../../lib/supabaseClient'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper to read raw body
async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object

        // Log donation to Supabase
        const { error } = await supabase.from('donations').insert([
          {
            stripe_payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount / 100, // Convert from cents
            currency: paymentIntent.currency,
            donor_email: paymentIntent.receipt_email,
            status: 'succeeded',
            metadata: paymentIntent.metadata,
            created_at: new Date(paymentIntent.created * 1000).toISOString(),
          },
        ])

        if (error) {
          console.error('Error logging donation:', error)
          return res.status(500).json({ error: 'Failed to log donation' })
        }

        console.log('Donation logged successfully:', paymentIntent.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object

        // Log failed donation attempt
        const { error } = await supabase.from('donations').insert([
          {
            stripe_payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            donor_email: paymentIntent.receipt_email,
            status: 'failed',
            metadata: paymentIntent.metadata,
            created_at: new Date(paymentIntent.created * 1000).toISOString(),
          },
        ])

        if (error) {
          console.error('Error logging failed donation:', error)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

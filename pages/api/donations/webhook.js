import Stripe from 'stripe'
import { supabase } from '../../../lib/supabaseClient'
import { sendDonationConfirmation } from '../../../lib/emailService'

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

/**
 * Look up a donor by email address. Returns null if not found.
 */
async function findDonorByEmail(email) {
  if (!email) return null
  const { data } = await supabase
    .from('donors')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()
  return data || null
}

/**
 * After a successful payment, create a gift record and queue an acknowledgment.
 * Skips silently if a gift already exists for this donation (idempotency).
 */
async function createGiftFromPayment(donationId, paymentIntent) {
  const amount = paymentIntent.amount / 100
  const receiptEmail = paymentIntent.receipt_email
  const giftDate = new Date(paymentIntent.created * 1000).toISOString().split('T')[0]
  const campaignId = paymentIntent.metadata?.campaign_id || null

  const donor = await findDonorByEmail(receiptEmail)
  if (!donor) {
    // No donor profile yet — gift cannot be attributed. The staff can link
    // it manually after creating a donor record.
    console.log(`Webhook: no donor profile for ${receiptEmail}, skipping gift creation`)
    return
  }

  // Idempotency: skip if a gift already references this donation
  const { data: existing } = await supabase
    .from('gifts')
    .select('id')
    .eq('donation_id', donationId)
    .single()

  if (existing) {
    console.log(`Webhook: gift already exists for donation ${donationId}`)
    return
  }

  const { data: gift, error: giftErr } = await supabase
    .from('gifts')
    .insert([{
      donor_id: donor.id,
      donation_id: donationId,
      campaign_id: campaignId,
      amount,
      currency: (paymentIntent.currency || 'usd').toUpperCase(),
      gift_date: giftDate,
      payment_method: 'stripe',
      acknowledgment_status: 'pending',
    }])
    .select()
    .single()

  if (giftErr) {
    console.error('Webhook: failed to create gift record:', giftErr)
    return
  }

  // Queue a pending acknowledgment (required for gifts >= $250 under IRS rules)
  const { error: ackErr } = await supabase.from('acknowledgments').insert([{
    gift_id: gift.id,
    donor_id: donor.id,
    status: 'pending',
    irs_compliant: false,
  }])

  if (ackErr) {
    console.error('Webhook: failed to queue acknowledgment:', ackErr)
  } else {
    console.log(`Webhook: gift ${gift.id} created and acknowledgment queued for donor ${donor.id}`)
  }
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

        // Upsert the donation record (may already exist from /donations/create)
        const { data: donation, error } = await supabase
          .from('donations')
          .upsert(
            [{
              stripe_payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              donor_email: paymentIntent.receipt_email,
              status: 'succeeded',
              metadata: paymentIntent.metadata,
              created_at: new Date(paymentIntent.created * 1000).toISOString(),
            }],
            { onConflict: 'stripe_payment_intent_id' }
          )
          .select('id')
          .single()

        if (error) {
          console.error('Webhook: error upserting donation:', error)
          return res.status(500).json({ error: 'Failed to log donation' })
        }

        console.log('Webhook: donation logged successfully:', paymentIntent.id)

        // Send confirmation email to donor
        if (paymentIntent.receipt_email) {
          const emailResult = await sendDonationConfirmation({
            donorEmail: paymentIntent.receipt_email,
            donorName: paymentIntent.metadata?.donor_name || undefined,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            paymentIntentId: paymentIntent.id,
            donationDate: new Date(paymentIntent.created * 1000).toISOString(),
          })
          if (!emailResult.success) {
            console.error('Webhook: failed to send confirmation email:', emailResult.error)
          }
        }

        // Create gift record + queue acknowledgment for donor CRM
        await createGiftFromPayment(donation.id, paymentIntent)
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
          console.error('Webhook: error logging failed donation:', error)
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

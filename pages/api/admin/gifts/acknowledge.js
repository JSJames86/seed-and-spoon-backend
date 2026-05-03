/**
 * POST /api/admin/gifts/acknowledge
 *
 * Marks an acknowledgment as sent and updates the parent gift's
 * acknowledgment_status to 'sent'.
 *
 * Body:
 *   gift_id      - required
 *   method       - 'email' | 'letter' | 'both' (default: 'email')
 *   irs_compliant - boolean (default: false)
 *   notes        - optional
 *
 * This route records the acknowledgment. Actual email delivery is handled
 * by your email service (e.g., Resend, SendGrid) — call that service before
 * hitting this endpoint, or wire it in here once an email provider is added.
 */

import { supabase } from '../../../../lib/supabaseClient'
import { requireStaff } from '../../../../lib/authMiddleware'
import { Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method !== 'POST') return Errors.methodNotAllowed(res, ['POST'])

  try {
    const {
      gift_id,
      method = 'email',
      irs_compliant = false,
      notes,
    } = req.body

    if (!gift_id) return Errors.missingField(res, 'gift_id')

    const validMethods = ['email', 'letter', 'both']
    if (!validMethods.includes(method)) {
      return Errors.validationError(res, `method must be one of: ${validMethods.join(', ')}`)
    }

    // Load gift to get donor_id and confirm it exists
    const { data: gift, error: giftErr } = await supabase
      .from('gifts')
      .select('id, donor_id, amount, gift_date, acknowledgment_status')
      .eq('id', gift_id)
      .single()

    if (giftErr || !gift) {
      return res.status(404).json({ success: false, error: 'Gift not found' })
    }

    const now = new Date().toISOString()

    // Upsert the acknowledgment record (one per gift)
    const { data: ack, error: ackErr } = await supabase
      .from('acknowledgments')
      .upsert(
        [{
          gift_id,
          donor_id: gift.donor_id,
          method,
          sent_at: now,
          sent_by: req.user?.id || null,
          irs_compliant: irs_compliant === true || irs_compliant === 'true',
          notes: notes || null,
          status: 'sent',
        }],
        { onConflict: 'gift_id' }
      )
      .select()
      .single()

    if (ackErr) throw ackErr

    // Update parent gift acknowledgment_status
    await supabase
      .from('gifts')
      .update({ acknowledgment_status: 'sent' })
      .eq('id', gift_id)

    return res.status(200).json({
      success: true,
      data: {
        acknowledgment: ack,
        gift_id,
        sent_at: now,
        irs_compliant: ack.irs_compliant,
      },
    })
  } catch (error) {
    console.error('Acknowledge gift error:', error)
    return Errors.databaseError(res, 'Failed to record acknowledgment')
  }
}

export default requireStaff(handler)

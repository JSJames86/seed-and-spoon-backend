/**
 * GET    /api/admin/gifts/[id] - Gift detail with acknowledgments
 * PUT    /api/admin/gifts/[id] - Update gift
 * DELETE /api/admin/gifts/[id] - Delete gift
 */

import { supabase } from '../../../../lib/supabaseClient'
import { requireStaff } from '../../../../lib/authMiddleware'
import { Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  const { id } = req.query

  if (!id) return Errors.missingField(res, 'id')

  if (req.method === 'GET') return getGift(req, res, id)
  if (req.method === 'PUT') return updateGift(req, res, id)
  if (req.method === 'DELETE') return deleteGift(req, res, id)
  return Errors.methodNotAllowed(res, ['GET', 'PUT', 'DELETE'])
}

async function getGift(req, res, id) {
  try {
    const { data: gift, error } = await supabase
      .from('gifts')
      .select(`
        *,
        donors(id, name, email, donor_type, phone),
        campaigns(id, name, channel, goal),
        donations(id, stripe_payment_intent_id, status),
        acknowledgments(id, status, method, sent_at, irs_compliant, notes)
      `)
      .eq('id', id)
      .single()

    if (error || !gift) {
      return res.status(404).json({ success: false, error: 'Gift not found' })
    }

    return res.status(200).json({ success: true, data: gift })
  } catch (error) {
    console.error('Get gift error:', error)
    return Errors.databaseError(res, 'Failed to fetch gift')
  }
}

async function updateGift(req, res, id) {
  try {
    const {
      campaign_id,
      amount,
      currency,
      gift_date,
      payment_method,
      check_number,
      in_kind_description,
      fund_designation,
      acknowledgment_status,
      notes,
    } = req.body

    const updateData = {}
    if (campaign_id !== undefined) updateData.campaign_id = campaign_id || null
    if (amount !== undefined) {
      const parsed = parseFloat(amount)
      if (isNaN(parsed) || parsed <= 0) {
        return Errors.validationError(res, 'amount must be a positive number')
      }
      updateData.amount = parsed
    }
    if (currency !== undefined) updateData.currency = currency.toUpperCase()
    if (gift_date !== undefined) updateData.gift_date = gift_date
    if (payment_method !== undefined) updateData.payment_method = payment_method
    if (check_number !== undefined) updateData.check_number = check_number || null
    if (in_kind_description !== undefined) updateData.in_kind_description = in_kind_description || null
    if (fund_designation !== undefined) updateData.fund_designation = fund_designation || null
    if (acknowledgment_status !== undefined) updateData.acknowledgment_status = acknowledgment_status
    if (notes !== undefined) updateData.notes = notes || null

    if (Object.keys(updateData).length === 0) {
      return Errors.validationError(res, 'No fields to update')
    }

    const { data: gift, error } = await supabase
      .from('gifts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !gift) {
      return res.status(404).json({ success: false, error: 'Gift not found or update failed' })
    }

    return res.status(200).json({ success: true, data: gift })
  } catch (error) {
    console.error('Update gift error:', error)
    return Errors.databaseError(res, 'Failed to update gift')
  }
}

async function deleteGift(req, res, id) {
  try {
    const { error } = await supabase.from('gifts').delete().eq('id', id)
    if (error) throw error
    return res.status(200).json({ success: true, data: { id, deleted: true } })
  } catch (error) {
    console.error('Delete gift error:', error)
    return Errors.databaseError(res, 'Failed to delete gift')
  }
}

export default requireStaff(handler)

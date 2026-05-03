/**
 * GET  /api/admin/gifts - List gifts with filters and donor/campaign detail
 * POST /api/admin/gifts - Record a new gift (any payment method)
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireStaff } from '../../../lib/authMiddleware'
import { Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return listGifts(req, res)
  if (req.method === 'POST') return createGift(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function listGifts(req, res) {
  try {
    const {
      donor_id,
      campaign_id,
      payment_method,
      acknowledgment_status,
      start_date,
      end_date,
      page = '1',
      limit = '50',
      sort = 'gift_date',
      order = 'desc',
    } = req.query

    let query = supabase
      .from('gifts')
      .select(
        `*,
        donors(id, name, email, donor_type),
        campaigns(id, name, channel),
        acknowledgments(id, status, sent_at, method, irs_compliant)`,
        { count: 'exact' }
      )

    if (donor_id) query = query.eq('donor_id', donor_id)
    if (campaign_id) query = query.eq('campaign_id', campaign_id)
    if (payment_method) query = query.eq('payment_method', payment_method)
    if (acknowledgment_status) query = query.eq('acknowledgment_status', acknowledgment_status)
    if (start_date) query = query.gte('gift_date', start_date)
    if (end_date) query = query.lte('gift_date', end_date)

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limitNum - 1)

    const { data, error, count } = await query
    if (error) throw error

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
    })
  } catch (error) {
    console.error('List gifts error:', error)
    return Errors.databaseError(res, 'Failed to fetch gifts')
  }
}

async function createGift(req, res) {
  try {
    const {
      donor_id,
      donation_id,
      campaign_id,
      amount,
      currency = 'USD',
      gift_date,
      payment_method = 'stripe',
      check_number,
      in_kind_description,
      fund_designation,
      notes,
    } = req.body

    if (!donor_id) return Errors.missingField(res, 'donor_id')
    if (!amount || parseFloat(amount) <= 0) {
      return Errors.validationError(res, 'amount must be a positive number')
    }

    // Confirm donor exists
    const { data: donor, error: donorErr } = await supabase
      .from('donors')
      .select('id')
      .eq('id', donor_id)
      .single()

    if (donorErr || !donor) {
      return res.status(404).json({ success: false, error: 'Donor not found' })
    }

    const { data: gift, error: insertErr } = await supabase
      .from('gifts')
      .insert([{
        donor_id,
        donation_id: donation_id || null,
        campaign_id: campaign_id || null,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        gift_date: gift_date || new Date().toISOString().split('T')[0],
        payment_method,
        check_number: check_number || null,
        in_kind_description: in_kind_description || null,
        fund_designation: fund_designation || null,
        acknowledgment_status: 'pending',
        notes: notes || null,
        created_by: req.user?.id || null,
      }])
      .select()
      .single()

    if (insertErr) throw insertErr

    // Auto-create a pending acknowledgment record
    await supabase.from('acknowledgments').insert([{
      gift_id: gift.id,
      donor_id,
      status: 'pending',
    }])

    return res.status(201).json({ success: true, data: gift })
  } catch (error) {
    console.error('Create gift error:', error)
    return Errors.databaseError(res, 'Failed to create gift')
  }
}

export default requireStaff(handler)

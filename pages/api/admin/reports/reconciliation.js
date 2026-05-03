/**
 * GET  /api/admin/reports/reconciliation
 *   Returns all reconciliation records (or filtered by year/status).
 *
 * POST /api/admin/reports/reconciliation
 *   Creates or updates a reconciliation record for a given month.
 *   Automatically computes db_total from gifts; caller supplies stripe_total.
 *
 * Query params (GET):
 *   year    - filter by year  (e.g. 2025)
 *   status  - 'pending' | 'in_review' | 'reconciled' | 'flagged'
 *
 * Body (POST):
 *   period_year            - required integer
 *   period_month           - required integer 1–12
 *   stripe_total           - required decimal (from Stripe dashboard)
 *   transaction_count_stripe - optional integer
 *   notes                  - optional string
 */

import { supabase } from '../../../../lib/supabaseClient'
import { requireStaff } from '../../../../lib/authMiddleware'
import { Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return listReconciliations(req, res)
  if (req.method === 'POST') return upsertReconciliation(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function listReconciliations(req, res) {
  try {
    const { year, status } = req.query

    let query = supabase
      .from('reconciliations')
      .select('*, profiles(full_name, email)')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })

    if (year) query = query.eq('period_year', parseInt(year))
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return res.status(200).json({ success: true, data: data || [] })
  } catch (error) {
    console.error('List reconciliations error:', error)
    return Errors.databaseError(res, 'Failed to fetch reconciliations')
  }
}

async function upsertReconciliation(req, res) {
  try {
    const {
      period_year,
      period_month,
      stripe_total,
      transaction_count_stripe,
      notes,
    } = req.body

    if (!period_year) return Errors.missingField(res, 'period_year')
    if (!period_month) return Errors.missingField(res, 'period_month')
    if (stripe_total === undefined || stripe_total === null) {
      return Errors.missingField(res, 'stripe_total')
    }

    const year = parseInt(period_year)
    const month = parseInt(period_month)

    if (month < 1 || month > 12) {
      return Errors.validationError(res, 'period_month must be 1–12')
    }

    // Compute DB total from gifts for this month
    // gift_date range: YYYY-MM-01 to YYYY-MM-<last day>
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data: gifts, error: giftsErr } = await supabase
      .from('gifts')
      .select('amount')
      .gte('gift_date', periodStart)
      .lte('gift_date', periodEnd)

    if (giftsErr) throw giftsErr

    const giftList = gifts || []
    const db_total = parseFloat(
      giftList.reduce((sum, g) => sum + parseFloat(g.amount || 0), 0).toFixed(2)
    )
    const transaction_count_db = giftList.length

    const payload = {
      period_year: year,
      period_month: month,
      stripe_total: parseFloat(parseFloat(stripe_total).toFixed(2)),
      db_total,
      transaction_count_stripe: transaction_count_stripe ? parseInt(transaction_count_stripe) : null,
      transaction_count_db,
      notes: notes || null,
      // Only set status to 'in_review' on initial creation; preserve existing status on update
    }

    // Upsert on (period_year, period_month) unique constraint
    const { data: existing } = await supabase
      .from('reconciliations')
      .select('id, status')
      .eq('period_year', year)
      .eq('period_month', month)
      .single()

    let result
    if (existing) {
      const { data, error } = await supabase
        .from('reconciliations')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('reconciliations')
        .insert([{ ...payload, status: 'in_review' }])
        .select()
        .single()
      if (error) throw error
      result = data
    }

    const flagged = Math.abs(result.variance) > 0.01
    if (flagged && result.status === 'in_review') {
      await supabase
        .from('reconciliations')
        .update({ status: 'flagged' })
        .eq('id', result.id)
      result.status = 'flagged'
    }

    return res.status(existing ? 200 : 201).json({ success: true, data: result })
  } catch (error) {
    console.error('Upsert reconciliation error:', error)
    return Errors.databaseError(res, 'Failed to save reconciliation')
  }
}

export default requireStaff(handler)

/**
 * GET /api/admin/reports/fundraising
 *
 * KPI summary for the development/donor ops dashboard.
 *
 * Query params:
 *   start_date  - ISO date string (default: start of current calendar year)
 *   end_date    - ISO date string (default: today)
 *   campaign_id - filter to a single campaign (optional)
 *
 * Returns:
 *   total_raised        - sum of all gifts in window
 *   donor_count         - unique donors who gave in window
 *   gift_count          - number of gifts
 *   average_gift        - total_raised / gift_count
 *   largest_gift        - single largest gift
 *   retention_rate      - % of donors who gave in the prior equivalent window AND in this window
 *   new_donors          - donors whose first-ever gift falls in this window
 *   lapsed_donors       - donors who gave in prior window but NOT in current window
 *   acknowledgment_rate - % of gifts with acknowledgment_status = 'sent'
 *   by_payment_method   - breakdown by payment method
 *   by_campaign         - breakdown by campaign
 *   monthly_trend       - month-by-month totals for the window
 */

import { supabase } from '../../../../lib/supabaseClient'
import { requireStaff } from '../../../../lib/authMiddleware'
import { Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method !== 'GET') return Errors.methodNotAllowed(res, ['GET'])

  try {
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    const defaultEnd = now.toISOString().split('T')[0]

    const {
      start_date = defaultStart,
      end_date = defaultEnd,
      campaign_id,
    } = req.query

    // Compute prior window of equal length for retention/lapse
    const startMs = new Date(start_date).getTime()
    const endMs = new Date(end_date).getTime()
    const windowMs = endMs - startMs
    const priorStart = new Date(startMs - windowMs).toISOString().split('T')[0]
    const priorEnd = new Date(endMs - windowMs).toISOString().split('T')[0]

    // --- Fetch current-window gifts ---
    let currentQuery = supabase
      .from('gifts')
      .select('id, donor_id, amount, gift_date, payment_method, acknowledgment_status, campaign_id, campaigns(name)')
      .gte('gift_date', start_date)
      .lte('gift_date', end_date)

    if (campaign_id) currentQuery = currentQuery.eq('campaign_id', campaign_id)

    const { data: currentGifts, error: currentErr } = await currentQuery
    if (currentErr) throw currentErr

    const gifts = currentGifts || []

    // --- Fetch prior-window donor IDs for retention calc ---
    const { data: priorGifts } = await supabase
      .from('gifts')
      .select('donor_id')
      .gte('gift_date', priorStart)
      .lte('gift_date', priorEnd)

    const priorDonorIds = new Set((priorGifts || []).map((g) => g.donor_id))

    // --- Fetch all-time first-gift dates for new-donor calc ---
    const currentDonorIds = [...new Set(gifts.map((g) => g.donor_id))]

    let firstGiftByDonor = {}
    if (currentDonorIds.length > 0) {
      const { data: firstGifts } = await supabase
        .from('gifts')
        .select('donor_id, gift_date')
        .in('donor_id', currentDonorIds)
        .order('gift_date', { ascending: true })

      for (const fg of firstGifts || []) {
        if (!firstGiftByDonor[fg.donor_id]) {
          firstGiftByDonor[fg.donor_id] = fg.gift_date
        }
      }
    }

    // --- Core KPIs ---
    const total_raised = gifts.reduce((sum, g) => sum + parseFloat(g.amount || 0), 0)
    const gift_count = gifts.length
    const unique_donors = new Set(gifts.map((g) => g.donor_id))
    const donor_count = unique_donors.size
    const average_gift = gift_count > 0 ? total_raised / gift_count : 0
    const largest_gift = gifts.reduce((max, g) => Math.max(max, parseFloat(g.amount || 0)), 0)

    // Retention: donors in current window who also gave in prior window
    const retained = [...unique_donors].filter((did) => priorDonorIds.has(did))
    const retention_rate =
      priorDonorIds.size > 0
        ? parseFloat(((retained.length / priorDonorIds.size) * 100).toFixed(1))
        : null

    // New donors: first gift ever falls within current window
    const new_donors = [...unique_donors].filter((did) => {
      const first = firstGiftByDonor[did]
      return first && first >= start_date && first <= end_date
    }).length

    // Lapsed donors: gave in prior window but NOT in current window
    const lapsed_donors = [...priorDonorIds].filter((did) => !unique_donors.has(did)).length

    // Acknowledgment rate
    const acked = gifts.filter((g) => g.acknowledgment_status === 'sent').length
    const acknowledgment_rate =
      gift_count > 0 ? parseFloat(((acked / gift_count) * 100).toFixed(1)) : 0

    // Breakdown by payment method
    const byMethod = {}
    for (const g of gifts) {
      const m = g.payment_method || 'unknown'
      if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 }
      byMethod[m].count++
      byMethod[m].total = parseFloat((byMethod[m].total + parseFloat(g.amount || 0)).toFixed(2))
    }

    // Breakdown by campaign
    const byCampaign = {}
    for (const g of gifts) {
      const cid = g.campaign_id || 'unattributed'
      const cname = g.campaigns?.name || 'Unattributed'
      if (!byCampaign[cid]) byCampaign[cid] = { name: cname, count: 0, total: 0 }
      byCampaign[cid].count++
      byCampaign[cid].total = parseFloat((byCampaign[cid].total + parseFloat(g.amount || 0)).toFixed(2))
    }

    // Month-by-month trend
    const monthMap = {}
    for (const g of gifts) {
      const key = g.gift_date.substring(0, 7) // 'YYYY-MM'
      if (!monthMap[key]) monthMap[key] = { month: key, count: 0, total: 0 }
      monthMap[key].count++
      monthMap[key].total = parseFloat((monthMap[key].total + parseFloat(g.amount || 0)).toFixed(2))
    }
    const monthly_trend = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))

    return res.status(200).json({
      success: true,
      data: {
        period: { start_date, end_date },
        total_raised: parseFloat(total_raised.toFixed(2)),
        donor_count,
        gift_count,
        average_gift: parseFloat(average_gift.toFixed(2)),
        largest_gift: parseFloat(largest_gift.toFixed(2)),
        new_donors,
        retention_rate,
        lapsed_donors,
        acknowledgment_rate,
        by_payment_method: byMethod,
        by_campaign: Object.values(byCampaign),
        monthly_trend,
      },
    })
  } catch (error) {
    console.error('Fundraising report error:', error)
    return Errors.databaseError(res, 'Failed to generate fundraising report')
  }
}

export default requireStaff(handler)

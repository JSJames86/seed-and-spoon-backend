/**
 * GET  /api/admin/campaigns - List campaigns with raised totals
 * POST /api/admin/campaigns - Create a new campaign
 */

import { supabase } from '../../../lib/supabaseClient'
import { requireStaff } from '../../../lib/authMiddleware'
import { Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'GET') return listCampaigns(req, res)
  if (req.method === 'POST') return createCampaign(req, res)
  return Errors.methodNotAllowed(res, ['GET', 'POST'])
}

async function listCampaigns(req, res) {
  try {
    const {
      status,
      channel,
      page = '1',
      limit = '50',
      sort = 'created_at',
      order = 'desc',
    } = req.query

    let query = supabase
      .from('campaigns')
      .select('*', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (channel) query = query.eq('channel', channel)

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limitNum - 1)

    const { data, error, count } = await query
    if (error) throw error

    // Enrich with raised totals from gifts
    const campaignIds = (data || []).map((c) => c.id)
    let giftsData = []

    if (campaignIds.length > 0) {
      const { data: gifts } = await supabase
        .from('gifts')
        .select('campaign_id, amount')
        .in('campaign_id', campaignIds)

      giftsData = gifts || []
    }

    const enriched = (data || []).map((campaign) => {
      const campaignGifts = giftsData.filter((g) => g.campaign_id === campaign.id)
      const total_raised = campaignGifts.reduce((sum, g) => sum + parseFloat(g.amount || 0), 0)
      const gift_count = campaignGifts.length
      return {
        ...campaign,
        total_raised: parseFloat(total_raised.toFixed(2)),
        gift_count,
        progress_pct:
          campaign.goal && campaign.goal > 0
            ? parseFloat(((total_raised / campaign.goal) * 100).toFixed(1))
            : null,
      }
    })

    return res.status(200).json({
      success: true,
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
    })
  } catch (error) {
    console.error('List campaigns error:', error)
    return Errors.databaseError(res, 'Failed to fetch campaigns')
  }
}

async function createCampaign(req, res) {
  try {
    const {
      name,
      description,
      goal,
      channel,
      start_date,
      end_date,
      status = 'active',
    } = req.body

    if (!name) return Errors.missingField(res, 'name')

    const validStatuses = ['draft', 'active', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return Errors.validationError(res, `status must be one of: ${validStatuses.join(', ')}`)
    }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert([{
        name: name.trim(),
        description: description || null,
        goal: goal ? parseFloat(goal) : null,
        channel: channel || null,
        start_date: start_date || null,
        end_date: end_date || null,
        status,
        created_by: req.user?.id || null,
      }])
      .select()
      .single()

    if (error) throw error

    return res.status(201).json({ success: true, data: campaign })
  } catch (error) {
    console.error('Create campaign error:', error)
    return Errors.databaseError(res, 'Failed to create campaign')
  }
}

export default requireStaff(handler)

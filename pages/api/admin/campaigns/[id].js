/**
 * GET    /api/admin/campaigns/[id] - Campaign detail with gift breakdown
 * PUT    /api/admin/campaigns/[id] - Update campaign
 * DELETE /api/admin/campaigns/[id] - Delete campaign
 */

import { supabase } from '../../../../lib/supabaseClient'
import { requireStaff } from '../../../../lib/authMiddleware'
import { Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  const { id } = req.query
  if (!id) return Errors.missingField(res, 'id')

  if (req.method === 'GET') return getCampaign(req, res, id)
  if (req.method === 'PUT') return updateCampaign(req, res, id)
  if (req.method === 'DELETE') return deleteCampaign(req, res, id)
  return Errors.methodNotAllowed(res, ['GET', 'PUT', 'DELETE'])
}

async function getCampaign(req, res, id) {
  try {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' })
    }

    // Gift stats for this campaign
    const { data: gifts } = await supabase
      .from('gifts')
      .select('id, amount, gift_date, payment_method, donor_id, acknowledgment_status, donors(id, name, email)')
      .eq('campaign_id', id)
      .order('gift_date', { ascending: false })

    const giftList = gifts || []
    const total_raised = giftList.reduce((sum, g) => sum + parseFloat(g.amount || 0), 0)

    return res.status(200).json({
      success: true,
      data: {
        ...campaign,
        total_raised: parseFloat(total_raised.toFixed(2)),
        gift_count: giftList.length,
        progress_pct:
          campaign.goal && campaign.goal > 0
            ? parseFloat(((total_raised / campaign.goal) * 100).toFixed(1))
            : null,
        gifts: giftList,
      },
    })
  } catch (error) {
    console.error('Get campaign error:', error)
    return Errors.databaseError(res, 'Failed to fetch campaign')
  }
}

async function updateCampaign(req, res, id) {
  try {
    const { name, description, goal, channel, start_date, end_date, status } = req.body

    const updateData = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description || null
    if (goal !== undefined) updateData.goal = goal ? parseFloat(goal) : null
    if (channel !== undefined) updateData.channel = channel || null
    if (start_date !== undefined) updateData.start_date = start_date || null
    if (end_date !== undefined) updateData.end_date = end_date || null
    if (status !== undefined) {
      const validStatuses = ['draft', 'active', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return Errors.validationError(res, `status must be one of: ${validStatuses.join(', ')}`)
      }
      updateData.status = status
    }

    if (Object.keys(updateData).length === 0) {
      return Errors.validationError(res, 'No fields to update')
    }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found or update failed' })
    }

    return res.status(200).json({ success: true, data: campaign })
  } catch (error) {
    console.error('Update campaign error:', error)
    return Errors.databaseError(res, 'Failed to update campaign')
  }
}

async function deleteCampaign(req, res, id) {
  try {
    // Gifts with this campaign_id will have campaign_id set to NULL (ON DELETE SET NULL)
    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (error) throw error
    return res.status(200).json({ success: true, data: { id, deleted: true } })
  } catch (error) {
    console.error('Delete campaign error:', error)
    return Errors.databaseError(res, 'Failed to delete campaign')
  }
}

export default requireStaff(handler)

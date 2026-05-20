/**
 * Board Voting API
 * POST: Cast a vote
 */
import { requireAnyRole, getUserId } from '../../../lib/authMiddleware'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return Errors.methodNotAllowed(res, ['POST'])
  }

  const userId = getUserId(req)
  const { vote_id, vote } = req.body // vote: 'for', 'against', 'abstain'

  if (!vote_id || !vote) {
    return Errors.missingField(res, 'vote_id and vote are required')
  }

  const validVotes = ['for', 'against', 'abstain']
  if (!validVotes.includes(vote)) {
    return Errors.invalidInput(res, `vote must be one of: ${validVotes.join(', ')}`)
  }

  try {
    // Check that the vote is still open
    const { data: boardVote } = await req.supabase
      .from('board_votes')
      .select('status')
      .eq('id', vote_id)
      .single()

    if (!boardVote || boardVote.status !== 'open') {
      return res.status(400).json({ success: false, error: 'Vote is not open' })
    }

    // Cast vote (upsert to allow changing vote while open)
    const { data, error } = await req.supabase
      .from('vote_records')
      .upsert({
        vote_id,
        member_id: userId,
        vote,
        voted_at: new Date().toISOString()
      }, { onConflict: 'vote_id,member_id' })
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAnyRole(['board_member', 'executive_director'])(handler)

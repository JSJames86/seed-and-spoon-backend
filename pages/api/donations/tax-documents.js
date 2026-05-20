/**
 * Tax Documents API
 * GET: List donor's tax documents
 */
import { requireAuth, getUserId, getUserEmail } from '../../../lib/authMiddleware'
import { sendSuccess, Errors } from '../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return Errors.methodNotAllowed(res, ['GET'])
  }

  const userId = getUserId(req)
  const email = getUserEmail(req)
  const { year } = req.query

  try {
    // Find the donor record for this user
    const { data: donor, error: donorError } = await req.supabase
      .from('donors')
      .select('id')
      .eq('email', email)
      .single()

    if (donorError || !donor) {
      return sendSuccess(res, [])
    }

    let query = req.supabase
      .from('tax_documents')
      .select('*')
      .eq('donor_id', donor.id)
      .order('tax_year', { ascending: false })

    if (year) {
      query = query.eq('tax_year', parseInt(year))
    }

    const { data, error } = await query

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (error) {
    return Errors.internalError(res, error.message)
  }
}

export default requireAuth(handler)

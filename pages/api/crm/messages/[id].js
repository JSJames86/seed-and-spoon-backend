import { requireAuth, getUserId } from '../../../../lib/authMiddleware'
import { hasCrmRole } from '../../../../lib/crmAuth'
import { supabase } from '../../../../lib/supabaseClient'
import { sendSuccess, Errors } from '../../../../lib/errorResponses'

async function handler(req, res) {
  if (req.method === 'PUT') return handlePut(req, res)
  if (req.method === 'DELETE') return handleDelete(req, res)
  return Errors.methodNotAllowed(res, ['PUT', 'DELETE'])
}

async function handlePut(req, res) {
  const { id } = req.query
  const userId = getUserId(req)
  const { content } = req.body

  if (!content?.trim()) return Errors.missingField(res, 'content')

  try {
    const { data: message } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', id)
      .single()

    if (!message) return Errors.notFound(res, 'Message')
    if (message.sender_id !== userId) return Errors.forbidden(res, 'Can only edit your own messages')

    const { data, error } = await supabase
      .from('messages')
      .update({ content: content.trim(), edited_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

async function handleDelete(req, res) {
  const { id } = req.query
  const userId = getUserId(req)

  try {
    const { data: message } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', id)
      .single()

    if (!message) return Errors.notFound(res, 'Message')

    const isAdmin = await hasCrmRole(req, ['admin', 'staff'])
    if (message.sender_id !== userId && !isAdmin) {
      return Errors.forbidden(res, 'Can only delete your own messages')
    }

    // Soft delete
    const { data, error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return Errors.databaseError(res, error.message)
    return sendSuccess(res, data)
  } catch (err) {
    return Errors.internalError(res, err.message)
  }
}

export default requireAuth(handler)

import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  // TODO: Add authentication/authorization middleware
  // For now, this is a manual-first approach

  if (req.method === 'GET') {
    try {
      const { resource_type, resource_id, limit = 50, offset = 0 } = req.query

      let query = supabase
        .from('notes')
        .select('*')

      // Filter by resource type and id if provided
      if (resource_type) {
        query = query.eq('resource_type', resource_type)
      }

      if (resource_id) {
        query = query.eq('resource_id', resource_id)
      }

      query = query
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

      const { data, error, count } = await query

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({
        notes: data,
        total: count
      })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch notes' })
    }
  } else if (req.method === 'POST') {
    try {
      const noteData = {
        ...req.body,
        created_at: new Date().toISOString()
      }

      // Validate required fields
      if (!noteData.resource_type || !noteData.resource_id || !noteData.content) {
        return res.status(400).json({
          error: 'resource_type, resource_id, and content are required'
        })
      }

      const { data, error } = await supabase
        .from('notes')
        .insert([noteData])
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(201).json({ note: data[0] })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create note' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Note ID is required' })
      }

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Note not found' })
      }

      return res.status(200).json({ note: data[0] })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update note' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query

      if (!id) {
        return res.status(400).json({ error: 'Note ID is required' })
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ message: 'Note deleted successfully' })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete note' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}

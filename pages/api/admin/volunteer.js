import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req, res) {
  // TODO: Add authentication/authorization middleware
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Volunteer ID is required' })
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select(`
          *,
          food_banks (
            id,
            name,
            address
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Volunteer not found' })
        }
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ volunteer: data })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch volunteer' })
    }
  } else if (req.method === 'PUT') {
    try {
      const updateData = {
        ...req.body,
        updated_at: new Date().toISOString()
      }

      // Remove id from update data if present
      delete updateData.id

      const { data, error } = await supabase
        .from('volunteers')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Volunteer not found' })
      }

      return res.status(200).json({ volunteer: data[0] })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update volunteer' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('volunteers')
        .delete()
        .eq('id', id)

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ message: 'Volunteer deleted successfully' })
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete volunteer' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}

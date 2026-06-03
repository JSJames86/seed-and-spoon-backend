import { supabase } from '../../../lib/supabaseClient'
import { requireStaff } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') return getContacts(req, res)
  if (req.method === 'POST') return createContact(req, res)
  if (req.method === 'PUT') return updateContact(req, res)
  if (req.method === 'DELETE') return deleteContact(req, res)
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}

async function getContacts(req, res) {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return res.status(200).json({ success: true, data: data || [] })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch contacts', details: error.message })
  }
}

async function createContact(req, res) {
  try {
    const { organization, name, title, email, phone, address, notes, category } = req.body

    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        organization: organization || null,
        name: name || null,
        title: title || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        notes: notes || null,
        category: category || null,
      }])
      .select()
      .single()

    if (error) throw error
    return res.status(201).json({ success: true, data })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create contact', details: error.message })
  }
}

async function updateContact(req, res) {
  try {
    const { id } = req.query
    if (!id) return res.status(400).json({ success: false, error: 'Contact ID required' })

    const { organization, name, title, email, phone, address, notes, category } = req.body

    const { data, error } = await supabase
      .from('contacts')
      .update({
        organization: organization || null,
        name: name || null,
        title: title || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        notes: notes || null,
        category: category || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return res.status(200).json({ success: true, data })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update contact', details: error.message })
  }
}

async function deleteContact(req, res) {
  try {
    const { id } = req.query
    if (!id) return res.status(400).json({ success: false, error: 'Contact ID required' })

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)

    if (error) throw error
    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete contact', details: error.message })
  }
}

export default requireStaff(handler)

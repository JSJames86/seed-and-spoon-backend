/**
 * iCal Export API Route
 * Export events in iCalendar format for Google Calendar, Apple Calendar, etc.
 *
 * GET /api/admin/calendar/ical - Export events as .ics file
 * Query params: food_bank_id, event_type, start_date, end_date
 */

import { supabase } from '../../../../lib/supabaseClient'
import { optionalAuth } from '../../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    const {
      food_bank_id,
      event_type,
      start_date,
      end_date,
      visibility = 'public'
    } = req.query

    let query = supabase
      .from('events')
      .select(`
        *,
        food_bank:food_banks(name, address, city, state)
      `)
      .in('status', ['scheduled', 'in_progress'])

    // Apply filters
    if (food_bank_id) {
      query = query.eq('food_bank_id', food_bank_id)
    }

    if (event_type) {
      query = query.eq('event_type', event_type)
    }

    if (start_date) {
      query = query.gte('start_time', start_date)
    } else {
      // Default to events from today onwards
      query = query.gte('start_time', new Date().toISOString())
    }

    if (end_date) {
      query = query.lte('start_time', end_date)
    }

    // Filter by visibility - only public events if not authenticated
    if (!req.user) {
      query = query.eq('visibility', 'public')
    } else if (visibility) {
      query = query.eq('visibility', visibility)
    }

    query = query.order('start_time', { ascending: true })

    const { data: events, error } = await query

    if (error) {
      throw error
    }

    // Generate iCal format
    const ical = generateICalendar(events || [])

    // Set headers for .ics file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="events.ics"')

    return res.status(200).send(ical)
  } catch (error) {
    console.error('iCal export error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to export calendar',
      details: error.message
    })
  }
}

/**
 * Generate iCalendar format from events
 */
function generateICalendar(events) {
  const now = new Date()
  const timestamp = formatICalDate(now)

  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Seed & Spoon//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Seed & Spoon Events',
    'X-WR-TIMEZONE:UTC',
    'X-WR-CALDESC:Nonprofit food bank events and volunteer opportunities'
  ]

  events.forEach(event => {
    const startDate = new Date(event.start_time)
    const endDate = new Date(event.end_time)
    const created = new Date(event.created_at)

    // Build location string
    let location = event.location || ''
    if (event.food_bank) {
      const fb = event.food_bank
      location = location || `${fb.name}, ${fb.address || ''} ${fb.city || ''} ${fb.state || ''}`.trim()
    }

    // Build description
    let description = event.description || ''
    if (event.organizer_name) {
      description += `\\n\\nOrganizer: ${event.organizer_name}`
    }
    if (event.organizer_email) {
      description += `\\nEmail: ${event.organizer_email}`
    }
    if (event.contact_phone) {
      description += `\\nPhone: ${event.contact_phone}`
    }
    if (event.max_volunteers) {
      description += `\\n\\nMax Volunteers: ${event.max_volunteers}`
      description += `\\nRegistered: ${event.registered_volunteers || 0}`
    }

    ical.push('BEGIN:VEVENT')
    ical.push(`UID:${event.id}@seedandspoon.org`)
    ical.push(`DTSTAMP:${timestamp}`)
    ical.push(`DTSTART:${formatICalDate(startDate)}`)
    ical.push(`DTEND:${formatICalDate(endDate)}`)
    ical.push(`SUMMARY:${escapeICalText(event.title)}`)

    if (description) {
      ical.push(`DESCRIPTION:${escapeICalText(description)}`)
    }

    if (location) {
      ical.push(`LOCATION:${escapeICalText(location)}`)
    }

    if (event.organizer_email) {
      ical.push(`ORGANIZER;CN=${escapeICalText(event.organizer_name || 'Organizer')}:MAILTO:${event.organizer_email}`)
    }

    ical.push(`STATUS:${event.status === 'scheduled' ? 'CONFIRMED' : 'TENTATIVE'}`)
    ical.push(`CREATED:${formatICalDate(created)}`)

    if (event.recurring && event.recurrence_rule) {
      ical.push(`RRULE:${event.recurrence_rule}`)
    }

    // Add categories
    if (event.event_type) {
      ical.push(`CATEGORIES:${escapeICalText(event.event_type)}`)
    }

    ical.push('END:VEVENT')
  })

  ical.push('END:VCALENDAR')

  return ical.join('\r\n')
}

/**
 * Format date for iCalendar (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Escape special characters in iCal text
 */
function escapeICalText(text) {
  if (!text) return ''
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

// Export with optional authentication
export default optionalAuth(handler)

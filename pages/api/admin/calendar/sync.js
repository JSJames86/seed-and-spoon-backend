/**
 * Calendar Sync API Route
 * Provides calendar sync information and URLs for external calendar integration
 *
 * GET /api/admin/calendar/sync - Get calendar sync information
 * POST /api/admin/calendar/sync - Update event with external calendar IDs
 */

import { supabase } from '../../../../lib/supabaseClient'
import { requireStaff } from '../../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.method === 'GET') {
    return getSyncInfo(req, res)
  }

  if (req.method === 'POST') {
    return updateSyncInfo(req, res)
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}

/**
 * GET /api/admin/calendar/sync
 * Get calendar sync information and URLs
 */
async function getSyncInfo(req, res) {
  try {
    const { food_bank_id, event_id } = req.query

    // Build base URL for calendar feeds
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000'

    const syncInfo = {
      ical_feed_url: `${baseUrl}/api/admin/calendar/ical`,
      google_calendar_instructions: {
        description: 'To add to Google Calendar, use the "Add by URL" option with the iCal feed URL',
        steps: [
          'Open Google Calendar',
          'Click the "+" next to "Other calendars"',
          'Select "From URL"',
          'Paste the iCal feed URL',
          'Click "Add calendar"'
        ],
        url: `${baseUrl}/api/admin/calendar/ical${food_bank_id ? `?food_bank_id=${food_bank_id}` : ''}`
      },
      apple_calendar_instructions: {
        description: 'To add to Apple Calendar, subscribe to the calendar using the iCal feed URL',
        steps: [
          'Open Calendar app',
          'Go to File > New Calendar Subscription',
          'Enter the iCal feed URL',
          'Choose update frequency and click OK'
        ],
        url: `${baseUrl}/api/admin/calendar/ical${food_bank_id ? `?food_bank_id=${food_bank_id}` : ''}`
      },
      outlook_instructions: {
        description: 'To add to Outlook, use the "Add calendar from internet" option',
        steps: [
          'Open Outlook Calendar',
          'Click "Add calendar" > "Subscribe from web"',
          'Paste the iCal feed URL',
          'Name your calendar and click Import'
        ],
        url: `${baseUrl}/api/admin/calendar/ical${food_bank_id ? `?food_bank_id=${food_bank_id}` : ''}`
      },
      filters: {
        by_food_bank: `${baseUrl}/api/admin/calendar/ical?food_bank_id=FOOD_BANK_ID`,
        by_event_type: `${baseUrl}/api/admin/calendar/ical?event_type=EVENT_TYPE`,
        by_date_range: `${baseUrl}/api/admin/calendar/ical?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`,
        public_only: `${baseUrl}/api/admin/calendar/ical?visibility=public`
      }
    }

    // If event_id provided, get sync status for that event
    if (event_id) {
      const { data: event, error } = await supabase
        .from('events')
        .select('id, title, google_calendar_id, apple_calendar_id, start_time, end_time')
        .eq('id', event_id)
        .single()

      if (!error && event) {
        syncInfo.event = {
          id: event.id,
          title: event.title,
          synced_to_google: !!event.google_calendar_id,
          synced_to_apple: !!event.apple_calendar_id,
          google_calendar_id: event.google_calendar_id,
          apple_calendar_id: event.apple_calendar_id,
          add_to_google_url: generateGoogleCalendarUrl(event),
          download_ical_url: `${baseUrl}/api/admin/calendar/ical?event_id=${event.id}`
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: syncInfo
    })
  } catch (error) {
    console.error('Get sync info error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get sync information',
      details: error.message
    })
  }
}

/**
 * POST /api/admin/calendar/sync
 * Update event with external calendar sync IDs
 */
async function updateSyncInfo(req, res) {
  try {
    const {
      event_id,
      google_calendar_id,
      apple_calendar_id
    } = req.body

    // Validation
    if (!event_id) {
      return res.status(400).json({
        success: false,
        error: 'event_id is required'
      })
    }

    // Build update object
    const updateData = {}
    if (google_calendar_id !== undefined) updateData.google_calendar_id = google_calendar_id
    if (apple_calendar_id !== undefined) updateData.apple_calendar_id = apple_calendar_id

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No calendar IDs provided'
      })
    }

    const { data: event, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', event_id)
      .select('id, title, google_calendar_id, apple_calendar_id')
      .single()

    if (error || !event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found or update failed'
      })
    }

    return res.status(200).json({
      success: true,
      data: event
    })
  } catch (error) {
    console.error('Update sync info error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update sync information',
      details: error.message
    })
  }
}

/**
 * Generate Google Calendar "Add Event" URL
 */
function generateGoogleCalendarUrl(event) {
  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)

  const formatGoogleDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: event.description || '',
    location: event.location || ''
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Export with staff authentication required
export default requireStaff(handler)

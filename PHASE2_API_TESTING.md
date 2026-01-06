# Phase 2 API Testing Guide

Complete testing instructions for all Phase 2 API routes including admin dashboard, volunteer management, donor management, and calendar integration.

## Prerequisites

### 1. Database Setup

Run the Phase 2 migration to create required tables:

```bash
# In Supabase SQL Editor, run:
# /migrations/002_phase2_tables.sql
```

### 2. Environment Variables

Ensure these are set in your `.env` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 3. Authentication Setup

**Create an Admin User:**

In Supabase dashboard or via SQL:

```sql
-- Create a test user (use Supabase Auth dashboard)
-- Then add admin role to user metadata:

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@example.com';
```

**Get Auth Token:**

```bash
# Login via your frontend or use Supabase client
# Store the JWT token for testing
```

---

## API Testing Examples

All authenticated routes require the `Authorization` header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1. Admin Dashboard

### GET /api/admin/dashboard

**Description:** Get aggregate statistics for admin dashboard

**Authentication:** Required (Admin)

**Query Parameters:**
- `timeframe` (optional): Number of days to look back (default: 30)

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/admin/dashboard?timeframe=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "volunteers": {
      "total": 50,
      "active": 35,
      "pending": 10,
      "inactive": 5,
      "newThisPeriod": 8
    },
    "donors": {
      "total": 200,
      "active": 180,
      "totalRaised": 15000.50
    },
    "donations": {
      "total": 450,
      "totalAmount": 25000.00,
      "recentAmount": 5000.00,
      "recentCount": 85
    },
    "events": {
      "upcoming": 5,
      "volunteersNeeded": 15,
      "nextEvent": { ... }
    },
    "hours": {
      "totalHours": 250.5,
      "verifiedHours": 200.0,
      "unverifiedHours": 50.5
    },
    "recentActivity": {
      "volunteers": [ ... ],
      "donations": [ ... ]
    }
  }
}
```

---

## 2. Volunteer Task Management

### GET /api/admin/volunteer-tasks

**Description:** List all volunteer tasks with filters

**Authentication:** Required (Staff/Admin)

**Query Parameters:**
- `volunteer_id` (optional): Filter by volunteer
- `food_bank_id` (optional): Filter by food bank
- `status` (optional): assigned, in_progress, completed, cancelled
- `priority` (optional): low, medium, high, urgent
- `task_type` (optional): Task type
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/admin/volunteer-tasks?status=assigned&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### POST /api/admin/volunteer-tasks

**Description:** Create a new task assignment

**Authentication:** Required (Staff/Admin)

**Request Body:**

```json
{
  "volunteer_id": "uuid-here",
  "food_bank_id": "uuid-here",
  "title": "Sort donated food items",
  "description": "Help sort and organize food donations in the warehouse",
  "task_type": "food_sorting",
  "priority": "medium",
  "due_date": "2026-02-01T17:00:00Z",
  "notes": "Heavy lifting may be required"
}
```

**Example Request:**

```bash
curl -X POST "http://localhost:3000/api/admin/volunteer-tasks" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteer_id": "uuid-here",
    "title": "Sort donated food items",
    "task_type": "food_sorting",
    "priority": "medium"
  }'
```

### GET /api/admin/volunteer-tasks/[id]

**Description:** Get specific task details

### PUT /api/admin/volunteer-tasks/[id]

**Description:** Update task status or details

**Request Body:**

```json
{
  "status": "completed",
  "notes": "Task completed successfully"
}
```

### DELETE /api/admin/volunteer-tasks/[id]

**Description:** Delete a task

---

## 3. Volunteer Hours Tracking

### GET /api/admin/volunteer-hours

**Description:** List all volunteer hours with filters

**Authentication:** Required (Staff/Admin)

**Query Parameters:**
- `volunteer_id` (optional): Filter by volunteer
- `food_bank_id` (optional): Filter by food bank
- `verified` (optional): true/false
- `activity_type` (optional): Activity type
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD
- `page` (optional): Page number
- `limit` (optional): Items per page

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/admin/volunteer-hours?verified=false&start_date=2026-01-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": [ ... ],
  "summary": {
    "totalHours": "150.50",
    "verifiedHours": "120.00",
    "unverifiedHours": "30.50",
    "entryCount": 45
  },
  "pagination": { ... }
}
```

### POST /api/admin/volunteer-hours

**Description:** Log new volunteer hours

**Request Body:**

```json
{
  "volunteer_id": "uuid-here",
  "food_bank_id": "uuid-here",
  "task_id": "uuid-here",
  "date": "2026-01-15",
  "hours": 4.5,
  "description": "Food sorting and organization",
  "activity_type": "food_distribution",
  "verified": true,
  "notes": "Excellent work"
}
```

**Example Request:**

```bash
curl -X POST "http://localhost:3000/api/admin/volunteer-hours" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteer_id": "uuid-here",
    "date": "2026-01-15",
    "hours": 4.5,
    "activity_type": "food_distribution",
    "verified": true
  }'
```

### GET /api/admin/volunteer-hours/[id]

**Description:** Get specific hours entry

### PUT /api/admin/volunteer-hours/[id]

**Description:** Update hours entry (verify hours, edit details)

**Request Body:**

```json
{
  "verified": true,
  "hours": 5.0,
  "notes": "Verified by supervisor"
}
```

### DELETE /api/admin/volunteer-hours/[id]

**Description:** Delete hours entry

---

## 4. Donor Management

### GET /api/admin/donors

**Description:** List all donors with filters

**Authentication:** Required (Staff/Admin)

**Query Parameters:**
- `status` (optional): active, inactive, do_not_contact
- `donor_type` (optional): individual, organization, corporate
- `min_donated` (optional): Minimum donation amount
- `search` (optional): Search by name or email
- `page` (optional): Page number
- `limit` (optional): Items per page

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/admin/donors?status=active&min_donated=100" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### POST /api/admin/donors

**Description:** Create new donor profile

**Request Body:**

```json
{
  "email": "donor@example.com",
  "name": "John Donor",
  "phone": "555-0123",
  "address": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zip_code": "62701",
  "donor_type": "individual",
  "status": "active",
  "preferred_contact_method": "email",
  "communication_preferences": {
    "newsletter": true,
    "receipts": true,
    "updates": false
  },
  "notes": "Long-time supporter"
}
```

**Example Request:**

```bash
curl -X POST "http://localhost:3000/api/admin/donors" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "donor@example.com",
    "name": "John Donor",
    "donor_type": "individual"
  }'
```

### GET /api/admin/donors/[id]

**Description:** Get donor details with full donation history

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "donor@example.com",
    "name": "John Donor",
    "total_donated": 500.00,
    "donation_count": 5,
    "donations": [ ... ],
    "statistics": {
      "total_donated": "500.00",
      "donation_count": 5,
      "average_donation": "100.00",
      "first_donation": "2025-01-01T...",
      "last_donation": "2026-01-01T..."
    }
  }
}
```

### PUT /api/admin/donors/[id]

**Description:** Update donor profile

### DELETE /api/admin/donors/[id]

**Description:** Delete donor profile

---

## 5. Event Management

### GET /api/admin/events

**Description:** List all events (public events visible without auth)

**Authentication:** Optional (public events) / Required (private events)

**Query Parameters:**
- `food_bank_id` (optional): Filter by food bank
- `event_type` (optional): Event type
- `status` (optional): scheduled, in_progress, completed, cancelled
- `visibility` (optional): public, private, volunteers_only
- `start_date` (optional): ISO date string
- `end_date` (optional): ISO date string
- `page` (optional): Page number
- `limit` (optional): Items per page

**Example Request (Public):**

```bash
curl -X GET "http://localhost:3000/api/admin/events?status=scheduled"
```

**Example Request (With Auth):**

```bash
curl -X GET "http://localhost:3000/api/admin/events?visibility=private" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### POST /api/admin/events

**Description:** Create new event

**Authentication:** Required (Staff/Admin)

**Request Body:**

```json
{
  "title": "Community Food Drive",
  "description": "Monthly food drive at the community center",
  "event_type": "food_drive",
  "food_bank_id": "uuid-here",
  "location": "123 Community Center Dr, Springfield, IL",
  "start_time": "2026-02-15T10:00:00Z",
  "end_time": "2026-02-15T14:00:00Z",
  "all_day": false,
  "recurring": false,
  "max_volunteers": 20,
  "visibility": "public",
  "organizer_name": "Jane Smith",
  "organizer_email": "jane@example.com",
  "contact_phone": "555-0199"
}
```

**Example Request:**

```bash
curl -X POST "http://localhost:3000/api/admin/events" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Community Food Drive",
    "start_time": "2026-02-15T10:00:00Z",
    "end_time": "2026-02-15T14:00:00Z",
    "max_volunteers": 20
  }'
```

### GET /api/admin/events/[id]

**Description:** Get event details with volunteer registrations

**Authentication:** Optional (for public events)

### PUT /api/admin/events/[id]

**Description:** Update event details

**Authentication:** Required (Staff/Admin)

### DELETE /api/admin/events/[id]

**Description:** Delete event

**Authentication:** Required (Staff/Admin)

---

## 6. Event Volunteer Registration

### POST /api/admin/events/[id]/volunteers

**Description:** Register a volunteer for an event

**Authentication:** Required (Staff/Admin)

**Request Body:**

```json
{
  "volunteer_id": "uuid-here",
  "role": "volunteer",
  "status": "registered"
}
```

**Example Request:**

```bash
curl -X POST "http://localhost:3000/api/admin/events/EVENT_ID/volunteers" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteer_id": "uuid-here",
    "role": "volunteer"
  }'
```

### PUT /api/admin/events/[id]/volunteers

**Description:** Update volunteer registration (mark attended, add hours)

**Request Body:**

```json
{
  "volunteer_id": "uuid-here",
  "status": "attended",
  "hours_credited": 4.0,
  "notes": "Great participation"
}
```

### DELETE /api/admin/events/[id]/volunteers

**Description:** Remove volunteer from event

**Request Body:**

```json
{
  "volunteer_id": "uuid-here"
}
```

---

## 7. Calendar Integration

### GET /api/admin/calendar/ical

**Description:** Export events in iCal format (.ics file)

**Authentication:** Optional (public events only without auth)

**Query Parameters:**
- `food_bank_id` (optional): Filter by food bank
- `event_type` (optional): Filter by event type
- `start_date` (optional): Start date
- `end_date` (optional): End date
- `visibility` (optional): Requires auth for non-public

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/admin/calendar/ical?food_bank_id=uuid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o events.ics
```

**Usage:**
- Import the .ics file into Google Calendar, Apple Calendar, or Outlook
- Or use the feed URL for automatic updates

### GET /api/admin/calendar/sync

**Description:** Get calendar sync information and URLs

**Authentication:** Required (Staff/Admin)

**Query Parameters:**
- `food_bank_id` (optional): Get URLs filtered by food bank
- `event_id` (optional): Get sync status for specific event

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/admin/calendar/sync" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "ical_feed_url": "http://localhost:3000/api/admin/calendar/ical",
    "google_calendar_instructions": {
      "description": "To add to Google Calendar...",
      "steps": [ ... ],
      "url": "..."
    },
    "apple_calendar_instructions": { ... },
    "outlook_instructions": { ... },
    "filters": {
      "by_food_bank": "...",
      "by_event_type": "...",
      "by_date_range": "..."
    }
  }
}
```

### POST /api/admin/calendar/sync

**Description:** Update event with external calendar IDs

**Authentication:** Required (Staff/Admin)

**Request Body:**

```json
{
  "event_id": "uuid-here",
  "google_calendar_id": "google-event-id",
  "apple_calendar_id": "apple-event-id"
}
```

---

## Testing Workflows

### Workflow 1: Complete Volunteer Management

```bash
# 1. Create a volunteer task
curl -X POST "http://localhost:3000/api/admin/volunteer-tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteer_id": "VOLUNTEER_UUID",
    "title": "Food Sorting",
    "priority": "high",
    "due_date": "2026-02-01T17:00:00Z"
  }'

# 2. Update task status
curl -X PUT "http://localhost:3000/api/admin/volunteer-tasks/TASK_UUID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# 3. Log volunteer hours
curl -X POST "http://localhost:3000/api/admin/volunteer-hours" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteer_id": "VOLUNTEER_UUID",
    "task_id": "TASK_UUID",
    "date": "2026-01-20",
    "hours": 4.0,
    "verified": true
  }'

# 4. View dashboard
curl -X GET "http://localhost:3000/api/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN"
```

### Workflow 2: Event with Volunteers

```bash
# 1. Create an event
curl -X POST "http://localhost:3000/api/admin/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Food Drive",
    "start_time": "2026-02-15T10:00:00Z",
    "end_time": "2026-02-15T14:00:00Z",
    "max_volunteers": 10
  }'

# 2. Register volunteers
curl -X POST "http://localhost:3000/api/admin/events/EVENT_UUID/volunteers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"volunteer_id": "VOLUNTEER_UUID"}'

# 3. Mark attendance
curl -X PUT "http://localhost:3000/api/admin/events/EVENT_UUID/volunteers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteer_id": "VOLUNTEER_UUID",
    "status": "attended",
    "hours_credited": 4.0
  }'

# 4. Export calendar
curl -X GET "http://localhost:3000/api/admin/calendar/ical" \
  -o events.ics
```

### Workflow 3: Donor Management

```bash
# 1. Create donor profile
curl -X POST "http://localhost:3000/api/admin/donors" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newdonor@example.com",
    "name": "New Donor",
    "donor_type": "individual"
  }'

# 2. View donor details with donation history
curl -X GET "http://localhost:3000/api/admin/donors/DONOR_UUID" \
  -H "Authorization: Bearer $TOKEN"

# 3. Update donor info
curl -X PUT "http://localhost:3000/api/admin/donors/DONOR_UUID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "555-0199",
    "preferred_contact_method": "phone"
  }'
```

---

## Common Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Authentication required"
}
```

**Solution:** Include valid JWT token in Authorization header

### 403 Forbidden

```json
{
  "success": false,
  "error": "Admin access required"
}
```

**Solution:** Ensure user has admin/staff role in Supabase

### 404 Not Found

```json
{
  "success": false,
  "error": "Resource not found"
}
```

**Solution:** Verify the ID exists in database

### 400 Bad Request

```json
{
  "success": false,
  "error": "Validation error message"
}
```

**Solution:** Check required fields and data types

---

## Next Steps

1. **Run Database Migration:** Execute `/migrations/002_phase2_tables.sql` in Supabase
2. **Set Environment Variables:** Add all required env vars to `.env`
3. **Create Admin User:** Set up at least one admin user for testing
4. **Test Routes:** Use curl or Postman to test each endpoint
5. **Integration Testing:** Test complete workflows end-to-end
6. **Frontend Integration:** Connect your Next.js frontend to these APIs

---

## Support

For issues or questions:
- Check error messages in API responses
- Review Supabase logs for database errors
- Verify authentication tokens are valid
- Ensure all environment variables are set correctly

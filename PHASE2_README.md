# Phase 2: Admin Dashboard & CRM Features

Phase 2 adds comprehensive admin, volunteer management, donor tracking, and calendar integration features to the Seed & Spoon backend.

## Overview

This phase implements a complete CRM system for managing volunteers, donors, and nonprofit events with calendar synchronization capabilities.

## New Features

### 1. Admin Dashboard
- Aggregate statistics across all system entities
- Real-time metrics for volunteers, donors, donations, and events
- Recent activity tracking
- Configurable timeframes for data analysis

### 2. Volunteer Management
- **Task Assignment:** Assign and track tasks for volunteers
- **Hours Tracking:** Log and verify volunteer hours
- **Performance Metrics:** View volunteer statistics and contributions
- **Task Status:** Track task completion and progress

### 3. Donor Management
- **Donor Profiles:** Comprehensive contact and preference management
- **Donation History:** Full tracking of all donations per donor
- **Communication Preferences:** Manage how donors prefer to be contacted
- **Donor Statistics:** Lifetime value, donation frequency, and averages

### 4. Calendar Integration
- **Event Management:** Full CRUD operations for nonprofit events
- **Volunteer Registration:** Manage event signups and attendance
- **iCal Export:** Export events for Google Calendar, Apple Calendar, Outlook
- **Calendar Sync:** Integration endpoints for external calendar services
- **Public/Private Events:** Control event visibility

## File Structure

```
/pages/api/admin/
├── dashboard.js                    # Admin dashboard statistics
├── volunteer-tasks.js              # List and create volunteer tasks
├── volunteer-tasks/[id].js         # Manage individual tasks
├── volunteer-hours.js              # Track volunteer hours
├── volunteer-hours/[id].js         # Manage individual hour entries
├── donors.js                       # List and create donors
├── donors/[id].js                  # Manage individual donors
├── events.js                       # List and create events
├── events/[id].js                  # Manage individual events
├── events/[id]/volunteers.js       # Manage event registrations
└── calendar/
    ├── ical.js                     # Export events as iCal
    └── sync.js                     # Calendar sync information

/lib/
└── authMiddleware.js               # Authentication & authorization

/migrations/
└── 002_phase2_tables.sql           # Database schema for Phase 2
```

## Database Schema

### New Tables

1. **volunteer_tasks** - Task assignments for volunteers
2. **volunteer_hours** - Volunteer hour tracking and verification
3. **donors** - Donor profiles and contact information
4. **events** - Nonprofit events and calendar items
5. **event_volunteers** - Many-to-many relationship for event registrations

### Helper Views

- `volunteer_stats` - Aggregated volunteer statistics
- `donor_stats` - Aggregated donor statistics
- `event_stats` - Aggregated event statistics

## Authentication & Authorization

All admin routes are protected with role-based authentication:

- **requireAdmin()** - Admin-only access
- **requireStaff()** - Staff and admin access
- **requireAuth()** - Any authenticated user
- **optionalAuth()** - Public + enhanced for authenticated users

### Setting Up Admin Users

```sql
-- Add admin role to a user in Supabase
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@example.com';
```

## API Endpoints Summary

### Dashboard
- `GET /api/admin/dashboard` - Aggregate statistics

### Volunteer Tasks
- `GET /api/admin/volunteer-tasks` - List tasks
- `POST /api/admin/volunteer-tasks` - Create task
- `GET /api/admin/volunteer-tasks/[id]` - Get task
- `PUT /api/admin/volunteer-tasks/[id]` - Update task
- `DELETE /api/admin/volunteer-tasks/[id]` - Delete task

### Volunteer Hours
- `GET /api/admin/volunteer-hours` - List hours
- `POST /api/admin/volunteer-hours` - Log hours
- `GET /api/admin/volunteer-hours/[id]` - Get hours entry
- `PUT /api/admin/volunteer-hours/[id]` - Update/verify hours
- `DELETE /api/admin/volunteer-hours/[id]` - Delete hours entry

### Donors
- `GET /api/admin/donors` - List donors
- `POST /api/admin/donors` - Create donor
- `GET /api/admin/donors/[id]` - Get donor with history
- `PUT /api/admin/donors/[id]` - Update donor
- `DELETE /api/admin/donors/[id]` - Delete donor

### Events
- `GET /api/admin/events` - List events
- `POST /api/admin/events` - Create event
- `GET /api/admin/events/[id]` - Get event details
- `PUT /api/admin/events/[id]` - Update event
- `DELETE /api/admin/events/[id]` - Delete event

### Event Volunteers
- `POST /api/admin/events/[id]/volunteers` - Register volunteer
- `PUT /api/admin/events/[id]/volunteers` - Update registration
- `DELETE /api/admin/events/[id]/volunteers` - Remove volunteer

### Calendar
- `GET /api/admin/calendar/ical` - Export iCal file
- `GET /api/admin/calendar/sync` - Get sync information
- `POST /api/admin/calendar/sync` - Update sync IDs

## Setup Instructions

### 1. Install Dependencies

Dependencies are already in `package.json`. If needed:

```bash
npm install
```

### 2. Run Database Migration

Execute the Phase 2 migration in Supabase SQL Editor:

```sql
-- Copy and paste contents of /migrations/002_phase2_tables.sql
```

### 3. Update Environment Variables

Add to your `.env` file:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Create Admin Users

Set admin roles for authorized users (see Authentication section above)

### 5. Start Development Server

```bash
npm run dev
```

## Testing

Comprehensive testing guide available in: `PHASE2_API_TESTING.md`

### Quick Test

```bash
# Get auth token from your frontend or Supabase client
export TOKEN="your-jwt-token"

# Test dashboard
curl -X GET "http://localhost:3000/api/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN"

# Create a volunteer task
curl -X POST "http://localhost:3000/api/admin/volunteer-tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteer_id": "uuid",
    "title": "Test Task",
    "priority": "medium"
  }'
```

## Integration with Frontend

### Authentication Flow

1. User logs in via Supabase Auth (frontend)
2. Frontend receives JWT token
3. Include token in API requests:
   ```javascript
   const response = await fetch('/api/admin/dashboard', {
     headers: {
       'Authorization': `Bearer ${session.access_token}`
     }
   })
   ```

### Example React Hook

```javascript
import { useSession } from '@supabase/auth-helpers-react'

function useDashboard() {
  const session = useSession()

  const fetchDashboard = async () => {
    const response = await fetch('/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    return response.json()
  }

  return { fetchDashboard }
}
```

## Calendar Integration

### Google Calendar

1. Get iCal feed URL: `GET /api/admin/calendar/sync`
2. In Google Calendar: Add calendar by URL
3. Paste the iCal feed URL
4. Calendar updates automatically

### Apple Calendar

1. Get iCal feed URL from sync endpoint
2. In Calendar app: File > New Calendar Subscription
3. Enter the iCal feed URL
4. Choose update frequency

### Direct Event Links

Generate "Add to Google Calendar" links:

```javascript
const addToGoogleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${event.title}&dates=${start}/${end}`
```

## Best Practices

### 1. Error Handling

All routes return consistent error format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Technical details (optional)"
}
```

### 2. Pagination

Use pagination for large datasets:

```javascript
const response = await fetch(
  '/api/admin/volunteers?page=1&limit=50'
)
```

### 3. Filtering

Combine multiple filters:

```javascript
const url = new URLSearchParams({
  status: 'active',
  donor_type: 'individual',
  min_donated: '100'
})
fetch(`/api/admin/donors?${url}`)
```

### 4. Verification Workflow

For volunteer hours:

1. Volunteers log their own hours (unverified)
2. Admin/staff reviews and verifies
3. Verified hours count toward statistics

## Security Considerations

1. **RLS Policies:** Enable Row Level Security on all tables
2. **Admin Verification:** Always verify admin role server-side
3. **Input Validation:** All inputs are validated before database operations
4. **Rate Limiting:** Consider adding rate limiting for production
5. **HTTPS Only:** Always use HTTPS in production

## Performance Tips

1. **Use Pagination:** Don't fetch all records at once
2. **Parallel Queries:** Dashboard uses Promise.all() for efficiency
3. **Database Indexes:** All foreign keys and common filters are indexed
4. **Caching:** Consider caching dashboard statistics

## Troubleshooting

### "Authentication required" error
- Ensure JWT token is valid and not expired
- Check Authorization header format: `Bearer TOKEN`

### "Admin access required" error
- Verify user has admin role in Supabase
- Check `app_metadata.role` field

### "Volunteer/Donor not found" error
- Verify the UUID exists in database
- Check for typos in request body

### Database errors
- Run the Phase 2 migration if tables don't exist
- Check Supabase logs for detailed error messages

## Future Enhancements

Potential Phase 3 features:

1. **Email Notifications:** Send task assignments and event reminders
2. **Reports:** Generate PDF reports for volunteers and donors
3. **Bulk Operations:** Import/export volunteers and donors via CSV
4. **Advanced Analytics:** Trends, forecasting, and insights
5. **Mobile App API:** Endpoints optimized for mobile apps
6. **WebSocket Support:** Real-time dashboard updates

## Contributing

When adding new features:

1. Follow existing patterns for consistency
2. Add authentication middleware to protected routes
3. Include input validation
4. Update testing documentation
5. Add database indexes for new queries

## Support

- **Documentation:** See `PHASE2_API_TESTING.md` for detailed testing guide
- **Database Schema:** See `migrations/002_phase2_tables.sql`
- **Authentication:** See `lib/authMiddleware.js`

---

**Built with Next.js 14, Supabase, and PostgreSQL**

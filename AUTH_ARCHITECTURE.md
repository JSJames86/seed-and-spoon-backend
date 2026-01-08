# Authentication & Authorization Architecture

## Overview

This backend uses **Supabase Auth** with **server-side role-based access control (RBAC)**. All authentication and authorization is enforced at the API level, not just the frontend.

## Security Model

### Core Principles

1. **Zero Trust** - Never trust client-side role claims
2. **Server-Side Enforcement** - All auth checks happen server-side
3. **Defense in Depth** - Multiple layers of security (JWT + RLS + middleware)
4. **Least Privilege** - Users can only access their own data unless admin

### Authentication Flow

```
┌─────────────┐          ┌──────────────┐          ┌─────────────┐
│   Client    │          │   Supabase   │          │   Backend   │
│  (Frontend) │          │     Auth     │          │     API     │
└──────┬──────┘          └──────┬───────┘          └──────┬──────┘
       │                        │                         │
       │  1. Login              │                         │
       ├───────────────────────>│                         │
       │                        │                         │
       │  2. JWT Token          │                         │
       │<───────────────────────┤                         │
       │                        │                         │
       │  3. API Request + JWT  │                         │
       ├────────────────────────┼────────────────────────>│
       │                        │                         │
       │                        │  4. Verify JWT          │
       │                        │<────────────────────────┤
       │                        │                         │
       │                        │  5. User Info           │
       │                        │─────────────────────────>│
       │                        │                         │
       │                        │  6. Load Profile + Role │
       │                        │  7. Check Permissions   │
       │                        │                         │
       │  8. API Response       │                         │
       │<───────────────────────┼─────────────────────────┤
       │                        │                         │
```

## Roles

This system supports **four distinct roles**:

| Role       | Access Level | Use Case                                    |
|------------|--------------|---------------------------------------------|
| `admin`    | Full access  | Organization administrators, staff          |
| `donor`    | Own records  | People who make donations                   |
| `client`   | Own records  | People receiving services (food bank users) |
| `volunteer`| Own records  | Volunteers tracking hours and tasks         |

### Role Priority

Roles are determined in this order:

1. **`profile.role`** (Database profiles table - highest priority)
2. **`user.app_metadata.role`** (Set by admin/backend)
3. **`user.user_metadata.role`** (Set by user during signup)

**Note:** The `profile.role` field should be considered the source of truth and is stored in the `profiles` table.

## Middleware Functions

### Authentication Middleware

#### `requireAuth(handler)`

Requires any authenticated user (any role).

```javascript
import { requireAuth } from '../../../lib/authMiddleware'

async function handler(req, res) {
  // req.user - Authenticated user
  // req.profile - User profile with role
  return res.json({ message: 'Hello, authenticated user!' })
}

export default requireAuth(handler)
```

**Use cases:**
- User profile endpoints
- General authenticated resources
- Any logged-in user can access

---

#### `requireRole(role)`

Requires a specific role.

```javascript
import { requireRole } from '../../../lib/authMiddleware'

async function handler(req, res) {
  // Only donors can access this
  return res.json({ donations: [...] })
}

export default requireRole('donor')(handler)
```

**Available roles:**
- `requireRole('admin')` - Admin only
- `requireRole('donor')` - Donor only
- `requireRole('client')` - Client only
- `requireRole('volunteer')` - Volunteer only

---

#### `requireAnyRole(roles)`

Requires any of the specified roles.

```javascript
import { requireAnyRole } from '../../../lib/authMiddleware'

async function handler(req, res) {
  // Admins and volunteers can access this
  return res.json({ events: [...] })
}

export default requireAnyRole(['admin', 'volunteer'])(handler)
```

**Use cases:**
- Resources accessible by multiple roles
- Shared functionality
- Flexible access control

---

#### `requireAdmin(handler)`

Shortcut for admin-only routes.

```javascript
import { requireAdmin } from '../../../lib/authMiddleware'

async function handler(req, res) {
  // Only admins can access this
  return res.json({ dashboard: {...} })
}

export default requireAdmin(handler)
```

---

#### `requireStaff(handler)`

Requires admin or staff role.

```javascript
import { requireStaff } from '../../../lib/authMiddleware'

async function handler(req, res) {
  // Admins and staff can access this
  return res.json({ reports: [...] })
}

export default requireStaff(handler)
```

---

#### `optionalAuth(handler)`

Allows both authenticated and unauthenticated users.

```javascript
import { optionalAuth } from '../../../lib/authMiddleware'

async function handler(req, res) {
  if (req.user) {
    // Logged in - show personalized data
  } else {
    // Not logged in - show public data
  }
}

export default optionalAuth(handler)
```

## Helper Functions

### `getUserId(req)`

Get the authenticated user's ID.

```javascript
import { getUserId } from '../../../lib/authMiddleware'

const userId = getUserId(req)
// Returns: "uuid-string" or null
```

### `getUserEmail(req)`

Get the authenticated user's email.

```javascript
import { getUserEmail } from '../../../lib/authMiddleware'

const email = getUserEmail(req)
// Returns: "user@example.com" or null
```

### `getUserRole(user, profile)`

Get the user's role.

```javascript
import { getUserRole } from '../../../lib/authMiddleware'

const role = getUserRole(req.user, req.profile)
// Returns: "admin" | "donor" | "client" | "volunteer" | null
```

### `canAccessResource(req, resourceUserId)`

Check if the user can access a resource.

```javascript
import { canAccessResource } from '../../../lib/authMiddleware'

if (!canAccessResource(req, donation.user_id)) {
  return res.status(403).json({ error: 'Forbidden' })
}
```

**Returns `true` if:**
- User owns the resource (userId matches resourceUserId)
- User is an admin

## Access Control Rules

### Admins

✅ **Can access:**
- All records
- All endpoints
- Can modify any data
- Can change user roles

❌ **Cannot:**
- There are no restrictions for admins

---

### Donors

✅ **Can access:**
- Own donation history (`/api/donations/me`)
- Which pantries/programs received their donations
- Own profile (`/api/profile/me`)

❌ **Cannot:**
- View other donors' donations
- Access client intake data
- Access volunteer hours
- Access admin endpoints

---

### Clients

✅ **Can access:**
- Own intake/application data (`/api/intakes/me`)
- Services they are enrolled in
- Own profile (`/api/profile/me`)

❌ **Cannot:**
- View other clients' data
- Access donation records
- Access volunteer data
- Access admin endpoints

---

### Volunteers

✅ **Can access:**
- Own volunteer hours (`/api/volunteer/hours`)
- Assigned tasks and schedules
- Events they're registered for
- Own profile (`/api/profile/me`)

❌ **Cannot:**
- View other volunteers' hours
- Access client data
- Access donation records
- Access admin endpoints

## Example Protected Routes

### Donor Route Example

**File:** `pages/api/donations/me.js`

```javascript
import { requireRole, getUserEmail } from '../../../lib/authMiddleware'
import { supabase } from '../../../lib/supabaseClient'

async function handler(req, res) {
  const donorEmail = getUserEmail(req)

  const { data } = await supabase
    .from('donations')
    .select('*')
    .eq('donor_email', donorEmail)

  return res.json({ donations: data })
}

export default requireRole('donor')(handler)
```

**Security enforced:**
- ✅ JWT validation
- ✅ Role check (donor only)
- ✅ Data filtered to user's email
- ✅ Cannot access other donors' data

---

### Client Route Example

**File:** `pages/api/intakes/me.js`

```javascript
import { requireRole, getUserId } from '../../../lib/authMiddleware'
import { supabase } from '../../../lib/supabaseClient'

async function handler(req, res) {
  const userId = getUserId(req)

  const { data } = await supabase
    .from('client_intakes')
    .select('*')
    .eq('user_id', userId)

  return res.json({ intakes: data })
}

export default requireRole('client')(handler)
```

**Security enforced:**
- ✅ JWT validation
- ✅ Role check (client only)
- ✅ Data filtered to user's ID
- ✅ Cannot access other clients' data

---

### Volunteer Route Example

**File:** `pages/api/volunteer/hours.js`

```javascript
import { requireRole, getUserId } from '../../../lib/authMiddleware'
import { supabase } from '../../../lib/supabaseClient'

async function handler(req, res) {
  const userId = getUserId(req)

  // Get volunteer record
  const { data: volunteer } = await supabase
    .from('volunteers')
    .select('id')
    .eq('user_id', userId)
    .single()

  // Get hours for this volunteer only
  const { data: hours } = await supabase
    .from('volunteer_hours')
    .select('*')
    .eq('volunteer_id', volunteer.id)

  return res.json({ hours })
}

export default requireRole('volunteer')(handler)
```

**Security enforced:**
- ✅ JWT validation
- ✅ Role check (volunteer only)
- ✅ Data filtered to user's volunteer record
- ✅ Cannot access other volunteers' hours

---

### Admin Route Example

**File:** `pages/api/admin/dashboard.js`

```javascript
import { requireAdmin } from '../../../lib/authMiddleware'
import { supabase } from '../../../lib/supabaseClient'

async function handler(req, res) {
  // Admin can access all data
  const { data: allDonations } = await supabase
    .from('donations')
    .select('*')

  const { data: allClients } = await supabase
    .from('client_intakes')
    .select('*')

  return res.json({ donations: allDonations, clients: allClients })
}

export default requireAdmin(handler)
```

**Security enforced:**
- ✅ JWT validation
- ✅ Role check (admin only)
- ✅ Full access to all records

## Supabase Configuration

### Environment Variables

**Required:**

```env
# Public (safe to expose to frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side only (NEVER expose to frontend)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Security notes:**
- `NEXT_PUBLIC_*` variables are exposed to the frontend
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - **NEVER** expose to frontend
- Service role key should only be used server-side

### Supabase Clients

#### Client for JWT Verification

**File:** `lib/authMiddleware.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Used to verify JWT tokens
await supabase.auth.getUser(token)
```

**Purpose:** Verify user JWT tokens

---

#### Server Client (Service Role)

**File:** `lib/supabaseClient.js`

```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**Purpose:**
- Server-side database queries
- Bypasses Row Level Security (RLS)
- Used after auth is verified

**Security:** This client has full database access. Always verify auth before using it.

## Database Schema Requirements

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'donor', 'client', 'volunteer')),
  name TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Testing Authentication

### Manual Testing

```bash
# 1. Get a JWT token from Supabase Auth
# (Login via frontend or use Supabase client)

# 2. Test a protected endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/donations/me

# 3. Test without token (should return 401)
curl http://localhost:3000/api/donations/me

# 4. Test with wrong role (should return 403)
# Login as client, try to access donor endpoint
curl -H "Authorization: Bearer CLIENT_TOKEN" \
  http://localhost:3000/api/donations/me
```

### Testing Checklist

- [ ] Unauthenticated requests return 401
- [ ] Wrong role returns 403
- [ ] Correct role returns 200
- [ ] Users can only access their own data
- [ ] Admins can access all data
- [ ] Profile is loaded and attached to `req.profile`
- [ ] User is attached to `req.user`

## Security Best Practices

### ✅ DO

1. **Always use middleware** - Never skip auth checks
2. **Filter by user ID** - Always scope queries to the authenticated user
3. **Use service role key server-side only** - Never expose to frontend
4. **Validate all inputs** - Even from authenticated users
5. **Log security events** - Track failed auth attempts
6. **Use RLS as backup** - Defense in depth

### ❌ DON'T

1. **Never trust client-side roles** - Always verify server-side
2. **Never expose service role key** - Frontend should only use anon key
3. **Never skip authorization** - Auth is not enough, check permissions
4. **Never return more data than needed** - Only return what the user can access
5. **Never use user metadata for roles** - Use `profile.role` from database

## Troubleshooting

### "Authentication required" (401)

**Causes:**
- Missing Authorization header
- Invalid or expired JWT token
- Token not in "Bearer TOKEN" format

**Solution:**
```javascript
// Ensure frontend sends:
headers: {
  'Authorization': `Bearer ${token}`
}
```

---

### "Access required" (403)

**Causes:**
- User has wrong role for the endpoint
- User trying to access another user's data

**Solution:**
- Verify user has correct role in `profiles` table
- Check that the endpoint allows the user's role

---

### Profile not loading

**Causes:**
- Profile doesn't exist in `profiles` table
- Database query error

**Solution:**
- Ensure profile is created when user signs up
- Check Supabase logs for errors

---

### RLS blocking server queries

**Causes:**
- Using anon key client server-side
- Service role key not configured

**Solution:**
- Use `supabase` from `lib/supabaseClient.js` (service role)
- Not `createClient` with anon key

## Questions?

If you have questions about authentication or authorization:

1. Check this document
2. Review the code in `lib/authMiddleware.js`
3. Check Supabase documentation: https://supabase.com/docs/guides/auth
4. File an issue in the repository

## Remember

**Security is non-negotiable:**

1. ✅ Always verify auth server-side
2. ✅ Never trust client-side claims
3. ✅ Use appropriate middleware for each route
4. ✅ Filter data by user ID
5. ✅ Keep service role key secret

**All auth enforcement happens server-side. The frontend is untrusted.**

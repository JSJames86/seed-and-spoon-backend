# API Consumption Guide

## Overview

This guide provides frontend developers with everything needed to consume the Seed & Spoon backend API securely and effectively.

**Base URL:** `https://api.seedandspoon.org` (production) or `http://localhost:3000` (development)

**Security Model:**
- Zero-trust architecture
- Server-side authentication enforcement
- Role-based access control (RBAC)
- CORS restricted to frontend origin only

---

## Table of Contents

1. [Authentication](#authentication)
2. [CORS Configuration](#cors-configuration)
3. [Error Response Format](#error-response-format)
4. [Role-Based Access](#role-based-access)
5. [API Endpoints](#api-endpoints)
   - [Public Endpoints](#public-endpoints)
   - [Authenticated Endpoints](#authenticated-endpoints)
   - [Admin-Only Endpoints](#admin-only-endpoints)
6. [Example Requests](#example-requests)
7. [Common Failure Causes](#common-failure-causes)

---

## Authentication

### Required Headers

All authenticated endpoints require:

```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

### Getting the Access Token

Use Supabase Auth on the frontend:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Login user
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Get access token
const token = data.session.access_token

// Use token in API requests
const response = await fetch('https://api.seedandspoon.org/api/admin/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### Token Lifecycle

- Tokens are JWTs issued by Supabase Auth
- Tokens expire after a configurable period (default: 1 hour)
- Use Supabase's `refreshSession()` to get new tokens
- Backend verifies tokens server-side on every request

---

## CORS Configuration

### Allowed Origins

The backend **ONLY** accepts requests from:

```
FRONTEND_ORIGIN=http://localhost:3000  (development)
FRONTEND_ORIGIN=https://seedandspoon.org  (production)
```

### Allowed Methods

```
GET, POST, PUT, DELETE, OPTIONS
```

### Allowed Headers

```
Authorization, Content-Type, X-Requested-With
```

### CORS Errors

If you receive a CORS error:

1. **Check origin:** Ensure your frontend is running on the allowed origin
2. **Check preflight:** OPTIONS requests must succeed
3. **Check environment:** Verify `FRONTEND_ORIGIN` env var is set correctly

---

## Error Response Format

All errors follow this standardized format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

### Error Codes

| HTTP Status | Error Code | Meaning |
|-------------|-----------|---------|
| **401** | `UNAUTHENTICATED` | No authentication provided |
| **401** | `INVALID_TOKEN` | Token is invalid or expired |
| **403** | `FORBIDDEN` | User doesn't have access to resource |
| **403** | `INSUFFICIENT_PERMISSIONS` | User lacks required role |
| **400** | `VALIDATION_ERROR` | Request data is invalid |
| **400** | `MISSING_REQUIRED_FIELD` | Required field is missing |
| **400** | `INVALID_INPUT` | Input format is incorrect |
| **404** | `NOT_FOUND` | Resource doesn't exist |
| **405** | `METHOD_NOT_ALLOWED` | HTTP method not supported |
| **500** | `INTERNAL_ERROR` | Unexpected server error |
| **500** | `DATABASE_ERROR` | Database operation failed |
| **500** | `EXTERNAL_SERVICE_ERROR` | External service (Stripe, etc.) failed |

### Success Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

---

## Role-Based Access

### Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | Organization administrators | Full access to all endpoints |
| `donor` | People who make donations | Own donation history only |
| `client` | Service recipients | Own intake records only |
| `volunteer` | Volunteers | Own hours, tasks, schedules |

### Access Control Matrix

| Endpoint | Public | Donor | Client | Volunteer | Admin |
|----------|:------:|:-----:|:------:|:---------:|:-----:|
| `POST /api/donations/create` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/directory/food-banks` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/donations/me` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `GET /api/intakes/me` | ❌ | ❌ | ✅ | ❌ | ✅ |
| `GET /api/volunteer/hours` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `GET /api/profile/me` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/donations/history` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `GET /api/admin/volunteers` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST /api/directory/food-banks` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `GET /api/admin/dashboard` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## API Endpoints

### Public Endpoints

#### **POST /api/donations/create**
Create a donation payment intent.

**Authentication:** None (public endpoint)

**Request:**
```json
{
  "amount": 50.00,
  "donor_email": "donor@example.com",
  "donor_name": "John Doe",
  "currency": "usd",
  "metadata": {
    "campaign": "holiday2024"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "client_secret": "pi_xxx_secret_yyy",
    "payment_intent_id": "pi_xxxxxxxxxxxxx",
    "amount": 50.00,
    "currency": "usd"
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` - Amount < $1
- `400 MISSING_REQUIRED_FIELD` - Missing donor_email
- `400 INVALID_INPUT` - Invalid email format
- `500 EXTERNAL_SERVICE_ERROR` - Stripe failure

---

#### **GET /api/directory/food-banks**
Get list of food banks with optional proximity filtering.

**Authentication:** None (public endpoint)

**Query Parameters:**
- `latitude` (optional) - User latitude
- `longitude` (optional) - User longitude
- `radius` (optional) - Search radius in miles (default: 10)
- `county` (optional) - Filter by county name
- `city` (optional) - Filter by city name
- `include_directions` (optional) - Add Google Maps directions URL

**Response (200):**
```json
{
  "success": true,
  "data": {
    "foodBanks": [
      {
        "id": 1,
        "name": "Newark Food Bank",
        "address": "123 Main St, Newark, NJ",
        "county": "Essex",
        "city": "Newark",
        "distance": 2.5,
        "directions_url": "https://maps.google.com/..."
      }
    ],
    "count": 1,
    "filters": {
      "latitude": 40.7357,
      "longitude": -74.1724,
      "radius": 10,
      "county": null,
      "city": null
    }
  }
}
```

---

### Authenticated Endpoints

#### **GET /api/donations/me**
Get authenticated donor's donation history.

**Authentication:** Required (donor role)

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "donations": [...],
    "summary": {
      "total_amount": 150.00,
      "successful_donations": 3,
      "average_donation": 50.00
    }
  }
}
```

**Errors:**
- `401 UNAUTHENTICATED` - Missing or invalid token
- `403 FORBIDDEN` - User is not a donor

---

#### **GET /api/intakes/me**
Get authenticated client's intake records.

**Authentication:** Required (client role)

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "intakes": [...],
    "services": [...],
    "profile": {...}
  }
}
```

**Errors:**
- `401 UNAUTHENTICATED` - Missing or invalid token
- `403 FORBIDDEN` - User is not a client

---

#### **GET /api/volunteer/hours**
Get authenticated volunteer's hours and tasks.

**Authentication:** Required (volunteer role)

**Headers:**
```http
Authorization: Bearer <token>
```

**Query Parameters:**
- `start_date` (optional) - Filter from date
- `end_date` (optional) - Filter to date
- `limit` (optional) - Results per page (default: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "volunteer": {
      "id": 123,
      "name": "Jane Doe",
      "status": "active"
    },
    "hours": [...],
    "tasks": [...],
    "stats": {
      "total_hours": 45.5,
      "verified_hours": 40.0,
      "unverified_hours": 5.5
    }
  }
}
```

**Errors:**
- `401 UNAUTHENTICATED` - Missing or invalid token
- `403 FORBIDDEN` - User is not a volunteer
- `404 NOT_FOUND` - Volunteer record not found

---

#### **GET /api/profile/me**
Get authenticated user's profile.

**Authentication:** Required (any role)

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "donor"
    },
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

#### **PUT /api/profile/me**
Update authenticated user's profile.

**Authentication:** Required (any role)

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "John Updated",
  "phone": "+1-555-123-4567",
  "address": {
    "street": "123 Main St",
    "city": "Newark",
    "state": "NJ",
    "zip": "07102"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {...}
  },
  "message": "Profile updated successfully"
}
```

**Note:** Users **cannot** change their own role. Only admins can modify roles.

---

### Admin-Only Endpoints

#### **GET /api/donations/history**
Get all donation records (admin only).

**Authentication:** Required (admin role)

**Headers:**
```http
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status` (optional) - Filter by status (pending, succeeded, failed)
- `donor_email` (optional) - Filter by donor email
- `start_date` (optional) - Filter from date
- `end_date` (optional) - Filter to date
- `limit` (optional) - Results per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "donations": [...],
    "count": 10,
    "total": 125,
    "summary": {
      "total_amount": 5250.00,
      "successful_donations": 100,
      "average_donation": 52.50
    },
    "pagination": {
      "limit": 50,
      "offset": 0
    }
  }
}
```

**Errors:**
- `401 UNAUTHENTICATED` - Missing or invalid token
- `403 FORBIDDEN` - User is not an admin

---

#### **GET /api/admin/volunteers**
Get all volunteer records (admin only).

**Authentication:** Required (admin role)

**Headers:**
```http
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status` (optional) - Filter by status (pending, approved, active, inactive)
- `food_bank_id` (optional) - Filter by food bank
- `limit` (optional) - Results per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "volunteers": [
      {
        "id": 1,
        "name": "Jane Volunteer",
        "email": "jane@example.com",
        "status": "active",
        "food_banks": {
          "id": 1,
          "name": "Newark Food Bank"
        }
      }
    ],
    "total": 45,
    "pagination": {
      "limit": 50,
      "offset": 0
    }
  }
}
```

**Errors:**
- `401 UNAUTHENTICATED` - Missing or invalid token
- `403 FORBIDDEN` - User is not an admin

---

#### **POST /api/admin/volunteers**
Create a new volunteer record (admin only).

**Authentication:** Required (admin role)

**Headers:**
```http
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "New Volunteer",
  "email": "volunteer@example.com",
  "phone": "+1-555-123-4567",
  "food_bank_id": 1,
  "status": "pending"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "volunteer": {
      "id": 46,
      "name": "New Volunteer",
      "email": "volunteer@example.com",
      "status": "pending",
      "created_at": "2024-01-15T12:00:00Z"
    }
  }
}
```

**Errors:**
- `401 UNAUTHENTICATED` - Missing or invalid token
- `403 FORBIDDEN` - User is not an admin
- `400 MISSING_REQUIRED_FIELD` - Missing name or email

---

#### **POST /api/directory/food-banks**
Create a new food bank (admin only).

**Authentication:** Required (admin role)

**Headers:**
```http
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "New Food Bank",
  "address": "456 Oak St, Newark, NJ 07102",
  "county": "Essex",
  "city": "Newark",
  "phone": "+1-555-123-4567",
  "active": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "foodBank": {
      "id": 25,
      "name": "New Food Bank",
      "address": "456 Oak St, Newark, NJ 07102",
      "active": true
    }
  }
}
```

**Errors:**
- `401 UNAUTHENTICATED` - Missing or invalid token
- `403 FORBIDDEN` - User is not an admin
- `400 MISSING_REQUIRED_FIELD` - Missing name or address

---

#### **GET /api/admin/dashboard**
Get admin dashboard statistics.

**Authentication:** Required (admin role)

**Headers:**
```http
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `timeframe` (optional) - Days to look back (default: 30)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "volunteers": {
      "total": 150,
      "active": 120,
      "pending": 15
    },
    "donors": {
      "total": 500,
      "active": 450,
      "totalRaised": 25000.00
    },
    "donations": {
      "total": 1250,
      "totalAmount": 62500.00,
      "recentAmount": 5000.00
    },
    "events": {
      "upcoming": 5,
      "volunteersNeeded": 20
    }
  }
}
```

---

## Example Requests

### cURL Examples

#### Public Donation
```bash
curl -X POST https://api.seedandspoon.org/api/donations/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "donor_email": "donor@example.com",
    "donor_name": "Jane Donor"
  }'
```

#### Get Food Banks
```bash
curl "https://api.seedandspoon.org/api/directory/food-banks?latitude=40.7357&longitude=-74.1724&radius=5"
```

#### Authenticated Request (Donor)
```bash
curl -X GET https://api.seedandspoon.org/api/donations/me \
  -H "Authorization: Bearer eyJhbGc...your_token_here"
```

#### Admin Request
```bash
curl -X GET https://api.seedandspoon.org/api/admin/dashboard \
  -H "Authorization: Bearer eyJhbGc...admin_token_here"
```

### JavaScript/Fetch Examples

#### Create Donation
```javascript
const createDonation = async (amount, email, name) => {
  const response = await fetch('https://api.seedandspoon.org/api/donations/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount,
      donor_email: email,
      donor_name: name
    })
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message)
  }

  return result.data
}
```

#### Authenticated Request
```javascript
const getMyDonations = async (token) => {
  const response = await fetch('https://api.seedandspoon.org/api/donations/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message)
  }

  return result.data
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react'
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react'

export function useDonations() {
  const session = useSession()
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session?.access_token) return

    const fetchDonations = async () => {
      try {
        const response = await fetch('https://api.seedandspoon.org/api/donations/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.message)
        }

        setDonations(result.data.donations)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDonations()
  }, [session])

  return { donations, loading, error }
}
```

---

## Common Failure Causes

### 1. CORS Errors

**Symptom:** Browser console shows CORS policy error

**Causes:**
- Frontend not running on allowed origin
- Missing or incorrect `FRONTEND_ORIGIN` environment variable
- Preflight OPTIONS request failing

**Solution:**
```bash
# Development
FRONTEND_ORIGIN=http://localhost:3000

# Production
FRONTEND_ORIGIN=https://seedandspoon.org
```

---

### 2. 401 Unauthenticated

**Symptom:** `{"success": false, "error": "UNAUTHENTICATED", ...}`

**Causes:**
- Missing `Authorization` header
- Token not in `Bearer <token>` format
- Token is expired
- Token is invalid

**Solutions:**
- Check header format: `Authorization: Bearer ${token}`
- Verify token is not expired
- Use `supabase.auth.refreshSession()` to get new token
- Re-authenticate if token refresh fails

---

### 3. 403 Forbidden

**Symptom:** `{"success": false, "error": "FORBIDDEN", ...}`

**Causes:**
- User doesn't have required role
- User trying to access another user's data
- Admin-only endpoint accessed by non-admin

**Solutions:**
- Verify user has correct role in Supabase profiles table
- Check that user is accessing their own resources only
- Ensure admin users have `role = 'admin'` in profiles table

---

### 4. 400 Validation Error

**Symptom:** `{"success": false, "error": "VALIDATION_ERROR", ...}`

**Causes:**
- Missing required fields
- Invalid data format
- Out-of-range values

**Solutions:**
- Check request body matches API documentation
- Validate data on frontend before sending
- Read error message for specific field/issue

---

### 5. 500 Internal Error

**Symptom:** `{"success": false, "error": "INTERNAL_ERROR", ...}`

**Causes:**
- Server-side bug
- Database connection issue
- External service (Stripe) failure

**Solutions:**
- Check backend logs for detailed error
- Retry request (may be transient failure)
- Contact backend team if persistent

---

### 6. Token Expiration

**Symptom:** Requests work initially, then fail with 401

**Cause:** Supabase tokens expire (default: 1 hour)

**Solution:**
```javascript
// Set up automatic token refresh
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // Update token in your API client
    apiClient.setToken(session.access_token)
  }
})
```

---

## Security Considerations

### Do's ✅

1. **Always use HTTPS** in production
2. **Store tokens securely** (httpOnly cookies or secure storage)
3. **Refresh tokens** before they expire
4. **Validate all inputs** on frontend before sending
5. **Handle errors gracefully** and show user-friendly messages
6. **Use environment variables** for API URLs and keys
7. **Implement rate limiting** on frontend for sensitive actions

### Don'ts ❌

1. **Never expose tokens** in URLs or logs
2. **Never store tokens** in localStorage (XSS risk)
3. **Never trust client-side validation** alone
4. **Never hardcode** API URLs or credentials
5. **Never ignore** CORS or auth errors
6. **Never retry** authentication errors indefinitely
7. **Never expose** admin credentials in frontend code

---

## Environment Variables

### Frontend (.env.local)

```bash
# Supabase (public - safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Base URL
NEXT_PUBLIC_API_URL=http://localhost:3000  # development
# NEXT_PUBLIC_API_URL=https://api.seedandspoon.org  # production
```

### Backend (.env)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # NEVER expose to frontend!

# Stripe
STRIPE_SECRET_KEY=sk_test_...  # NEVER expose to frontend!
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
FRONTEND_ORIGIN=http://localhost:3000  # Must match frontend URL
```

---

## Support

For questions or issues:

1. Check this guide first
2. Review [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md)
3. Check backend logs for detailed errors
4. Contact backend team

---

## Changelog

### 2024-01-15
- Initial API hardening release
- Added CORS middleware
- Standardized error responses
- Enhanced authentication enforcement
- Created comprehensive documentation

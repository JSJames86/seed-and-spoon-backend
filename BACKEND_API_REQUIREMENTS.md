# Backend API Requirements

This document outlines the API endpoints and requirements for the Seed & Spoon backend. These endpoints power the nonprofit website for food bank directory, volunteer management, and donation processing.

## Base URL

- **Local Development**: `http://localhost:3000`
- **Production**: `https://your-domain.vercel.app`

## Authentication

⚠️ **Note**: Admin routes currently do not have authentication. This should be implemented before production deployment using:
- JWT tokens
- Supabase Auth
- Role-based access control (admin/staff/partner)

## Required Environment Variables

All API keys and secrets must be configured before deployment:

```bash
# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe (Payment Processing)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Google Maps (Location Services)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## CORS Configuration

The backend must allow requests from:
- Frontend domain (production): `https://your-frontend-domain.com`
- Local development: `http://localhost:3001` (or your frontend dev port)

CORS headers should include:
- `Access-Control-Allow-Origin`: Frontend domain
- `Access-Control-Allow-Methods`: GET, POST, PUT, DELETE, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, Authorization

## API Endpoints

### 1. Directory Endpoints (Public)

#### GET /api/directory/food-banks
List all active food banks with optional filtering and proximity search.

**Query Parameters:**
- `latitude` (number, optional): User latitude for proximity search
- `longitude` (number, optional): User longitude for proximity search
- `radius` (number, optional): Search radius in miles (default: 10)
- `county` (string, optional): Filter by county name
- `city` (string, optional): Filter by city name
- `include_directions` (boolean, optional): Include Google Maps directions URL

**Response:**
```json
{
  "foodBanks": [
    {
      "id": 1,
      "name": "Community Food Bank",
      "address": "123 Main St, Newark, NJ 07102",
      "phone": "(555) 123-4567",
      "website": "https://example.com",
      "county": "Essex",
      "distance": 2.5,
      "directions_url": "https://maps.google.com/..."
    }
  ],
  "count": 1,
  "filters": {
    "county": "Essex",
    "radius": 10
  }
}
```

#### POST /api/directory/food-banks
Create a new food bank entry.

**Request Body:**
```json
{
  "name": "New Food Bank",
  "address": "456 Oak Ave, Newark, NJ",
  "phone": "(555) 987-6543",
  "county_id": 1,
  "website": "https://newfoodbank.org",
  "is_active": true
}
```

#### GET /api/directory/services
List services offered by food banks.

**Query Parameters:**
- `food_bank_id` (number, optional): Filter by food bank
- `service_type` (string, optional): Filter by service type

**Response:**
```json
{
  "services": [
    {
      "id": 1,
      "food_bank_id": 1,
      "service_type": "Food Pantry",
      "description": "Emergency food assistance",
      "food_bank_name": "Community Food Bank"
    }
  ]
}
```

#### GET /api/directory/hours
Get operating hours for a food bank.

**Query Parameters:**
- `food_bank_id` (number, required): Food bank ID

**Response:**
```json
{
  "hours": [
    {
      "id": 1,
      "food_bank_id": 1,
      "day_of_week": "Monday",
      "open_time": "09:00",
      "close_time": "17:00"
    }
  ]
}
```

### 2. Donations & Stripe Integration

#### POST /api/donations/create
Create a new donation payment intent.

**Request Body:**
```json
{
  "amount": 50.00,
  "currency": "usd",
  "donor_email": "donor@example.com",
  "donor_name": "John Doe",
  "metadata": {
    "campaign": "spring2024"
  }
}
```

**Response:**
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx",
  "amount": 50.00,
  "currency": "usd"
}
```

**Frontend Integration:**
Use the `client_secret` with Stripe.js to complete payment:
```javascript
const stripe = Stripe('pk_test_...');
const {error} = await stripe.confirmCardPayment(client_secret, {
  payment_method: {
    card: cardElement,
    billing_details: {email: 'donor@example.com'}
  }
});
```

#### GET /api/donations/history
Retrieve donation history with filters.

**Query Parameters:**
- `status` (string, optional): succeeded, failed, pending
- `donor_email` (string, optional): Filter by donor
- `start_date` (string, optional): ISO date
- `end_date` (string, optional): ISO date
- `limit` (number, optional): Default 50
- `offset` (number, optional): Default 0

**Response:**
```json
{
  "donations": [...],
  "count": 42,
  "total": 2500.00,
  "summary": {
    "total_amount": 2500.00,
    "successful_donations": 40,
    "average_donation": 62.50
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 42
  }
}
```

#### GET /api/donations/stats
Get donation statistics.

**Query Parameters:**
- `period` (string, optional): today, week, month, year, all (default: all)

**Response:**
```json
{
  "total_donations": 100,
  "successful_donations": 95,
  "total_amount": 12500.00,
  "average_donation": 125.00,
  "largest_donation": 500.00,
  "unique_donors": 75,
  "success_rate": 95.0
}
```

#### POST /api/donations/webhook
Stripe webhook endpoint for payment events.

**Webhook Configuration:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/donations/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

**Events Handled:**
- `payment_intent.succeeded`: Log successful donation to database
- `payment_intent.payment_failed`: Log failed payment attempt

### 3. Google Maps Integration

#### GET /api/maps/nearby
Find food banks near a location.

**Query Parameters:**
- `latitude` (number, required): User latitude
- `longitude` (number, required): User longitude
- `radius` (number, optional): Search radius in miles (default: 5)
- `limit` (number, optional): Max results (default: 10)
- `include_map` (boolean, optional): Include static map URL

**Response:**
```json
{
  "location": {
    "latitude": 40.7357,
    "longitude": -74.1724
  },
  "radius_miles": 5,
  "count": 3,
  "food_banks": [
    {
      "id": 1,
      "name": "Community Food Bank",
      "distance": 1.2,
      "directions_url": "https://maps.google.com/..."
    }
  ],
  "map_url": "https://maps.googleapis.com/..."
}
```

#### GET /api/maps/geocode
Convert address to coordinates.

**Query Parameters:**
- `address` (string, required): Full address

**Response:**
```json
{
  "address": "123 Main St, Newark, NJ",
  "coordinates": {
    "latitude": 40.7357,
    "longitude": -74.1724
  }
}
```

#### GET /api/maps/distance
Calculate distance between two points.

**Query Parameters:**
- `lat1`, `lng1` (numbers, required): Origin coordinates
- `lat2`, `lng2` (numbers, required): Destination coordinates

**Response:**
```json
{
  "distance_miles": 5.3,
  "distance_km": 8.5,
  "origin": {"latitude": 40.7357, "longitude": -74.1724},
  "destination": {"latitude": 40.7282, "longitude": -74.0776}
}
```

### 4. Admin / Volunteer Management

⚠️ **Authentication Required** (to be implemented)

#### GET /api/admin/volunteers
List volunteers with pagination.

**Query Parameters:**
- `status` (string, optional): Filter by status
- `food_bank_id` (number, optional): Filter by food bank
- `limit` (number, optional): Default 50
- `offset` (number, optional): Default 0

#### POST /api/admin/volunteers
Create a new volunteer record.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "age_range": "18-25",
  "type": "individual",
  "contact": "jane@example.com",
  "availability": "weekends"
}
```

#### GET /api/admin/volunteer?id={id}
Get single volunteer details.

#### PUT /api/admin/volunteer?id={id}
Update volunteer record.

#### DELETE /api/admin/volunteer?id={id}
Delete volunteer record.

#### GET /api/admin/notes
List admin notes.

**Query Parameters:**
- `resource_type` (string, optional): volunteer, food_bank, donation
- `resource_id` (number, optional): Filter by resource
- `limit`, `offset` (numbers, optional): Pagination

#### POST /api/admin/notes
Create a new note.

**Request Body:**
```json
{
  "resource_type": "volunteer",
  "resource_id": 123,
  "content": "Called and confirmed availability"
}
```

## Implementation Checklist

### Backend Team Tasks

- [x] Implement all API endpoints
- [x] Set up Supabase database schema
- [x] Integrate Stripe payment processing
- [x] Integrate Google Maps API
- [ ] Configure CORS for frontend domain
- [ ] Set up Stripe webhook endpoint
- [ ] Add authentication to admin routes
- [ ] Deploy to Vercel
- [ ] Configure environment variables in Vercel
- [ ] Test all endpoints

### Frontend Team Tasks

- [ ] Create .env.local with backend URL
- [ ] Add Stripe publishable key to frontend
- [ ] Implement donation flow with Stripe.js
- [ ] Test API integration locally
- [ ] Verify CORS configuration works
- [ ] Test production deployment

## Testing the API

### Local Testing

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev

# Test endpoints
curl http://localhost:3000/api/directory/food-banks
curl http://localhost:3000/api/donations/stats
```

### Production Testing

```bash
# Test food banks endpoint
curl https://your-domain.vercel.app/api/directory/food-banks

# Test with query parameters
curl "https://your-domain.vercel.app/api/directory/food-banks?county=Essex&radius=5"

# Test donation creation
curl -X POST https://your-domain.vercel.app/api/donations/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 25, "donor_email": "test@example.com"}'
```

## Error Handling

All endpoints return errors in the following format:

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (missing or invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

⚠️ **To be implemented**: Consider adding rate limiting for:
- Donation endpoints: 10 requests per minute per IP
- Public directory endpoints: 100 requests per minute per IP
- Admin endpoints: 50 requests per minute per user

## Security Considerations

1. **Environment Variables**: Never commit API keys to git
2. **Stripe Webhooks**: Always verify webhook signatures
3. **CORS**: Only allow requests from authorized domains
4. **Input Validation**: Validate all user inputs
5. **SQL Injection**: Use parameterized queries (Supabase client handles this)
6. **Authentication**: Implement JWT/session auth for admin routes
7. **HTTPS Only**: Enforce HTTPS in production

## Support

For questions or issues:
- GitHub Issues: https://github.com/JSJames86/seed-and-spoon-backend/issues
- Documentation: See README.md and DATABASE_SCHEMA.md

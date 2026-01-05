# Troubleshooting Guide

This guide helps diagnose and fix common issues with the Seed & Spoon backend, especially when the frontend can't connect or features aren't working.

## Quick Diagnosis

### Step 1: Check API Health

Visit your backend's health endpoint to get a full diagnostic report:

**Local:**
```
http://localhost:3000/api/health
```

**Production:**
```
https://your-backend.vercel.app/api/health
```

This will show you:
- ✅ What's working
- ❌ What's broken
- 💡 Recommendations to fix issues

### Step 2: Check Common Issues

Look for these common problems in the health check response:

| Issue | Symptom | Fix |
|-------|---------|-----|
| Supabase not connected | `supabase.status: "error"` | Set environment variables |
| No food banks | `food_banks_total: 0` | Run `npm run seed:all` |
| No coordinates | `food_banks_with_coordinates: 0` | Run `npm run geocode` |
| Stripe not configured | `stripe.status: "error"` | Set Stripe API keys |
| Google Maps not configured | `google_maps.status: "error"` | Set Google Maps API key |

## Problem: Maps Not Showing Up

### Symptoms
- Maps show "render" or loading indefinitely
- "Nearby food banks" returns empty results
- Frontend can't display map locations

### Root Causes & Fixes

#### Cause 1: Food Banks Missing Coordinates

**Diagnosis:**
```bash
curl http://localhost:3000/api/health | grep food_banks_with_coordinates
```

If the count is 0, your food banks don't have latitude/longitude.

**Fix:**
```bash
# Make sure your .env.local has GOOGLE_MAPS_API_KEY set
npm run geocode
```

This will automatically add coordinates to all food banks.

#### Cause 2: Google Maps API Key Not Set

**Diagnosis:**
Check your environment variables:
```bash
# Local
cat .env.local | grep GOOGLE_MAPS_API_KEY

# Production (Vercel)
# Go to Vercel Dashboard → Your Project → Settings → Environment Variables
```

**Fix:**

1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable these APIs:
   - Maps JavaScript API
   - Geocoding API
   - Distance Matrix API
3. Add to environment:
   ```bash
   # Local (.env.local)
   GOOGLE_MAPS_API_KEY=your_actual_key_here

   # Production (Vercel Dashboard)
   # Add as environment variable
   ```

#### Cause 3: API Not Responding

**Diagnosis:**
```bash
# Test the nearby endpoint
curl "http://localhost:3000/api/maps/nearby?latitude=40.7357&longitude=-74.1724&radius=10"
```

**Expected Response:**
```json
{
  "location": { "latitude": 40.7357, "longitude": -74.1724 },
  "food_banks": [ ... ]
}
```

**Fix:**
- If you get CORS error: Check ALLOWED_ORIGIN environment variable
- If you get 500 error: Check Supabase connection
- If food_banks array is empty: Food banks need coordinates (run `npm run geocode`)

## Problem: Donate Button Not Working

### Symptoms
- Donate button does nothing when clicked
- Payment fails with error
- No payment intent created

### Root Causes & Fixes

#### Cause 1: Stripe Keys Not Configured

**Diagnosis:**
```bash
curl http://localhost:3000/api/health | grep stripe
```

**Fix:**

1. Get keys from [Stripe Dashboard](https://dashboard.stripe.com/)
2. Toggle to **Test mode** (top right)
3. Go to Developers → API keys
4. Copy keys:

**Backend (.env.local or Vercel):**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### Cause 2: Frontend/Backend Mismatch

**Diagnosis:**
Check if frontend is pointing to the correct backend URL:

```javascript
// In your frontend .env.local
console.log(process.env.NEXT_PUBLIC_BACKEND_URL)
```

**Fix:**
```bash
# Frontend .env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000    # Local
# OR
NEXT_PUBLIC_BACKEND_URL=https://your-backend.vercel.app  # Production
```

#### Cause 3: CORS Blocking Request

**Diagnosis:**
Open browser console (F12) and look for:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Fix:**

**Backend (.env.local or Vercel):**
```bash
# Development (allow all)
ALLOWED_ORIGIN=*

# Production (specific domain)
ALLOWED_ORIGIN=https://your-frontend-domain.com
```

Then restart the backend:
```bash
npm run dev
```

#### Cause 4: Invalid Payment Intent

**Diagnosis:**
Test the create endpoint:
```bash
curl -X POST http://localhost:3000/api/donations/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 25, "donor_email": "test@example.com"}'
```

**Expected Response:**
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx",
  "amount": 25,
  "currency": "usd"
}
```

**Fix:**
- If you get error: Check Stripe keys are correct
- If Stripe test mode is enabled, use test card: 4242 4242 4242 4242

## Problem: Frontend Can't Connect to Backend

### Symptoms
- All API requests fail
- Network errors in browser console
- "Failed to fetch" errors

### Root Causes & Fixes

#### Cause 1: Wrong Backend URL

**Diagnosis:**
```javascript
// In frontend, check what URL is being used
console.log(process.env.NEXT_PUBLIC_BACKEND_URL)
```

**Fix:**
```bash
# Frontend .env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

Restart frontend:
```bash
npm run dev
```

#### Cause 2: Backend Not Running

**Diagnosis:**
```bash
# Try to access the health endpoint
curl http://localhost:3000/api/health
```

**Fix:**
```bash
# In backend directory
npm run dev
```

Backend should be running on port 3000.

#### Cause 3: CORS Issues

**Diagnosis:**
Browser console shows CORS error.

**Fix:**

1. **Backend** - Set ALLOWED_ORIGIN:
   ```bash
   # .env.local
   ALLOWED_ORIGIN=http://localhost:3001  # Your frontend port
   ```

2. Restart backend:
   ```bash
   npm run dev
   ```

3. **Vercel Production** - Add environment variable:
   ```
   ALLOWED_ORIGIN=https://your-frontend-domain.com
   ```

## Problem: Vercel Deployment Issues

### Environment Variables Not Set

**Diagnosis:**
Visit `https://your-backend.vercel.app/api/health`

**Fix:**

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add ALL variables from `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   STRIPE_SECRET_KEY
   STRIPE_WEBHOOK_SECRET
   GOOGLE_MAPS_API_KEY
   ALLOWED_ORIGIN
   ```
5. Redeploy

### Build Fails on Vercel

**Diagnosis:**
Check build logs in Vercel dashboard.

**Common Errors:**

1. **"Missing environment variables"**
   - Add all required env vars in Vercel settings

2. **"Module not found"**
   ```bash
   # Locally, ensure clean install
   rm -rf node_modules package-lock.json
   npm install
   git add package-lock.json
   git commit -m "Update dependencies"
   git push
   ```

3. **"Build timeout"**
   - Check if any scripts are running infinitely
   - Ensure seed scripts aren't running during build

## Complete Environment Variable Checklist

### Backend (.env.local or Vercel)

```bash
# Required for database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Required for donations
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Required for maps
GOOGLE_MAPS_API_KEY=AIzaxxx

# Required for CORS
ALLOWED_ORIGIN=*                                    # Development
ALLOWED_ORIGIN=https://your-frontend-domain.com     # Production
```

### Frontend (.env.local)

```bash
# Backend connection
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000                     # Local
NEXT_PUBLIC_BACKEND_URL=https://your-backend.vercel.app          # Production

# Stripe (for payment processing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Google Maps (optional, for frontend maps)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaxxx
```

## Step-by-Step: Full Reset & Setup

If nothing else works, follow this complete reset:

### Backend

```bash
# 1. Clean install
rm -rf node_modules package-lock.json .next
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your actual keys

# 3. Test health check
npm run dev
curl http://localhost:3000/api/health

# 4. Seed database (if needed)
npm run seed:all

# 5. Geocode food banks (if needed)
npm run geocode

# 6. Test endpoints
curl http://localhost:3000/api/directory/food-banks
curl "http://localhost:3000/api/maps/nearby?latitude=40.7357&longitude=-74.1724"
```

### Frontend

```bash
# 1. Set up environment
# Create .env.local with backend URL
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:3000" > .env.local
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key" >> .env.local

# 2. Test connection
npm run dev
# Open browser console, check for errors
```

## Getting Help

### Useful Debug Commands

```bash
# Check health status
curl http://localhost:3000/api/health | json_pp

# Test food banks endpoint
curl http://localhost:3000/api/directory/food-banks

# Test nearby with coordinates
curl "http://localhost:3000/api/maps/nearby?latitude=40.7357&longitude=-74.1724&radius=10"

# Test donation creation
curl -X POST http://localhost:3000/api/donations/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 25, "donor_email": "test@example.com"}'

# Check environment variables are loaded
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.GOOGLE_MAPS_API_KEY)"
```

### Still Having Issues?

1. **Check the health endpoint**: `/api/health`
2. **Review logs**:
   - Local: Check terminal output
   - Vercel: Dashboard → Deployments → [Your deployment] → Logs
3. **Browser console**: F12 → Console tab → Check for errors
4. **Network tab**: F12 → Network tab → Look for failed requests

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Missing Supabase environment variables" | Env vars not set | Add to .env.local |
| "Geocoding failed" | Invalid Google Maps key | Check API key and enabled APIs |
| "Stripe authentication failed" | Wrong Stripe key | Use correct test/live key |
| "CORS policy blocked" | CORS not configured | Set ALLOWED_ORIGIN |
| "food_banks_with_coordinates: 0" | No coordinates | Run `npm run geocode` |
| "Network error" | Backend not accessible | Check URL and port |

## Quick Reference

### Essential URLs

- **Health Check**: `/api/health`
- **Food Banks**: `/api/directory/food-banks`
- **Nearby**: `/api/maps/nearby?latitude=X&longitude=Y`
- **Donate**: `/api/donations/create`

### Essential Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run seed:all     # Import food bank data
npm run geocode      # Add coordinates to food banks
```

### Getting API Keys

- **Supabase**: https://app.supabase.com/ → Project → Settings → API
- **Stripe**: https://dashboard.stripe.com/ → Developers → API keys
- **Google Maps**: https://console.cloud.google.com/ → APIs & Services → Credentials

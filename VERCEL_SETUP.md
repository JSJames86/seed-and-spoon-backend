# Vercel Deployment Setup

## Quick Fix for Environment Variable Error

The deployment error `Environment Variable "NEXT_PUBLIC_SUPABASE_URL" references Secret "supabase_url", which does not exist` means you need to set environment variables in the Vercel dashboard.

---

## Step 1: Set Environment Variables in Vercel Dashboard

Go to your Vercel project → Settings → Environment Variables

Add the following variables:

### Required Environment Variables

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` | Production, Preview, Development |
| `STRIPE_SECRET_KEY` | `sk_live_...` (production) or `sk_test_...` (dev) | Production, Preview, Development |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production, Preview, Development |
| `GOOGLE_MAPS_API_KEY` | `your-google-maps-key` | Production, Preview, Development |
| `FRONTEND_ORIGIN` | `https://seedandspoon.org` (prod) or `http://localhost:3000` (dev) | Production, Preview, Development |

### How to Add Variables

1. **Navigate:** Vercel Dashboard → Your Project → Settings → Environment Variables

2. **Add Each Variable:**
   - Click "Add New"
   - Enter variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter value
   - Select environments (Production, Preview, Development)
   - Click "Save"

3. **Repeat** for all variables above

---

## Step 2: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click Settings (⚙️) → API
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (**Never expose this!**)

---

## Step 3: Get Your Stripe Credentials

1. Go to Stripe Dashboard → Developers → API Keys
2. Copy:
   - **Secret key** → `STRIPE_SECRET_KEY`
   - For live: `sk_live_...`
   - For test: `sk_test_...`

3. Get webhook secret:
   - Go to Developers → Webhooks
   - Click on your webhook endpoint
   - Click "Reveal" next to Signing secret
   - Copy → `STRIPE_WEBHOOK_SECRET`

---

## Step 4: Frontend Origin (CORS)

Set `FRONTEND_ORIGIN` to match your frontend URL **exactly** (no trailing slash):

**Production:**
```
FRONTEND_ORIGIN=https://seedandspoon.org
```

**Preview/Development:**
```
FRONTEND_ORIGIN=http://localhost:3000
```

**Important:** This must match your frontend URL exactly for CORS to work.

---

## Step 5: Verify Build Configuration

The `vercel.json` already configures:
- ✅ Build command: `bun run build`
- ✅ Install command: `bun install`
- ✅ Framework: Next.js
- ✅ npm disabled (Bun only)

No additional configuration needed.

---

## Step 6: Deploy

After setting all environment variables:

1. **Redeploy:**
   - Go to Deployments tab
   - Click "..." on failed deployment
   - Click "Redeploy"

2. **Or push new commit:**
   ```bash
   git push origin claude/migrate-npm-to-bun-NvuYS
   ```

3. **Verify build logs:**
   - Should see "Using Bun"
   - Should see `bun install` (not `npm install`)
   - Should complete successfully

---

## Troubleshooting

### Build Still Failing?

**Check:**
1. ✅ All environment variables are set
2. ✅ Variable names match exactly (case-sensitive)
3. ✅ No typos in variable names
4. ✅ Values are correct (no extra spaces)

### CORS Errors After Deployment?

**Check:**
1. ✅ `FRONTEND_ORIGIN` matches your frontend URL exactly
2. ✅ No trailing slash in `FRONTEND_ORIGIN`
3. ✅ Frontend is making requests to correct backend URL

### Supabase Auth Not Working?

**Check:**
1. ✅ `NEXT_PUBLIC_SUPABASE_URL` is correct
2. ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
3. ✅ `SUPABASE_SERVICE_ROLE_KEY` is the service role (not anon key)

### Stripe Not Working?

**Check:**
1. ✅ Using correct key for environment (test vs live)
2. ✅ Webhook secret matches Stripe dashboard
3. ✅ Webhook endpoint is configured in Stripe

---

## Security Best Practices

### ✅ DO:
- Use Vercel's environment variables (encrypted)
- Use different keys for production vs development
- Rotate keys periodically
- Use Stripe test keys in development

### ❌ DON'T:
- Commit `.env` files to git
- Share service role keys
- Use production keys in development
- Expose secrets in frontend code

---

## Environment Variable Reference

### Public Variables (Safe to Expose)

These can be accessed in frontend code:

```javascript
process.env.NEXT_PUBLIC_SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Private Variables (Server-Side Only)

These should **NEVER** be exposed to frontend:

```javascript
process.env.SUPABASE_SERVICE_ROLE_KEY  // ⚠️ Server-side only!
process.env.STRIPE_SECRET_KEY           // ⚠️ Server-side only!
process.env.STRIPE_WEBHOOK_SECRET       // ⚠️ Server-side only!
process.env.GOOGLE_MAPS_API_KEY         // ⚠️ Server-side only!
process.env.FRONTEND_ORIGIN             // ⚠️ Server-side only!
```

---

## Quick Reference

### Example .env (for local development)

**Do not commit this file!**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe (use test keys in development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...

# CORS
FRONTEND_ORIGIN=http://localhost:3000
```

---

## Need Help?

1. Check [API_CONSUMPTION_GUIDE.md](./API_CONSUMPTION_GUIDE.md)
2. Check [BUN_BACKEND_MIGRATION.md](./BUN_BACKEND_MIGRATION.md)
3. Verify environment variables in Vercel dashboard
4. Check Vercel build logs for specific errors
5. Contact backend team

---

## Summary

**To fix the deployment error:**

1. Go to Vercel → Settings → Environment Variables
2. Add all required variables from the table above
3. Redeploy
4. Verify build succeeds

**That's it!** The `vercel.json` no longer tries to reference secrets - environment variables are managed entirely through the Vercel dashboard.

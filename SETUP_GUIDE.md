# Local Environment Setup Guide

This guide will help you set up the Seed & Spoon backend for local development and integrate it with your frontend application.

## Prerequisites

Before you begin, make sure you have:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** for version control
- A **Supabase** account ([Sign up](https://supabase.com/))
- A **Stripe** account ([Sign up](https://stripe.com/))
- A **Google Cloud** account with Maps API enabled ([Get started](https://cloud.google.com/maps-platform))

## Backend Setup

### 1. Clone the Repository

```bash
git clone https://github.com/JSJames86/seed-and-spoon-backend.git
cd seed-and-spoon-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file by copying the example:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your actual API keys:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# CORS Configuration
ALLOWED_ORIGIN=*
```

#### Where to Find Your API Keys:

**Supabase:**
1. Go to [app.supabase.com](https://app.supabase.com/)
2. Select your project
3. Go to Settings → API
4. Copy the `URL` for `NEXT_PUBLIC_SUPABASE_URL`
5. Copy the `service_role` key for `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

**Stripe:**
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com/)
2. Toggle to "Test mode" in the top right
3. Go to Developers → API keys
4. Copy the "Secret key" for `STRIPE_SECRET_KEY`
5. For webhook secret: Go to Developers → Webhooks → Add endpoint (see Stripe Webhook Setup below)

**Google Maps:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Geocoding API
   - Distance Matrix API
4. Go to Credentials → Create Credentials → API Key
5. Copy the API key for `GOOGLE_MAPS_API_KEY`

### 4. Set Up Supabase Database

Run the SQL schema to create all required tables. See `DATABASE_SCHEMA.md` for the complete schema.

Key tables:
- `counties` - County information
- `food_banks` - Food bank directory
- `services` - Services offered by food banks
- `hours` - Operating hours
- `donations` - Donation records
- `volunteers` - Volunteer management
- `admin_notes` - Admin notes and CRM

### 5. Import Sample Data (Optional)

Import food bank data from CSV files:

```bash
# Import all counties
npm run seed:all

# Or import specific counties
npm run seed:bergen
npm run seed:hudson
npm run seed:union
npm run seed:newark-essex
```

### 6. Run the Development Server

```bash
npm run dev
```

The backend API will be available at: **http://localhost:3000/api**

### 7. Test the API

Open your browser or use curl to test endpoints:

```bash
# Test food banks endpoint
curl http://localhost:3000/api/directory/food-banks

# Test donation stats
curl http://localhost:3000/api/donations/stats

# Test nearby food banks
curl "http://localhost:3000/api/maps/nearby?latitude=40.7357&longitude=-74.1724&radius=5"
```

## Frontend Setup

### 1. Create Frontend .env.local

In your frontend project, create a `.env.local` file:

```bash
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Stripe Publishable Key (from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Google Maps API Key (same as backend)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 2. Install Required Packages

```bash
npm install @stripe/stripe-js axios
# or
npm install @stripe/stripe-js fetch
```

### 3. Example: Fetch Food Banks

```javascript
// Example: Fetching food banks in your frontend
const fetchFoodBanks = async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/directory/food-banks?county=Essex`
  );
  const data = await response.json();
  return data.foodBanks;
};
```

### 4. Example: Create Donation

```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const createDonation = async (amount, email) => {
  // 1. Create payment intent on backend
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/donations/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount,
        donor_email: email,
      }),
    }
  );

  const { client_secret } = await response.json();

  // 2. Confirm payment with Stripe
  const stripe = await stripePromise;
  const { error } = await stripe.confirmCardPayment(client_secret, {
    payment_method: {
      card: cardElement, // Your Stripe card element
      billing_details: { email },
    },
  });

  if (error) {
    console.error('Payment failed:', error);
  } else {
    console.log('Payment successful!');
  }
};
```

### 5. Example: Find Nearby Food Banks

```javascript
const findNearbyFoodBanks = async (latitude, longitude) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/maps/nearby?latitude=${latitude}&longitude=${longitude}&radius=10`
  );
  const data = await response.json();
  return data.food_banks;
};

// Get user's location
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;
  const nearby = await findNearbyFoodBanks(latitude, longitude);
  console.log('Nearby food banks:', nearby);
});
```

## Stripe Webhook Setup

To receive payment notifications, set up a Stripe webhook:

### Local Development (Using Stripe CLI)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/donations/webhook
   ```
4. Copy the webhook signing secret shown and add to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Production

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.vercel.app/api/donations/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the "Signing secret" to your production environment variables

## GitHub Actions Workflow

The repository includes a CI/CD pipeline that runs automatically on:
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`

The workflow checks:
- ✅ Linting (ESLint)
- ✅ Build success
- ✅ API route validation
- ✅ Documentation completeness
- ✅ Security audit

View workflow runs at: https://github.com/JSJames86/seed-and-spoon-backend/actions

## Deployment to Vercel

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com/)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Framework Preset: **Next.js**

### 2. Configure Environment Variables

In Vercel project settings, add all environment variables from `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
GOOGLE_MAPS_API_KEY
ALLOWED_ORIGIN (set to your frontend domain)
```

### 3. Deploy

Click "Deploy" and wait for the build to complete.

### 4. Update Frontend

Update your frontend `.env.production` with the new backend URL:

```bash
NEXT_PUBLIC_BACKEND_URL=https://your-backend.vercel.app
```

### 5. Configure Stripe Webhook

Update your Stripe webhook endpoint to point to your production URL:
```
https://your-backend.vercel.app/api/donations/webhook
```

## CORS Configuration

CORS is configured in `next.config.js` to allow cross-origin requests.

**Development**: Allows all origins (`*`)

**Production**: Set `ALLOWED_ORIGIN` environment variable to your frontend domain:
```bash
ALLOWED_ORIGIN=https://your-frontend-domain.com
```

For multiple domains, modify `next.config.js`:
```javascript
value: process.env.ALLOWED_ORIGIN || 'https://domain1.com,https://domain2.com'
```

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### CORS errors in browser
- Check `ALLOWED_ORIGIN` is set correctly
- Verify frontend is making requests to correct backend URL
- Check browser console for specific CORS error

### Stripe webhook not working
- Verify `STRIPE_WEBHOOK_SECRET` is set
- Check webhook endpoint URL in Stripe Dashboard
- View webhook logs in Stripe Dashboard → Developers → Webhooks

### Supabase connection issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `SUPABASE_SERVICE_ROLE_KEY` has correct permissions
- Ensure database tables are created (see `DATABASE_SCHEMA.md`)

### Build fails in production
- Check all environment variables are set in Vercel
- Review build logs in Vercel dashboard
- Test build locally: `npm run build`

## Next Steps

### Backend Team
- [ ] Deploy to Vercel
- [ ] Configure production environment variables
- [ ] Set up Stripe production webhook
- [ ] Implement authentication for admin routes
- [ ] Monitor error logs and performance
- [ ] Set up database backups

### Frontend Team
- [ ] Create `.env.local` with backend URL
- [ ] Install Stripe.js package
- [ ] Implement donation flow
- [ ] Test API integration locally
- [ ] Implement food bank search/filtering
- [ ] Add Google Maps integration
- [ ] Test production deployment

## API Documentation

For complete API documentation, see:
- **BACKEND_API_REQUIREMENTS.md** - Detailed API endpoint documentation
- **DATABASE_SCHEMA.md** - Database structure and relationships
- **README.md** - Project overview and quick start

## Support

- **GitHub Issues**: https://github.com/JSJames86/seed-and-spoon-backend/issues
- **Stripe Docs**: https://stripe.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

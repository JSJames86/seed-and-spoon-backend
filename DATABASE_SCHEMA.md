# Database Schema

This document outlines the Supabase/PostgreSQL database schema for Seed & Spoon backend.

## Tables

### food_banks

Stores information about food bank locations.

```sql
CREATE TABLE food_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### services

Stores services offered by food banks (e.g., meal service, food pantry, etc.).

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_bank_id UUID REFERENCES food_banks(id) ON DELETE CASCADE,
  service_type VARCHAR(100) NOT NULL,
  description TEXT,
  eligibility TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### operating_hours

Stores operating hours for each food bank.

```sql
CREATE TABLE operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_bank_id UUID REFERENCES food_banks(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Note: day_of_week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday

### donations

Stores donation records from Stripe.

```sql
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  donor_email VARCHAR(255),
  donor_name VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_donations_stripe_id ON donations(stripe_payment_intent_id);
CREATE INDEX idx_donations_created_at ON donations(created_at);
```

### volunteers

Stores volunteer information and applications.

```sql
CREATE TABLE volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  age_range VARCHAR(50),
  food_bank_id UUID REFERENCES food_banks(id) ON DELETE SET NULL,
  availability TEXT,
  interests TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_volunteers_status ON volunteers(status);
CREATE INDEX idx_volunteers_food_bank ON volunteers(food_bank_id);
```

### notes

Stores admin notes for various resources (food banks, volunteers, etc.).

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notes_resource ON notes(resource_type, resource_id);
CREATE INDEX idx_notes_created_at ON notes(created_at);
```

## Row Level Security (RLS)

For public endpoints, you may want to enable RLS and create policies:

```sql
-- Enable RLS
ALTER TABLE food_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_hours ENABLE ROW LEVEL SECURITY;

-- Public read access for active food banks
CREATE POLICY "Public read access for active food banks"
  ON food_banks FOR SELECT
  USING (active = true);

-- Public read access for services
CREATE POLICY "Public read access for services"
  ON services FOR SELECT
  USING (true);

-- Public read access for operating hours
CREATE POLICY "Public read access for operating hours"
  ON operating_hours FOR SELECT
  USING (true);
```

## Setup Instructions

1. Create a new Supabase project
2. Run the SQL commands above in the Supabase SQL Editor
3. Enable Row Level Security policies as needed
4. Copy the project URL and service role key to your `.env` file

## Sample Data

You can insert sample data for testing:

```sql
-- Sample food bank
INSERT INTO food_banks (name, address, city, state, zip_code, phone, active)
VALUES
  ('Community Food Bank', '123 Main St', 'Springfield', 'IL', '62701', '555-0100', true);

-- Sample service (use the UUID from the food_banks insert)
INSERT INTO services (food_bank_id, service_type, description)
VALUES
  ('your-food-bank-uuid', 'Food Pantry', 'Weekly food distribution for families in need');

-- Sample operating hours
INSERT INTO operating_hours (food_bank_id, day_of_week, open_time, close_time)
VALUES
  ('your-food-bank-uuid', 1, '09:00', '17:00'),
  ('your-food-bank-uuid', 3, '09:00', '17:00'),
  ('your-food-bank-uuid', 5, '09:00', '17:00');
```

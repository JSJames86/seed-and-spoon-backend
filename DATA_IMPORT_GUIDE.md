# Seed Data Import Guide

This document explains how to import your food bank data into Supabase.

## Option 1: CSV Import (Recommended)

1. **Export from Google Sheets:**
   - Open your Google Sheet
   - File → Download → Comma Separated Values (.csv)
   - Save as `food_banks_data.csv`

2. **Import to Supabase:**
   - Go to your Supabase project
   - Navigate to Table Editor → food_banks
   - Click "Insert" → "Import data from CSV"
   - Upload your CSV file
   - Map columns to match the database schema

## Option 2: Using the Seed Script

1. **Export your data as JSON:**
   - In Google Sheets, you can use a script or copy data to a JSON converter
   - Save the formatted data in `lib/seed-data.json`

2. **Run the seed script:**
   ```bash
   node scripts/seed-database.js
   ```

## Option 3: Manual Entry via API

Use the API endpoints to add food banks programmatically:

```bash
curl -X POST https://your-domain.vercel.app/api/directory/food-banks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Community Food Bank",
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip_code": "62701",
    "phone": "555-0100",
    "website": "https://example.com",
    "active": true
  }'
```

## Data Format Expected

### Food Banks CSV Format
```csv
name,address,city,state,zip_code,latitude,longitude,phone,email,website,active,notes
Community Food Bank,123 Main St,Springfield,IL,62701,39.7817,-89.6501,555-0100,info@cfb.org,https://cfb.org,true,Serves families
```

### JSON Format
```json
[
  {
    "name": "Community Food Bank",
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip_code": "62701",
    "latitude": 39.7817,
    "longitude": -89.6501,
    "phone": "555-0100",
    "email": "info@cfb.org",
    "website": "https://cfb.org",
    "active": true,
    "notes": "Serves families in need"
  }
]
```

## Column Mapping Guide

Match your Google Sheets columns to these database fields:

| Google Sheet Column | Database Field | Required | Notes |
|---------------------|----------------|----------|-------|
| Name/Organization | name | Yes | Food bank name |
| Address/Street | address | Yes | Street address |
| City | city | No | City name |
| State | state | No | 2-letter state code |
| ZIP/Postal Code | zip_code | No | Zip code |
| Latitude | latitude | No | For mapping |
| Longitude | longitude | No | For mapping |
| Phone/Contact | phone | No | Phone number |
| Email | email | No | Email address |
| Website/URL | website | No | Website URL |
| Status/Active | active | No | true/false |
| Notes/Description | notes | No | Additional info |

## Need Help?

If you share the spreadsheet data with me directly (copy/paste or export as CSV), I can create a properly formatted seed file for you.

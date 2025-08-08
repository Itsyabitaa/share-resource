# Setup Guide

This guide will help you set up the database and resolve the connection error you're experiencing.

## Quick Fix

The error you're seeing is because the `DATABASE_URL` environment variable is not configured. Here's how to fix it:

### Step 1: Create Environment File

Create a `.env.local` file in your project root with the following content:

```bash
# Database Configuration
DATABASE_URL=your_neon_database_url_here

# Cloudinary Configuration (optional for now)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 2: Get a Neon Database URL

1. Go to [Neon Console](https://console.neon.tech/)
2. Sign up or log in
3. Create a new project
4. Copy the connection string from your project dashboard
5. Replace `your_neon_database_url_here` in your `.env.local` file

### Step 3: Setup Database Tables

Run the database setup script:

```bash
npm run setup-db
```

### Step 4: Restart Development Server

```bash
npm run dev
```

## Alternative: Use Supabase

If you prefer to use Supabase instead of Neon:

1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Get your database URL from Settings > Database
4. Update your `.env.local` file:

```bash
DATABASE_URL=your_supabase_database_url
```

## Troubleshooting

### If you still get connection errors:

1. **Check your DATABASE_URL format**: It should look like:
   ```
   postgresql://username:password@hostname:port/database
   ```

2. **Verify network access**: Make sure your database allows connections from your IP

3. **Check database credentials**: Ensure username and password are correct

4. **Test connection**: You can test your connection string using a PostgreSQL client

### For Development Only

If you want to run the app without a database for now, you can modify the API to return mock data:

```typescript
// In pages/api/explore.ts, replace the database calls with:
return res.status(200).json({
  files: [],
  hashtags: []
})
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No |

## Next Steps

Once your database is configured:

1. The explore page should load without errors
2. You can upload and share markdown files
3. Files will be stored in your database and Cloudinary
4. The explore page will show all public documents

Let me know if you need help with any of these steps!

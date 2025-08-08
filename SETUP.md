# Setup Troubleshooting Guide

This guide helps resolve common setup issues and database connection errors.

## Quick Fix for Database Connection Error

If you see `TypeError: fetch failed` or database connection errors:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment
Create `.env.local` with your database URL:
```bash
DATABASE_URL=your_postgresql_connection_string
```

### Step 3: Initialize Database
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
```

### Step 4: Start Development
```bash
npm run dev
```

## Database Connection String Format

Your `DATABASE_URL` should look like:
```
postgresql://username:password@hostname:port/database
```

## Popular Database Providers

### Neon (Recommended for beginners)
1. Go to [console.neon.tech](https://console.neon.tech/)
2. Create account and new project
3. Copy connection string from dashboard

### Supabase
1. Go to [supabase.com](https://supabase.com/)
2. Create new project
3. Get connection string from Settings > Database

### Railway
1. Go to [railway.app](https://railway.app/)
2. Create new PostgreSQL database
3. Copy connection string

## Troubleshooting

### "Prisma client not generated" error
```bash
npm run db:generate
```

### Database connection fails
1. Check your `DATABASE_URL` format
2. Verify database is running and accessible
3. Test connection: `npm run setup-db`

### Reset database schema
```bash
npm run db:push --force-reset
```

### View database in GUI
```bash
npm run db:studio
```

### Development without database
Temporarily modify `pages/api/explore.ts`:
```typescript
return res.status(200).json({
  files: [],
  hashtags: []
})
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No |

## Common Issues

### Error: "fetch failed"
- Database URL not configured
- Database not accessible
- Network connectivity issues

### Error: "Prisma client not generated"
- Run `npm run db:generate`
- Check if `@prisma/client` is installed

### Error: "Database schema not found"
- Run `npm run db:push`
- Check database connection

### Error: "Environment variables not found"
- Create `.env.local` file
- Restart development server

## Still Having Issues?

1. Check the [README.md](README.md) for complete setup instructions
2. Verify your database provider's documentation
3. Test your connection string with a PostgreSQL client
4. Check network access and firewall settings

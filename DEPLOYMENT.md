# Deployment Guide

This guide covers deploying MDNest to Vercel with automated CI/CD.

## Prerequisites

- GitHub repository with your code
- Vercel account ([vercel.com](https://vercel.com))
- PostgreSQL database (Neon, Supabase, etc.)
- Cloudinary account (optional)

## Quick Deployment

### Option 1: Vercel Dashboard (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js settings

2. **Environment Variables**
   Add these in Vercel dashboard:
   ```
   DATABASE_URL=your_postgresql_connection_string
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

3. **Deploy**
   - Automatic deployments on push to main
   - Preview deployments for pull requests

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## GitHub Actions CI/CD

For automated deployments with GitHub Actions:

### Step 1: Get Vercel Tokens

```bash
npm i -g vercel
vercel login
vercel whoami  # Get your username and token
vercel ls      # List projects
vercel inspect PROJECT_NAME  # Get project details
```

### Step 2: Setup GitHub Secrets

In your GitHub repository → Settings → Secrets and variables → Actions:

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | Your Vercel token |
| `VERCEL_ORG_ID` | Your Vercel organization ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID |
| `DATABASE_URL` | Your PostgreSQL connection string |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

### Step 3: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma client
        run: npm run db:generate
      
      - name: Build project
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string

### Optional
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

## Database Setup

After deployment, you need to set up your database:

1. **Generate Prisma client** (done in build)
2. **Push schema to database**:
   ```bash
   # Locally or via Vercel CLI
   npm run db:push
   ```

## Troubleshooting

### Build fails with Prisma error
- Ensure `DATABASE_URL` is set in Vercel
- Check database connection string format
- Verify database is accessible from Vercel's servers

### Database connection fails in production
- Check if database allows external connections
- Verify connection string includes SSL settings
- Test connection locally first

### Environment variables not found
- Double-check variable names in Vercel dashboard
- Ensure no extra spaces or quotes
- Redeploy after adding variables

## Performance Optimization

### Database
- Use connection pooling in production
- Add database indexes for better performance
- Consider read replicas for high traffic

### Vercel
- Enable edge functions for API routes
- Use Vercel's image optimization
- Configure caching headers

## Monitoring

- **Vercel Analytics**: Built-in performance monitoring
- **Database Monitoring**: Use your provider's dashboard
- **Error Tracking**: Consider Sentry integration

## Rollback

To rollback to a previous deployment:
1. Go to Vercel dashboard
2. Select your project
3. Go to Deployments tab
4. Click "Redeploy" on previous deployment

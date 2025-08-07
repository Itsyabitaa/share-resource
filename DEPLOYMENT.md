# Deployment Guide - Vercel CI/CD

This guide will walk you through setting up automated deployment to Vercel using GitHub Actions.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Neon Database**: Set up your Neon PostgreSQL database
4. **Cloudinary Account**: Set up your Cloudinary account

## Step 1: Connect Repository to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Add environment variables:
   ```
   DATABASE_URL=your_neon_database_url
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```
6. Deploy

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Step 2: Get Vercel Tokens

You'll need these for GitHub Actions:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login
vercel login

# Get your tokens
vercel whoami
```

This will show:
- Your Vercel username
- Your Vercel token (save this)

## Step 3: Get Project Information

```bash
# List your projects
vercel ls

# Get project details (replace PROJECT_NAME)
vercel inspect PROJECT_NAME
```

Note down:
- Project ID
- Org ID

## Step 4: Setup GitHub Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | Your Vercel token |
| `VERCEL_ORG_ID` | Your Vercel organization ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID |
| `DATABASE_URL` | Your Neon database URL |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

## Step 5: Test Deployment

1. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Initial deployment setup"
   git push origin main
   ```

2. **Check GitHub Actions**:
   - Go to your repository → Actions tab
   - You should see the deployment workflow running

3. **Check Vercel**:
   - Go to your Vercel dashboard
   - You should see the deployment in progress

## Step 6: Verify Deployment

1. **Check your live URL** (provided by Vercel)
2. **Test the application**:
   - Create a markdown document
   - Upload a file
   - Share the link
   - Test dark/light mode

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check GitHub Actions logs
   - Ensure all environment variables are set
   - Verify database connection

2. **Environment Variables**:
   - Double-check all secrets in GitHub
   - Ensure Vercel has the same environment variables

3. **Database Connection**:
   - Verify Neon database is accessible
   - Check DATABASE_URL format

4. **Cloudinary Issues**:
   - Verify Cloudinary credentials
   - Check upload permissions

### Debug Commands

```bash
# Check Vercel status
vercel ls

# View deployment logs
vercel logs

# Redeploy
vercel --prod --force
```

## Advanced Configuration

### Custom Domain

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### Environment-Specific Variables

You can set different variables for:
- Production
- Preview (staging)
- Development

In Vercel dashboard → Settings → Environment Variables

### Performance Optimization

1. **Enable Edge Functions** (if needed)
2. **Configure CDN settings**
3. **Optimize images** (already configured for Cloudinary)

## Monitoring

### Vercel Analytics

1. Enable Vercel Analytics in dashboard
2. Monitor performance metrics
3. Track user behavior

### Error Tracking

Consider adding error tracking:
- Sentry
- LogRocket
- Bugsnag

## Security

### Environment Variables

- Never commit secrets to Git
- Use GitHub Secrets for sensitive data
- Rotate keys regularly

### Database Security

- Use connection pooling
- Enable SSL for database connections
- Regular backups

## Cost Optimization

### Vercel Pricing

- **Hobby**: Free tier (good for personal projects)
- **Pro**: $20/month (for teams)
- **Enterprise**: Custom pricing

### Database Costs

- **Neon**: Free tier includes 3GB storage
- **Cloudinary**: Free tier includes 25GB storage

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **GitHub Actions**: [docs.github.com/en/actions](https://docs.github.com/en/actions)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)

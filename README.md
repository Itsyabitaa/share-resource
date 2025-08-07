# Markdown Share App

A modern markdown sharing application built with Next.js, featuring dark/light mode, file uploads, and hybrid storage architecture.

## Features

- ✨ **Markdown Editor**: Rich text editor with live preview
- 🌙 **Dark/Light Mode**: Theme switching with persistence
- 📁 **File Upload**: Support for TXT, DOC, DOCX, MD files
- 🔗 **Shareable Links**: Copy and share markdown documents
- 👤 **Author Attribution**: Optional author acknowledgment
- 🏷️ **Hashtags**: Tag and categorize documents
- 🔍 **Explore**: Discover public documents
- ☁️ **Hybrid Storage**: Neon PostgreSQL + Cloudinary

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Database**: Neon PostgreSQL
- **Storage**: Cloudinary
- **Styling**: CSS-in-JS with theme system
- **Deployment**: Vercel

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Neon PostgreSQL database
- Cloudinary account

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd mdshare-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create `.env.local` file:
   ```env
   DATABASE_URL=your_neon_database_url
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Setup Database**
   ```bash
   npm run setup-db
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

## Deployment

### Vercel Deployment

#### Option 1: Automatic Deployment (Recommended)

1. **Connect to Vercel**
   - Push your code to GitHub
   - Connect your repository to Vercel
   - Vercel will automatically detect Next.js and deploy

2. **Environment Variables**
   Add these in Vercel dashboard:
   - `DATABASE_URL`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

3. **Deploy**
   - Every push to `main` branch triggers automatic deployment
   - Preview deployments for pull requests

#### Option 2: Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### GitHub Actions CI/CD

The repository includes GitHub Actions workflow for automated deployment:

1. **Setup Secrets** in GitHub repository:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `DATABASE_URL`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

2. **Get Vercel Tokens**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Get tokens
   vercel whoami
   ```

3. **Automatic Deployment**:
   - Push to `main` branch triggers deployment
   - Pull requests create preview deployments

## Database Schema

```sql
CREATE TABLE files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  cloudinary_url TEXT NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  file_size INTEGER,
  is_public BOOLEAN DEFAULT false,
  hashtags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run setup-db` - Initialize database tables
- `npm run rebuild-db` - Rebuild database schema
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
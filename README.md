# md-Nest 📝

A modern, full-featured markdown sharing platform with tiered storage, authentication, and real-time collaboration. Built with Next.js, TypeScript, and PostgreSQL.

## ✨ Features

### Core Features
- 📝 **Rich Markdown Editor**: Live preview with SimpleMDE editor
- 📁 **File Upload Support**: TXT, DOC, DOCX, MD files with automatic conversion
- 🎨 **Dual Themes**: Beautiful dark/light mode with smooth transitions
- 🔗 **Shareable Links**: Generate unique URLs for your documents
- 👤 **Author Attribution**: Optional author acknowledgment with auto-fill from profile
- 🏷️ **Hashtags & Discovery**: Tag documents and explore public content
- 🔍 **Search & Filter**: Find documents by hashtags and content

### Authentication & User Management
- 🔐 **Better Auth Integration**: Secure email/password authentication
- 👤 **User Profiles**: Customizable display names
- ⚙️ **Settings Dashboard**: Manage profile and storage preferences
- 🔒 **Session Management**: Secure, persistent sessions

### Tiered Storage System
- 🎁 **Guest Mode**: 
  - Temporary storage for 3 days
  - No account required
  - Automatic cleanup of expired files
  
- 👥 **Registered Users**:
  - **Default Storage**: Permanent storage using shared infrastructure
  - **Custom Storage**: Use your own Neon database and Cloudinary credentials
  - Encrypted credential storage with AES-256-GCM
  - Validation of custom credentials before saving

### Storage & Infrastructure
- ☁️ **Cloudinary Integration**: Reliable file storage and delivery
- 🗄️ **Neon PostgreSQL**: Serverless, scalable database
- 🔄 **Automatic Cleanup**: Scheduled job to remove expired guest files
- 🔐 **Encrypted Credentials**: Secure storage of user-provided API keys

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React with CSS-in-JS
- **Editor**: SimpleMDE (EasyMDE)
- **Markdown**: Marked.js for parsing

### Backend
- **Database**: Neon PostgreSQL (Serverless)
- **ORM**: Kysely for type-safe queries
- **Authentication**: Better Auth
- **File Storage**: Cloudinary
- **Encryption**: Node.js Crypto (AES-256-GCM)

### Deployment
- **Platform**: Vercel
- **CI/CD**: GitHub Actions (optional)
- **Cron Jobs**: Vercel Cron for cleanup tasks

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Neon PostgreSQL database account
- Cloudinary account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd share-resource
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```

   Fill in your `.env.local` with the following variables:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host/database

   # Cloudinary (Default/Shared)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Better Auth
   BETTER_AUTH_SECRET=your_random_secret_key_here
   BETTER_AUTH_URL=http://localhost:3000

   # Encryption (REQUIRED for tiered storage)
   ENCRYPTION_KEY=your_64_character_hex_string_here

   # Cleanup Cron (Optional)
   CLEANUP_CRON_SECRET=your_cleanup_secret
   ```

4. **Generate Encryption Key**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output to `ENCRYPTION_KEY` in `.env.local`

5. **Initialize Database**
   ```bash
   npm run migrate-fresh
   ```
   This will create all necessary tables including:
   - `user` - User accounts
   - `session` - Authentication sessions
   - `account` - OAuth accounts
   - `verification` - Email verification tokens
   - `files` - Document metadata with tiered storage fields
   - `user_credentials` - Encrypted custom storage credentials

6. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### Files Table
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
  user_id UUID,                              -- Links to user table
  expires_at TIMESTAMP WITH TIME ZONE,       -- For guest uploads
  storage_tier VARCHAR(20) DEFAULT 'guest',  -- 'guest' or 'registered'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### User Credentials Table
```sql
CREATE TABLE user_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  neon_database_url TEXT,                    -- Encrypted
  cloudinary_cloud_name TEXT,                -- Encrypted
  cloudinary_api_key TEXT,                   -- Encrypted
  cloudinary_api_secret TEXT,                -- Encrypted
  use_custom_credentials BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Configuration

### Tiered Storage Setup

#### For Guest Users
No configuration needed. Files are automatically:
- Stored for 3 days
- Cleaned up by the scheduled cron job
- Uploaded to the default Cloudinary account

#### For Registered Users

**Option 1: Use Default Storage (Recommended)**
- No additional setup required
- Files stored permanently
- Uses shared infrastructure

**Option 2: Use Custom Storage**
1. Navigate to Settings page
2. Check "Use my own storage credentials"
3. Enter your Neon database URL (optional)
4. Enter your Cloudinary credentials:
   - Cloud Name
   - API Key
   - API Secret
5. Click "Validate Cloudinary Credentials"
6. Click "Save Settings"

Your credentials are encrypted with AES-256-GCM before storage.

### Cleanup Cron Job

To enable automatic cleanup of expired guest files:

1. **Create `vercel.json`** in project root:
   ```json
   {
     "crons": [{
       "path": "/api/cleanup",
       "schedule": "0 0 * * *"
     }]
   }
   ```

2. **Add to Vercel Environment Variables**:
   ```
   CLEANUP_CRON_SECRET=your_secret_here
   ```

3. **Deploy to Vercel**

The cleanup job runs daily at midnight UTC.

## 📜 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run migrate-fresh    # Drop and recreate all tables (DESTRUCTIVE)

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🌍 Deployment

### Vercel Deployment (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel auto-detects Next.js

3. **Add Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables:
   - `DATABASE_URL`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL` (your production URL)
   - `ENCRYPTION_KEY`
   - `CLEANUP_CRON_SECRET`

4. **Deploy**
   - Click "Deploy"
   - Vercel builds and deploys automatically

5. **Setup Cron Job**
   - Create `vercel.json` (see Configuration section)
   - Redeploy

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## 🔐 Security Features

- **Encrypted Credentials**: User-provided API keys encrypted with AES-256-GCM
- **Secure Sessions**: HTTP-only cookies with Better Auth
- **Environment Variables**: Sensitive data never committed to repo
- **Input Validation**: Server-side validation for all user inputs
- **SQL Injection Protection**: Parameterized queries with Kysely
- **XSS Protection**: React's built-in escaping

## 🎯 Usage Guide

### Creating a Document

1. **Choose Mode**:
   - **Text Editor**: Write markdown directly
   - **Upload File**: Convert existing documents

2. **Add Details**:
   - Title (required)
   - Author (optional, auto-fills from profile)
   - Public/Private toggle
   - Hashtags (for public documents)

3. **Share**:
   - Click "Share" button
   - Copy the generated link
   - Share with anyone!

### Managing Storage (Registered Users)

1. **View Settings**:
   - Click Profile → Settings
   - See current storage configuration

2. **Update Profile**:
   - Set your display name
   - Auto-fills in author fields

3. **Configure Custom Storage**:
   - Toggle custom credentials
   - Enter your Neon/Cloudinary details
   - Validate before saving
   - Delete anytime to revert to default

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test your DATABASE_URL
node -e "const { Pool } = require('pg'); new Pool({ connectionString: process.env.DATABASE_URL }).query('SELECT NOW()').then(r => console.log('Connected:', r.rows[0]))"
```

### Migration Errors
```bash
# If migration fails, check:
1. DATABASE_URL is correct
2. Database is accessible
3. User has CREATE TABLE permissions

# Reset database (WARNING: Deletes all data)
npm run migrate-fresh
```

### Cloudinary Upload Failures
- Verify `CLOUDINARY_CLOUD_NAME`, `API_KEY`, `API_SECRET`
- Check Cloudinary dashboard for quota limits
- Ensure file size is within limits

### Encryption Key Issues
- Must be exactly 64 hexadecimal characters
- Generate new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Same key must be used across all environments

## 📝 Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes | `postgresql://user:pass@host/db` |
| `CLOUDINARY_CLOUD_NAME` | Default Cloudinary cloud name | Yes | `my-cloud` |
| `CLOUDINARY_API_KEY` | Default Cloudinary API key | Yes | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Default Cloudinary API secret | Yes | `abcdef123456` |
| `BETTER_AUTH_SECRET` | Secret for session encryption | Yes | Random 32+ chars |
| `BETTER_AUTH_URL` | Application URL | Yes | `http://localhost:3000` |
| `ENCRYPTION_KEY` | 64-char hex for credential encryption | Yes | `a1b2c3...` (64 chars) |
| `CLEANUP_CRON_SECRET` | Secret for cleanup endpoint | Optional | Random string |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Better Auth](https://www.better-auth.com/) - Authentication
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Cloudinary](https://cloudinary.com/) - Media management
- [SimpleMDE](https://simplemde.com/) - Markdown editor
- [Vercel](https://vercel.com/) - Deployment platform

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and TypeScript
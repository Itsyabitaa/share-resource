# MDNest

A modern markdown sharing application built with Next.js, featuring dark/light mode, file uploads, and Prisma ORM.

## Features

- ✨ **Markdown Editor**: Rich text editor with live preview
- 🌙 **Dark/Light Mode**: Theme switching with persistence
- 📁 **File Upload**: Support for TXT, DOC, DOCX, MD files
- 🔗 **Shareable Links**: Copy and share markdown documents
- 👤 **Author Attribution**: Optional author acknowledgment
- 🏷️ **Hashtags**: Tag and categorize documents
- 🔍 **Explore**: Discover public documents
- ☁️ **Hybrid Storage**: PostgreSQL + Cloudinary
- 🛡️ **Type Safety**: Full TypeScript + Prisma ORM

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: Cloudinary
- **Styling**: CSS-in-JS with theme system
- **Deployment**: Vercel

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon, Supabase, Railway, etc.)
- Cloudinary account (optional)

### Setup

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd md-nest
   npm install
   ```

2. **Environment Variables**
   Create `.env.local`:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

3. **Database Setup**
   ```bash
   npm run db:generate  # Generate Prisma client
   npm run db:push      # Push schema to database
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## Database Providers

You can use any PostgreSQL provider:

- **Neon**: [console.neon.tech](https://console.neon.tech/)
- **Supabase**: [supabase.com](https://supabase.com/)
- **Railway**: [railway.app](https://railway.app/)
- **PlanetScale**: [planetscale.com](https://planetscale.com/)
- **AWS RDS**: [aws.amazon.com/rds](https://aws.amazon.com/rds/)

## Prisma Commands

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create and apply migrations |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

## Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
   - Push code to GitHub
   - Connect repository to Vercel
   - Add environment variables in Vercel dashboard

2. **Environment Variables**
   ```
   DATABASE_URL=your_postgresql_connection_string
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

3. **Deploy**
   - Automatic deployments on push to main
   - Preview deployments for pull requests

### Manual Deployment

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Project Structure

```
├── components/          # React components
├── lib/                # Utilities and configurations
│   ├── prisma.ts       # Prisma client
│   ├── dbSchema.ts     # Database operations
│   └── cloudinary.ts   # Cloudinary config
├── pages/              # Next.js pages and API routes
├── prisma/             # Database schema
│   └── schema.prisma   # Prisma schema definition
└── scripts/            # Database setup scripts
```

## Database Schema

The main `File` model includes:

```prisma
model File {
  id            String   @id @default(cuid())
  title         String   @db.VarChar(255)
  author        String?
  cloudinaryUrl String   @map("cloudinary_url")
  fileType      String   @map("file_type")
  fileSize      Int?     @map("file_size")
  isPublic      Boolean  @default(false) @map("is_public")
  hashtags      String[]
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run type-check`
5. Submit a pull request

## License

MIT License - see LICENSE file for details
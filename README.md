# MDShare App - Hybrid Storage System

A modern markdown sharing application with hybrid storage using **Neon PostgreSQL** and **Cloudinary**.

## 🏗️ Architecture

### **Hybrid Storage System**
- **Neon PostgreSQL**: Stores file metadata (title, URLs, timestamps)
- **Cloudinary**: Stores actual file content (.md, .txt, .doc, .docx)
- **Benefits**: 10GB free storage, better performance, scalable

## 🚀 Features

- ✨ **Dark/Light Mode** with theme persistence
- 📝 **Markdown Editor** with live preview
- 📁 **File Upload** (TXT, DOC, DOCX, MD)
- 🔗 **Shareable URLs** for documents
- 🎨 **Beautiful UI** with responsive design
- ⚡ **Fast Performance** with hybrid storage

## 🛠️ Setup

### 1. **Environment Variables**
Create a `.env.local` file:

```bash
# Neon PostgreSQL Database
DATABASE_URL=postgresql://username:password@host:port/database

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. **Database Setup**
```bash
npm run setup-db
```

### 3. **Install Dependencies**
```bash
npm install
```

### 4. **Run Development Server**
```bash
npm run dev
```

## 📊 Database Schema

```sql
CREATE TABLE files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  cloudinary_url TEXT NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔄 Data Flow

1. **Upload**: File → Cloudinary → Store URL in Neon DB
2. **View**: Fetch URL from Neon → Get content from Cloudinary
3. **Share**: Generate link with Neon DB ID

## 🎯 Benefits

- **10GB Free Storage** (vs 0.5GB on Supabase)
- **Better Performance** (separated storage)
- **Scalable Architecture** (hybrid approach)
- **Cost Effective** (stays in free tiers)
- **Easy Migration** (separated concerns)
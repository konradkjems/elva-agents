> ⚠️ **Historical / pre-migration document.** As of June 2026 the platform runs on **Supabase** (Postgres + Auth + Storage); MongoDB, NextAuth, and Cloudinary have been removed, along with their setup scripts and npm commands. Steps, env vars, and commands below that reference those services are outdated — see `WARP.md` / `CLAUDE.md` for the current setup.

# 🚀 Elva Widget Platform - Deployment Guide

## 📋 Pre-Deployment Checklist

- [ ] Environment variables configured in .env.local
- [ ] OpenAI API key with Responses API access
- [ ] MongoDB Atlas cluster set up
- [ ] Domain configured for production
- [ ] Widget IDs created in admin panel

## 🌐 Deployment Options

### 1. Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 2. Netlify
```bash
# Build the project
npm run build

# Deploy the 'out' folder to Netlify
```

### 3. Railway
```bash
# Connect your GitHub repo to Railway
# Railway will automatically detect Next.js and deploy
```

### 4. DigitalOcean App Platform
```bash
# Create app.yaml configuration
# Connect your GitHub repo
# Deploy through DigitalOcean dashboard
```

## 🔧 Production Configuration

### Environment Variables
Set these in your hosting platform:

```env
OPENAI_API_KEY=sk-your-production-key
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_API_URL=https://your-domain.com
```

### Domain Configuration
Update NEXT_PUBLIC_API_URL to your production domain:
```env
NEXT_PUBLIC_API_URL=https://widgets.elva-solutions.com
```

## 📱 Widget Integration

### For Customers
Customers can integrate widgets by adding this script tag:

```html
<script src="http://localhost:3000/api/widget-responses/YOUR_WIDGET_ID"></script>
```

### Widget Types
1. **Responses API Widgets** (Recommended): `/api/widget-responses/WIDGET_ID`
2. **Legacy Widgets**: `/api/widget/WIDGET_ID`

## 🎯 Post-Deployment Steps

1. **Test Widget Integration**:
   - Create a test widget in admin panel
   - Test on a sample website
   - Verify CORS settings

2. **Configure Analytics**:
   - Set up monitoring
   - Configure error tracking
   - Monitor API usage

3. **Customer Onboarding**:
   - Provide integration instructions
   - Share widget embed codes
   - Set up support channels

## 🔍 Troubleshooting

### Common Issues
- **CORS Errors**: Ensure domain is whitelisted
- **MongoDB Connection**: Check connection string
- **OpenAI API**: Verify API key and quota
- **Widget Not Loading**: Check widget ID and URL

### Support
For technical support, contact: support@elva-solutions.com

---
Generated on: 2025-09-05T21:07:50.955Z
Platform URL: http://localhost:3000

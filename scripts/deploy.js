#!/usr/bin/env node

/**
 * Elva Widget Platform Deployment Script
 * 
 * This script handles the complete deployment process for the Elva widget platform.
 * It builds the application, sets up the database, and prepares for production.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description, allowFailure = false) {
  log(`\n${colors.cyan}🔄 ${description}...${colors.reset}`);
  try {
    execSync(command, { stdio: 'inherit' });
    log(`${colors.green}✅ ${description} completed successfully${colors.reset}`);
  } catch (error) {
    if (allowFailure) {
      log(`${colors.yellow}⚠️  ${description} failed but continuing: ${error.message}${colors.reset}`);
    } else {
      log(`${colors.red}❌ ${description} failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

function checkEnvironment() {
  log(`${colors.bright}🔍 Checking environment...${colors.reset}`);
  
  // Check if .env.local exists
  if (!fs.existsSync('.env.local')) {
    log(`${colors.red}❌ .env.local file not found!${colors.reset}`);
    log(`${colors.yellow}Please copy .env.example to .env.local and configure your environment variables.${colors.reset}`);
    process.exit(1);
  }
  
  // Check if required environment variables are set
  require('dotenv').config({ path: '.env.local' });
  
  const requiredVars = ['OPENAI_API_KEY', 'MONGODB_URI'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`${colors.red}❌ Missing required environment variables: ${missingVars.join(', ')}${colors.reset}`);
    log(`${colors.yellow}Please configure these variables in .env.local${colors.reset}`);
    process.exit(1);
  }
  
  log(`${colors.green}✅ Environment check passed${colors.reset}`);
}

function generateWidgetEmbedCode() {
  log(`${colors.cyan}📝 Generating widget embed code...${colors.reset}`);
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  const embedCode = `<!-- Elva AI Chat Widget -->
<!-- Add this script tag before the closing </body> tag -->
<script src="${baseUrl}/api/widget-embed/YOUR_WIDGET_ID"></script>

<!-- 
Instructions:
1. Replace YOUR_WIDGET_ID with your actual widget ID
2. The widget-embed API automatically detects the correct widget type
3. Make sure your domain is whitelisted in your OpenAI API settings
4. Get your widget ID from the admin panel at ${baseUrl}/admin
-->`;
  
  fs.writeFileSync('WIDGET_EMBED_CODE.html', embedCode);
  log(`${colors.green}✅ Widget embed code saved to WIDGET_EMBED_CODE.html${colors.reset}`);
}

function generateDeploymentGuide() {
  log(`${colors.cyan}📚 Generating deployment guide...${colors.reset}`);
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  const guide = `# 🚀 Elva Widget Platform - Deployment Guide

## 📋 Pre-Deployment Checklist

- [ ] Environment variables configured in .env.local
- [ ] OpenAI API key with Responses API access
- [ ] MongoDB Atlas cluster set up
- [ ] Domain configured for production
- [ ] Widget IDs created in admin panel

## 🌐 Deployment Options

### 1. Vercel (Recommended)
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
\`\`\`

### 2. Netlify
\`\`\`bash
# Build the project
npm run build

# Deploy the 'out' folder to Netlify
\`\`\`

### 3. Railway
\`\`\`bash
# Connect your GitHub repo to Railway
# Railway will automatically detect Next.js and deploy
\`\`\`

### 4. DigitalOcean App Platform
\`\`\`bash
# Create app.yaml configuration
# Connect your GitHub repo
# Deploy through DigitalOcean dashboard
\`\`\`

## 🔧 Production Configuration

### Environment Variables
Set these in your hosting platform:

\`\`\`env
OPENAI_API_KEY=sk-your-production-key
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/elva-agents
NEXT_PUBLIC_API_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
\`\`\`

### Domain Configuration
Update NEXT_PUBLIC_API_URL to your production domain:
\`\`\`env
NEXT_PUBLIC_API_URL=https://widgets.elva-solutions.com
\`\`\`

## 📱 Widget Integration

### For Customers
Customers can integrate widgets by adding this script tag:

\`\`\`html
<script src="${baseUrl}/api/widget-responses/YOUR_WIDGET_ID"></script>
\`\`\`

### Widget Types
1. **Responses API Widgets** (Recommended): \`/api/widget-responses/WIDGET_ID\`
2. **Legacy Widgets**: \`/api/widget/WIDGET_ID\`

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
Generated on: ${new Date().toISOString()}
Platform URL: ${baseUrl}
`;
  
  fs.writeFileSync('DEPLOYMENT_GUIDE.md', guide);
  log(`${colors.green}✅ Deployment guide saved to DEPLOYMENT_GUIDE.md${colors.reset}`);
}

function main() {
  log(`${colors.bright}🚀 Elva Widget Platform Deployment Script${colors.reset}`);
  log(`${colors.blue}==============================================${colors.reset}`);
  
  try {
    // Step 1: Check environment
    checkEnvironment();
    
    // Step 2: Install dependencies
    execCommand('npm install', 'Installing dependencies');
    
    // Step 3: Initialize database (skip if MongoDB connection fails)
    execCommand('npm run init-db-responses', 'Initializing database with Responses API data', true);
    
    // Step 4: Build the application
    execCommand('npm run build', 'Building application for production');
    
    // Step 5: Generate embed code
    generateWidgetEmbedCode();
    
    // Step 6: Generate deployment guide
    generateDeploymentGuide();
    
    log(`\n${colors.bright}${colors.green}🎉 Deployment preparation completed successfully!${colors.reset}`);
    log(`\n${colors.cyan}Next steps:${colors.reset}`);
    log(`1. Review DEPLOYMENT_GUIDE.md for deployment instructions`);
    log(`2. Use WIDGET_EMBED_CODE.html for customer integration`);
    log(`3. Deploy to your chosen hosting platform`);
    log(`4. Test widget integration on a sample website`);
    
    log(`\n${colors.yellow}💡 Pro tip: Test locally first with 'npm run dev'${colors.reset}`);
    
  } catch (error) {
    log(`${colors.red}❌ Deployment failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the deployment script
if (require.main === module) {
  main();
}

module.exports = { main };

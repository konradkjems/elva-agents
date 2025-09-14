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

function log(message) {
  console.log(message);
}

function execCommand(command, description, allowFailure = false) {
  log(`${colors.cyan}🔄 ${description}...${colors.reset}`);
  try {
    // Set NODE_ENV to production for build
    const env = { ...process.env, NODE_ENV: 'production' };
    execSync(command, { stdio: 'inherit', env });
    log(`${colors.green}✅ ${description} completed${colors.reset}`);
  } catch (error) {
    if (allowFailure) {
      log(`${colors.yellow}⚠️  ${description} failed (continuing...)${colors.reset}`);
    } else {
      log(`${colors.red}❌ ${description} failed${colors.reset}`);
      process.exit(1);
    }
  }
}

function checkEnvironment() {
  log(`${colors.bright}🔍 Checking production environment...${colors.reset}`);
  
  // Check if .env.local exists
  if (!fs.existsSync('.env.local')) {
    log(`${colors.red}❌ .env.local file not found!${colors.reset}`);
    log(`${colors.yellow}Please copy .env.example to .env.local and configure your environment variables.${colors.reset}`);
    process.exit(1);
  }
  
  // Check if required environment variables are set
  require('dotenv').config({ path: '.env.local' });
  
  const requiredVars = [
    'OPENAI_API_KEY', 
    'MONGODB_URI', 
    'NEXTAUTH_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`${colors.red}❌ Missing required environment variables: ${missingVars.join(', ')}${colors.reset}`);
    log(`${colors.yellow}Please configure these variables in .env.local${colors.reset}`);
    process.exit(1);
  }
  
  log(`${colors.green}✅ Environment check passed${colors.reset}`);
}

function checkVercelCLI() {
  log(`${colors.cyan}🔍 Checking Vercel CLI...${colors.reset}`);
  
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    log(`${colors.green}✅ Vercel CLI is installed${colors.reset}`);
  } catch (error) {
    log(`${colors.red}❌ Vercel CLI not found${colors.reset}`);
    log(`${colors.yellow}Please install Vercel CLI: npm i -g vercel${colors.reset}`);
    process.exit(1);
  }
}

function generateProductionConfig() {
  log(`${colors.cyan}📝 Generating production configuration...${colors.reset}`);
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.vercel.app';
  
  const productionEnv = `# Production Environment Variables for Vercel
# Copy these to your Vercel project settings

# Authentication
NEXTAUTH_SECRET=${process.env.NEXTAUTH_SECRET}
NEXTAUTH_URL=${baseUrl}

# Database
MONGODB_URI=${process.env.MONGODB_URI}

# OpenAI
OPENAI_API_KEY=${process.env.OPENAI_API_KEY}

# Cloudinary
CLOUDINARY_CLOUD_NAME=${process.env.CLOUDINARY_CLOUD_NAME}
CLOUDINARY_API_KEY=${process.env.CLOUDINARY_API_KEY}
CLOUDINARY_API_SECRET=${process.env.CLOUDINARY_API_SECRET}

# Public URL
NEXT_PUBLIC_API_URL=${baseUrl}

# Environment
NODE_ENV=production
`;

  fs.writeFileSync('vercel-env-vars.txt', productionEnv);
  log(`${colors.green}✅ Production environment variables saved to vercel-env-vars.txt${colors.reset}`);
}

function createDeploymentInstructions() {
  log(`${colors.cyan}📚 Creating deployment instructions...${colors.reset}`);
  
  const instructions = `# 🚀 Production Deployment Instructions

## Environment Variables
Copy the contents of \`vercel-env-vars.txt\` to your Vercel project settings:
1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable from the file above

## Deployment Commands
\`\`\`bash
# Deploy to production
vercel --prod

# Or if you haven't linked the project yet:
vercel
\`\`\`

## Post-Deployment Steps
1. Test admin login: https://your-domain.vercel.app/admin/login
2. Create admin user: npm run create-admin
3. Test widget creation and embedding
4. Verify file uploads work

## Default Admin Credentials
- Email: admin@elva-solutions.com
- Password: admin123
- ⚠️ Change password after first login!

## Support
If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables are set
3. Test database connection
4. Check MongoDB Atlas network access

Generated on: ${new Date().toISOString()}
`;

  fs.writeFileSync('DEPLOYMENT_INSTRUCTIONS.md', instructions);
  log(`${colors.green}✅ Deployment instructions saved to DEPLOYMENT_INSTRUCTIONS.md${colors.reset}`);
}

async function main() {
  log(`${colors.bright}🚀 Elva Widget Platform - Production Deployment${colors.reset}`);
  log(`${colors.bright}================================================${colors.reset}\n`);

  try {
    // Pre-deployment checks
    checkEnvironment();
    checkVercelCLI();
    
    // Generate configuration
    generateProductionConfig();
    createDeploymentInstructions();
    
    // Build the project
    execCommand('npm run build', 'Building project for production');
    
    log(`\n${colors.green}🎉 Production deployment preparation completed!${colors.reset}`);
    log(`\n${colors.cyan}Next steps:${colors.reset}`);
    log(`1. Copy environment variables from vercel-env-vars.txt to Vercel dashboard`);
    log(`2. Run: vercel --prod`);
    log(`3. Test your deployment`);
    log(`4. Create admin user: npm run create-admin`);
    
  } catch (error) {
    log(`${colors.red}❌ Deployment preparation failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();

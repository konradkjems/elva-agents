#!/usr/bin/env node

/**
 * Script to fix demo URLs that are pointing to localhost
 * Run this script after deploying to production to update all existing demo URLs
 */

const { MongoClient } = require('mongodb');

// Get MongoDB URI from environment
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is not set');
  console.error('Please set it in your .env file or environment variables');
  process.exit(1);
}

async function fixDemoUrls() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('chatwidgets');

    // Get production URL from environment or prompt user
    let productionUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    
    if (!productionUrl || productionUrl.includes('localhost')) {
      console.log('\n⚠️  No production URL found in environment variables');
      console.log('Please provide your production URL (e.g., https://elva-solutions.com)');
      
      // In a real scenario, you'd use readline to prompt for input
      // For now, we'll exit with instructions
      console.error('\n❌ Please run this script with NEXT_PUBLIC_APP_URL set:');
      console.error('   NEXT_PUBLIC_APP_URL=https://your-domain.com node scripts/fix-demo-urls.js');
      process.exit(1);
    }

    console.log(`\n🔧 Using production URL: ${productionUrl}`);

    // Find and update demo widgets
    const demoWidgets = await db.collection('widgets').find({ 
      isDemoMode: true,
      'demoSettings.demoUrl': { $regex: /localhost/ }
    }).toArray();

    console.log(`\nFound ${demoWidgets.length} demo widgets with localhost URLs`);

    for (const widget of demoWidgets) {
      const newUrl = `${productionUrl}/demo/${widget._id}`;
      console.log(`  Updating ${widget._id}: ${widget.demoSettings.demoUrl} → ${newUrl}`);
      
      await db.collection('widgets').updateOne(
        { _id: widget._id },
        { 
          $set: { 
            'demoSettings.demoUrl': newUrl,
            updatedAt: new Date()
          }
        }
      );
    }

    // Find and update demos
    const demos = await db.collection('demos').find({ 
      'demoSettings.demoUrl': { $regex: /localhost/ }
    }).toArray();

    console.log(`\nFound ${demos.length} demos with localhost URLs`);

    for (const demo of demos) {
      const newUrl = `${productionUrl}/demo/${demo._id}`;
      console.log(`  Updating ${demo._id}: ${demo.demoSettings.demoUrl} → ${newUrl}`);
      
      await db.collection('demos').updateOne(
        { _id: demo._id },
        { 
          $set: { 
            'demoSettings.demoUrl': newUrl,
            updatedAt: new Date()
          }
        }
      );
    }

    const total = demoWidgets.length + demos.length;
    console.log(`\n✅ Successfully updated ${total} demo URLs`);
    console.log(`   - ${demoWidgets.length} demo widgets`);
    console.log(`   - ${demos.length} demos`);

  } catch (error) {
    console.error('❌ Error fixing demo URLs:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
fixDemoUrls();



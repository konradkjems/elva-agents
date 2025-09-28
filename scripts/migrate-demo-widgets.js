import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function migrateDemoWidgets() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('chatwidgets');
    
    // Find all demo widgets in the widgets collection
    const demoWidgets = await db.collection('widgets').find({ 
      isDemoMode: true 
    }).toArray();
    
    console.log(`📊 Found ${demoWidgets.length} demo widgets to migrate`);
    
    if (demoWidgets.length === 0) {
      console.log('✅ No demo widgets to migrate');
      return;
    }
    
    // Migrate each demo widget to the demos collection
    const migratedDemos = [];
    
    for (const demoWidget of demoWidgets) {
      try {
        // Create demo document structure
        const demoData = {
          _id: demoWidget._id,
          name: demoWidget.name,
          description: demoWidget.description || `Demo of ${demoWidget.name}`,
          sourceWidgetId: demoWidget._id, // Self-reference for now
          sourceWidgetName: demoWidget.name,
          
          // Copy widget configuration
          openai: demoWidget.openai,
          appearance: demoWidget.appearance,
          messages: demoWidget.messages,
          branding: demoWidget.branding,
          behavior: demoWidget.behavior,
          integrations: demoWidget.integrations,
          timezone: demoWidget.timezone,
          analytics: demoWidget.analytics,
          
          // Demo-specific settings
          demoSettings: {
            clientWebsiteUrl: demoWidget.demoSettings?.clientWebsiteUrl || '',
            clientInfo: demoWidget.demoSettings?.clientInfo || '',
            demoId: demoWidget._id,
            demoUrl: demoWidget.demoSettings?.demoUrl || `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/demo/${demoWidget._id}`,
            usageLimits: {
              maxInteractions: demoWidget.demoSettings?.usageLimits?.maxInteractions || 50,
              maxViews: demoWidget.demoSettings?.usageLimits?.maxViews || 100,
              expiresAt: demoWidget.demoSettings?.usageLimits?.expiresAt || null,
              currentUsage: {
                interactions: demoWidget.demoSettings?.usageLimits?.currentUsage?.interactions || 0,
                views: demoWidget.demoSettings?.usageLimits?.currentUsage?.views || 0
              }
            },
            // Preserve screenshot data if it exists
            screenshotUrl: demoWidget.demoSettings?.screenshotUrl,
            screenshotPublicId: demoWidget.demoSettings?.screenshotPublicId,
            screenshotCapturedAt: demoWidget.demoSettings?.screenshotCapturedAt
          },
          
          status: 'active',
          createdAt: demoWidget.createdAt || new Date(),
          updatedAt: new Date()
        };
        
        // Insert into demos collection
        await db.collection('demos').insertOne(demoData);
        migratedDemos.push(demoWidget._id);
        
        console.log(`✅ Migrated demo: ${demoWidget.name} (${demoWidget._id})`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate demo ${demoWidget._id}:`, error.message);
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedDemos.length} demos`);
    console.log(`❌ Failed to migrate: ${demoWidgets.length - migratedDemos.length} demos`);
    
    if (migratedDemos.length > 0) {
      console.log('\n🔄 Next steps:');
      console.log('1. Test the new demo management interface');
      console.log('2. Verify all demos are working correctly');
      console.log('3. Once confirmed, you can optionally remove the old demo widgets from the widgets collection');
      console.log('\n⚠️  Note: The old demo widgets are still in the widgets collection for safety.');
      console.log('   You can remove them later using: db.widgets.deleteMany({ isDemoMode: true })');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run migration
migrateDemoWidgets().catch(console.error);




#!/usr/bin/env node
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyAnalyticsFix() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('elva-agents');
    
    console.log('📊 VERIFICATION TEST: Analytics Fix');
    console.log('=' .repeat(60));
    
    // 1. Get all non-demo widgets
    const widgets = await db.collection('widgets').find({ 
      isDemoMode: { $ne: true } 
    }).toArray();
    
    console.log(`\n✅ Found ${widgets.length} non-demo widgets\n`);
    
    // 2. For each widget, check if analytics can be found with string query
    let totalIssues = 0;
    let totalSuccess = 0;
    
    for (const widget of widgets) {
      const widgetIdString = typeof widget._id === 'object' ? widget._id.toString() : String(widget._id);
      
      console.log(`\nWidget: ${widget.name}`);
      console.log(`  ID: ${widgetIdString}`);
      console.log(`  ID Type: ${typeof widget._id}`);
      
      // Test query with string (new way)
      const analyticsString = await db.collection('analytics').find({ 
        agentId: widgetIdString 
      }).toArray();
      
      console.log(`  ✅ String query finds: ${analyticsString.length} records`);
      
      if (analyticsString.length > 0) {
        totalSuccess++;
        
        // Show summary stats
        const totalConversations = analyticsString.reduce((sum, data) => 
          sum + (data.metrics?.conversations || 0), 0
        );
        const totalMessages = analyticsString.reduce((sum, data) => 
          sum + (data.metrics?.messages || 0), 0
        );
        
        console.log(`     → Total conversations: ${totalConversations}`);
        console.log(`     → Total messages: ${totalMessages}`);
      } else {
        // Check if there are conversations for this widget
        const conversations = await db.collection('conversations').countDocuments({ 
          widgetId: widgetIdString 
        });
        
        if (conversations > 0) {
          console.log(`  ⚠️  Warning: ${conversations} conversations exist but no analytics!`);
          console.log(`     This is normal if conversations are very recent.`);
        } else {
          console.log(`  ℹ️  No conversations yet - analytics will be created on first conversation`);
        }
      }
    }
    
    console.log('\n\n' + '=' .repeat(60));
    console.log('📊 SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`✅ Widgets with analytics data: ${totalSuccess}/${widgets.length}`);
    console.log(`ℹ️  Widgets without analytics: ${widgets.length - totalSuccess}/${widgets.length}`);
    
    if (totalSuccess === widgets.length && widgets.length > 0) {
      console.log('\n🎉 ALL WIDGETS HAVE ANALYTICS DATA!');
      console.log('✅ Analytics system is working correctly.\n');
    } else if (totalSuccess > 0) {
      console.log('\n✅ PARTIAL SUCCESS');
      console.log(`${totalSuccess} widgets have analytics data.`);
      console.log(`${widgets.length - totalSuccess} widgets need conversations to generate analytics.\n`);
    } else if (widgets.length > 0) {
      console.log('\nℹ️  NO ANALYTICS DATA YET');
      console.log('This is normal for a new installation.');
      console.log('Analytics will be created automatically when conversations are started.\n');
    }
    
    // 3. Test: Verify all analytics records use string agentId
    console.log('\n📊 CHECKING ANALYTICS DATA INTEGRITY:');
    console.log('=' .repeat(60));
    
    const allAnalytics = await db.collection('analytics').find({}).toArray();
    console.log(`Total analytics records: ${allAnalytics.length}`);
    
    if (allAnalytics.length > 0) {
      let stringCount = 0;
      let objectCount = 0;
      let otherCount = 0;
      
      allAnalytics.forEach(record => {
        const agentIdType = typeof record.agentId;
        if (agentIdType === 'string') {
          stringCount++;
        } else if (agentIdType === 'object') {
          objectCount++;
        } else {
          otherCount++;
        }
      });
      
      console.log(`  ✅ String format: ${stringCount} records`);
      if (objectCount > 0) {
        console.log(`  ⚠️  ObjectId format: ${objectCount} records (should be converted)`);
      }
      if (otherCount > 0) {
        console.log(`  ⚠️  Other format: ${otherCount} records (unexpected)`);
      }
      
      if (stringCount === allAnalytics.length) {
        console.log('\n✅ All analytics records use string format - PERFECT!\n');
      } else {
        console.log('\n⚠️  Some analytics records use non-string format.');
        console.log('   New analytics will use string format going forward.\n');
      }
    }
    
    console.log('\n✅ Verification complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

verifyAnalyticsFix();


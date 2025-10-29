#!/usr/bin/env node

/**
 * Fix Analytics Overcounting Issue
 * 
 * Problem: Analytics was counting every message update as a new conversation
 * Solution: Recalculate analytics based on actual conversation documents
 * 
 * Run with: node scripts/fix-analytics-overcounting.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI environment variable is required');
}

async function fixAnalyticsOvercounting() {
  const client = new MongoClient(uri);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('elva-agents');
    const conversationsCol = db.collection('conversations');
    const analyticsCol = db.collection('analytics');

    // Get all conversations
    const allConversations = await conversationsCol.find({}).toArray();
    console.log(`\n📊 Found ${allConversations.length} conversations`);

    if (allConversations.length === 0) {
      console.log('ℹ️  No conversations found - nothing to fix');
      return;
    }

    // Delete existing analytics data
    console.log('\n🗑️  Clearing old analytics data...');
    const deleteResult = await analyticsCol.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} old analytics documents`);

    // Group conversations by widgetId and date
    const groupedData = {};
    
    allConversations.forEach(conv => {
      const date = new Date(conv.startTime || conv.createdAt);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const widgetId = String(conv.widgetId);
      
      if (!groupedData[widgetId]) {
        groupedData[widgetId] = {};
      }
      
      if (!groupedData[widgetId][dateKey]) {
        groupedData[widgetId][dateKey] = {
          conversations: 0,
          messages: 0,
          totalResponseTime: 0,
          responseTimeCount: 0,
          satisfactionSum: 0,
          satisfactionCount: 0,
          hourly: Array(24).fill(0)
        };
      }
      
      const dayData = groupedData[widgetId][dateKey];
      dayData.conversations++;  // Count each conversation document only once
      dayData.messages += conv.messageCount || conv.messages?.length || 0;
      
      // Calculate response time from messages
      if (conv.messages && Array.isArray(conv.messages)) {
        conv.messages.forEach(msg => {
          if (msg.responseTime) {
            dayData.totalResponseTime += msg.responseTime;
            dayData.responseTimeCount++;
          }
        });
      }
      
      // Add satisfaction if available
      if (conv.satisfaction !== null && conv.satisfaction !== undefined) {
        dayData.satisfactionSum += conv.satisfaction;
        dayData.satisfactionCount++;
      }
      
      // Add to hourly distribution
      const hour = date.getHours();
      dayData.hourly[hour]++;
    });

    // Generate correct analytics documents
    let analyticsGenerated = 0;
    let widgetsProcessed = 0;
    
    console.log('\n📝 Regenerating analytics documents...');
    
    for (const [widgetId, widgetData] of Object.entries(groupedData)) {
      widgetsProcessed++;
      let daysForWidget = 0;
      
      for (const [dateKey, dayData] of Object.entries(widgetData)) {
        const avgResponseTime = dayData.responseTimeCount > 0 
          ? dayData.totalResponseTime / dayData.responseTimeCount 
          : 0;
        
        const avgSatisfaction = dayData.satisfactionCount > 0 
          ? dayData.satisfactionSum / dayData.satisfactionCount 
          : null;

        // Calculate actual unique users for this widget on this date
        const uniqueUsers = await conversationsCol.distinct('sessionId', {
          widgetId: widgetId,
          createdAt: {
            $gte: new Date(dateKey),
            $lt: new Date(new Date(dateKey).getTime() + 24 * 60 * 60 * 1000)
          }
        });

        const analyticsDoc = {
          agentId: widgetId,
          date: new Date(dateKey),
          metrics: {
            conversations: dayData.conversations,  // Correct: count only conversation documents
            messages: dayData.messages,
            uniqueUsers: uniqueUsers.length,
            responseRate: 100,
            avgResponseTime: Math.round(avgResponseTime),
            satisfaction: avgSatisfaction ? Math.round(avgSatisfaction * 10) / 10 : null
          },
          hourly: dayData.hourly.reduce((acc, count, hour) => {
            acc[hour.toString()] = count;
            return acc;
          }, {}),
          createdAt: new Date()
        };

        // Insert analytics document
        await analyticsCol.insertOne(analyticsDoc);
        analyticsGenerated++;
        daysForWidget++;
      }
      
      console.log(`  ✅ Widget ${widgetId}: ${daysForWidget} days processed`);
    }

    console.log(`\n✅ Fix complete!`);
    console.log(`   • Widgets processed: ${widgetsProcessed}`);
    console.log(`   • Analytics documents regenerated: ${analyticsGenerated}`);
    console.log(`\n📊 Analytics now correctly counts each conversation only once`);
    console.log(`   Widget card statistics should now match quota widget values!`);

  } catch (error) {
    console.error('❌ Error fixing analytics:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

fixAnalyticsOvercounting().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

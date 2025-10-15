#!/usr/bin/env node
/**
 * Script to rename manual_reviews collection to support_requests
 * This script migrates the collection name in MongoDB
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function renameCollection() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('elva-agents');
    
    console.log('📊 RENAMING COLLECTION: manual_reviews → support_requests');
    console.log('=' .repeat(60));
    
    // Check if manual_reviews collection exists
    const collections = await db.listCollections({ name: 'manual_reviews' }).toArray();
    
    if (collections.length === 0) {
      console.log('ℹ️  manual_reviews collection does not exist');
      console.log('✅ Nothing to migrate - collection may already be renamed\n');
      
      // Check if support_requests exists
      const supportRequestsExists = await db.listCollections({ name: 'support_requests' }).toArray();
      if (supportRequestsExists.length > 0) {
        const count = await db.collection('support_requests').countDocuments();
        console.log(`✅ support_requests collection already exists with ${count} documents\n`);
      }
      
      return;
    }
    
    // Get count of documents
    const count = await db.collection('manual_reviews').countDocuments();
    console.log(`\nFound manual_reviews collection with ${count} documents\n`);
    
    // Rename the collection
    console.log('🔄 Renaming collection...');
    await db.collection('manual_reviews').rename('support_requests');
    
    console.log('✅ Collection renamed successfully!');
    
    // Verify the rename
    const verifyCount = await db.collection('support_requests').countDocuments();
    console.log(`✅ Verified: support_requests collection now has ${verifyCount} documents\n`);
    
    console.log('=' .repeat(60));
    console.log('📊 MIGRATION SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`✅ Successfully renamed collection`);
    console.log(`📊 Migrated ${verifyCount} documents`);
    console.log(`✅ Old collection: manual_reviews (removed)`);
    console.log(`✅ New collection: support_requests (active)\n`);
    
    console.log('🎉 Migration complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.codeName === 'NamespaceExists') {
      console.log('\n⚠️  support_requests collection already exists');
      console.log('   This likely means the migration was already completed');
      console.log('   No action needed!\n');
    } else {
      process.exit(1);
    }
  } finally {
    await client.close();
  }
}

renameCollection();


#!/usr/bin/env node
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function addOrganizationIdToDemos() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('elva-agents');
    
    console.log('📊 ADDING ORGANIZATIONID TO DEMOS');
    console.log('=' .repeat(60));
    
    // 1. Get all demos without organizationId
    const demosWithoutOrg = await db.collection('demos').find({ 
      organizationId: { $exists: false } 
    }).toArray();
    
    console.log(`\nFound ${demosWithoutOrg.length} demos without organizationId\n`);
    
    if (demosWithoutOrg.length === 0) {
      console.log('✅ All demos already have organizationId!');
      return;
    }
    
    // 2. For each demo, try to find organization from source widget
    let updated = 0;
    let errors = 0;
    
    for (const demo of demosWithoutOrg) {
      try {
        console.log(`Processing demo: ${demo.name} (${demo._id})`);
        
        // Try to find the source widget
        let organizationId = null;
        
        if (demo.sourceWidgetId) {
          // Try as ObjectId
          let widget = null;
          try {
            if (ObjectId.isValid(demo.sourceWidgetId)) {
              widget = await db.collection('widgets').findOne({ 
                _id: new ObjectId(demo.sourceWidgetId) 
              });
            }
          } catch (e) {
            // Not an ObjectId, try as string
          }
          
          // Try as string if not found
          if (!widget) {
            widget = await db.collection('widgets').findOne({ 
              _id: demo.sourceWidgetId 
            });
          }
          
          if (widget && widget.organizationId) {
            organizationId = widget.organizationId;
            console.log(`  ✅ Found organizationId from source widget: ${organizationId}`);
          } else {
            console.log(`  ⚠️  Source widget not found or has no organizationId`);
          }
        }
        
        // If no organizationId found from widget, try to find from creator
        if (!organizationId && demo.createdBy) {
          const user = await db.collection('users').findOne({ 
            _id: new ObjectId(demo.createdBy) 
          });
          
          if (user) {
            // Get user's organizations
            const membership = await db.collection('team_members').findOne({ 
              userId: new ObjectId(demo.createdBy),
              status: 'active'
            });
            
            if (membership && membership.organizationId) {
              organizationId = membership.organizationId;
              console.log(`  ✅ Found organizationId from creator's membership: ${organizationId}`);
            }
          }
        }
        
        // If still no organizationId, get the first organization (fallback)
        if (!organizationId) {
          const firstOrg = await db.collection('organizations').findOne({});
          if (firstOrg) {
            organizationId = firstOrg._id;
            console.log(`  ⚠️  Using first organization as fallback: ${organizationId}`);
          }
        }
        
        if (organizationId) {
          // Update the demo
          await db.collection('demos').updateOne(
            { _id: demo._id },
            { 
              $set: { 
                organizationId: organizationId,
                updatedAt: new Date()
              } 
            }
          );
          
          console.log(`  ✅ Updated demo with organizationId\n`);
          updated++;
        } else {
          console.log(`  ❌ Could not determine organizationId for demo\n`);
          errors++;
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing demo ${demo._id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 MIGRATION SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`✅ Successfully updated: ${updated} demos`);
    console.log(`❌ Errors: ${errors} demos`);
    console.log(`📊 Total processed: ${demosWithoutOrg.length} demos\n`);
    
    // 3. Verify all demos now have organizationId
    const remainingWithoutOrg = await db.collection('demos').countDocuments({ 
      organizationId: { $exists: false } 
    });
    
    if (remainingWithoutOrg === 0) {
      console.log('🎉 SUCCESS! All demos now have organizationId\n');
    } else {
      console.log(`⚠️  Warning: ${remainingWithoutOrg} demos still without organizationId\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

addOrganizationIdToDemos();


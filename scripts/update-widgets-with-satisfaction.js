require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function updateWidgetsWithSatisfaction() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('chatwidgets');
    
    // Update all widgets to include satisfaction settings
    const updateResult = await db.collection('widgets').updateMany(
      { satisfaction: { $exists: false } }, // Only update widgets without satisfaction settings
      { 
        $set: { 
          satisfaction: {
            enabled: false,
            triggerAfter: 3,
            inactivityDelay: 30000,
            promptText: 'How would you rate this conversation so far?',
            allowFeedback: true,
            feedbackPlaceholder: 'Optional feedback...'
          }
        } 
      }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} widgets with satisfaction settings`);
    
    // Also update demos collection if it exists
    const demosUpdateResult = await db.collection('demos').updateMany(
      { satisfaction: { $exists: false } },
      { 
        $set: { 
          satisfaction: {
            enabled: false,
            triggerAfter: 3,
            inactivityDelay: 30000,
            promptText: 'How would you rate this conversation so far?',
            allowFeedback: true,
            feedbackPlaceholder: 'Optional feedback...'
          }
        } 
      }
    );
    
    console.log(`✅ Updated ${demosUpdateResult.modifiedCount} demo widgets with satisfaction settings`);
    
    // Show summary
    const totalWidgets = await db.collection('widgets').countDocuments();
    const totalDemos = await db.collection('demos').countDocuments();
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total widgets: ${totalWidgets}`);
    console.log(`- Total demos: ${totalDemos}`);
    console.log(`- Widgets updated: ${updateResult.modifiedCount}`);
    console.log(`- Demos updated: ${demosUpdateResult.modifiedCount}`);
    
  } catch (error) {
    console.error('❌ Error updating widgets with satisfaction settings:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  updateWidgetsWithSatisfaction();
}

module.exports = { updateWidgetsWithSatisfaction };

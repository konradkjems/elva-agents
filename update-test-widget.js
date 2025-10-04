const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

async function updateTestWidget() {
  const client = new MongoClient('mongodb+srv://konradkjems:LI,k8991qw!@cluster0.5sfswgr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
  await client.connect();
  const db = client.db('elva-agents');
  
  const testWidgetId = '68e1650099b412458d0a2928';
  
  console.log('Updating test widget satisfaction config...');
  
  const result = await db.collection('widgets').updateOne(
    { _id: new ObjectId(testWidgetId) },
    { 
      $set: { 
        'satisfaction.enabled': true,
        'satisfaction.triggerAfter': 2,
        'satisfaction.inactivityDelay': 15000,
        'satisfaction.promptText': 'How would you rate this conversation so far?',
        'satisfaction.allowFeedback': false,
        'satisfaction.feedbackPlaceholder': 'Optional feedback...'
      } 
    }
  );
  
  console.log('Update result:', result);
  
  // Verify the update
  const updatedWidget = await db.collection('widgets').findOne({ _id: new ObjectId(testWidgetId) });
  console.log('\nUpdated test widget satisfaction config:');
  console.log(JSON.stringify(updatedWidget.satisfaction, null, 2));
  
  await client.close();
}

updateTestWidget().catch(console.error);

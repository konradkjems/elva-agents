import clientPromise from '../../../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('elva-agents');
    const conversations = db.collection('conversations');
    const analytics = db.collection('analytics');

    // Get all conversations
    const allConversations = await conversations.find({}).toArray();
    console.log(`📊 Found ${allConversations.length} conversations to process`);

    if (allConversations.length === 0) {
      return res.status(200).json({ 
        message: 'No conversations found',
        analyticsGenerated: 0 
      });
    }

    // Group conversations by widgetId and date
    const groupedData = {};
    
    allConversations.forEach(conv => {
      const date = new Date(conv.startTime);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const widgetId = conv.widgetId;
      
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
      dayData.conversations++;
      dayData.messages += conv.messageCount || 0;
      
      // Calculate response time from messages
      if (conv.messages) {
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

    // Generate analytics documents
    let analyticsGenerated = 0;
    
    for (const [widgetId, widgetData] of Object.entries(groupedData)) {
      for (const [dateKey, dayData] of Object.entries(widgetData)) {
        const avgResponseTime = dayData.responseTimeCount > 0 
          ? dayData.totalResponseTime / dayData.responseTimeCount 
          : 0;
        
        const avgSatisfaction = dayData.satisfactionCount > 0 
          ? dayData.satisfactionSum / dayData.satisfactionCount 
          : null;

        // Calculate actual unique users for this widget on this date
        const uniqueUsers = await db.collection('conversations').distinct('sessionId', {
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
            conversations: dayData.conversations,
            messages: dayData.messages,
            uniqueUsers: uniqueUsers.length, // Use actual count
            responseRate: 100, // Simplified
            avgResponseTime: Math.round(avgResponseTime),
            satisfaction: avgSatisfaction ? Math.round(avgSatisfaction * 10) / 10 : null
          },
          hourly: dayData.hourly.reduce((acc, count, hour) => {
            acc[hour.toString()] = count;
            return acc;
          }, {}),
          createdAt: new Date()
        };

        // Insert or update analytics document
        await analytics.replaceOne(
          { agentId: widgetId, date: new Date(dateKey) },
          analyticsDoc,
          { upsert: true }
        );
        
        analyticsGenerated++;
      }
    }

    console.log(`✅ Generated ${analyticsGenerated} analytics documents`);

    return res.status(200).json({
      message: 'Analytics data generated successfully',
      conversationsProcessed: allConversations.length,
      analyticsGenerated: analyticsGenerated
    });

  } catch (error) {
    console.error('Analytics generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

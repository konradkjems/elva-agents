import clientPromise from '../../../lib/mongodb';
import { withAdmin } from '../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import { requireRole } from '../../../lib/roleCheck';
import { getCache, setCache, generateCacheKey } from '../../../lib/cache.js';

// Mock data for testing (fallback)
const mockWidgets = [
  {
    _id: '1',
    name: 'Elva Kundeservice Widget',
    description: 'Hovedkundeservice widget for Elva Solutions',
    status: 'active',
    openai: {
      promptId: 'pmpt_123456789',
      version: '26',
      model: 'gpt-4o-mini'
    },
    appearance: {
      theme: 'light',
      themeColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      width: 450,
      height: 600,
      placement: 'bottom-right',
      borderRadius: 20,
      shadow: '0 20px 60px rgba(0,0,0,0.15)',
      backdropBlur: true,
      animationSpeed: 'normal',
      customCSS: '',
      useGradient: true
    },
    messages: {
      welcomeMessage: 'Hej! 😊 Jeg er kundeservice agent for Elva Solutions. Du kan spørge mig om hvad som helst.',
      inputPlaceholder: 'Skriv en besked her',
      typingText: 'AI tænker...',
      suggestedResponses: [
        'Hvad er fordelene ved at bruge Elva Solutions?',
        'Hvad koster det at få en AI-Agent?',
        'Kan jeg prøve det gratis?',
        'Hvordan kan jeg få en AI til min virksomhed?'
      ],
      popupMessage: 'Hej! 👋 Har du brug for hjælp?',
      popupDelay: 5000,
      autoClose: false,
      closeButtonText: 'Close',
      voiceInput: {
        enabled: true,
        language: 'da-DK',
        buttonPosition: 'left',
        continuousRecording: false,
        autoSendOnComplete: false
      },
      productCards: {
        enabled: true,
        layout: 'horizontal',
        cardsPerRow: 3,
        showPrice: true,
        priceCurrency: 'kr.',
        cardStyle: 'standard',
        autoFetchProductData: false
      }
    },
    branding: {
      title: 'Elva AI kundeservice Agent',
      assistantName: 'Elva Assistant',
      avatarUrl: '',
      logoUrl: '',
      companyName: 'Elva Solutions',
      customLogo: false,
      showBranding: true
    },
    advanced: {
      showCloseButton: true,
      showConversationHistory: true,
      showNewChatButton: true,
      enableAnalytics: true,
      trackEvents: ['message_sent', 'conversation_started', 'widget_opened'],
      conversationRetention: 30,
      maxConversations: 100,
      language: 'da',
      timezone: 'Europe/Copenhagen'
    },
    analytics: {
      totalConversations: 45,
      totalMessages: 128,
      averageResponseTime: 2.3,
      satisfactionScore: 4.7,
      lastActivity: new Date(),
      monthlyStats: {
        '2024-01': { conversations: 12, messages: 34 },
        '2024-02': { conversations: 18, messages: 52 },
        '2024-03': { conversations: 15, messages: 42 }
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '2',
    name: 'Sales Support Widget',
    description: 'Widget til salgsstøtte og lead generation',
    status: 'active',
    openai: {
      promptId: 'pmpt_987654321',
      version: '26',
      model: 'gpt-4o'
    },
    appearance: {
      theme: 'light',
      themeColor: '#10b981',
      secondaryColor: '#34d399',
      width: 400,
      height: 550,
      placement: 'bottom-left',
      borderRadius: 15,
      shadow: '0 15px 45px rgba(0,0,0,0.12)',
      backdropBlur: false,
      animationSpeed: 'fast',
      customCSS: '',
      useGradient: false
    },
    messages: {
      welcomeMessage: 'Velkommen! Jeg hjælper dig med at finde den perfekte løsning for din virksomhed.',
      inputPlaceholder: 'Beskriv dine behov...',
      typingText: 'Analyserer...',
      suggestedResponses: [
        'Hvad kan Elva Solutions tilbyde min virksomhed?',
        'Kan I hjælpe med automatisering?',
        'Hvad koster implementering?',
        'Har I referencer?'
      ],
      popupMessage: '💡 Spørg mig om vores løsninger!',
      popupDelay: 3000,
      autoClose: true,
      closeButtonText: 'Luk',
      voiceInput: {
        enabled: true,
        language: 'da-DK',
        buttonPosition: 'left',
        continuousRecording: false,
        autoSendOnComplete: false
      },
      productCards: {
        enabled: true,
        layout: 'horizontal',
        cardsPerRow: 3,
        showPrice: true,
        priceCurrency: 'kr.',
        cardStyle: 'standard',
        autoFetchProductData: false
      }
    },
    branding: {
      title: 'Elva Sales Assistant',
      assistantName: 'Sales Bot',
      avatarUrl: '',
      logoUrl: '',
      companyName: 'Elva Solutions',
      customLogo: false,
      showBranding: true
    },
    advanced: {
      showCloseButton: true,
      showConversationHistory: false,
      showNewChatButton: true,
      enableAnalytics: true,
      trackEvents: ['message_sent', 'conversation_started', 'widget_opened', 'conversation_closed'],
      conversationRetention: 14,
      maxConversations: 50,
      language: 'da',
      timezone: 'Europe/Copenhagen'
    },
    analytics: {
      totalConversations: 23,
      totalMessages: 67,
      averageResponseTime: 1.8,
      satisfactionScore: 4.5,
      lastActivity: new Date(),
      monthlyStats: {
        '2024-01': { conversations: 8, messages: 23 },
        '2024-02': { conversations: 10, messages: 28 },
        '2024-03': { conversations: 5, messages: 16 }
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '3',
    name: 'Technical Support Widget',
    description: 'Teknisk support widget for eksisterende kunder',
    status: 'inactive',
    openai: {
      promptId: 'pmpt_456789123',
      version: '26',
      model: 'gpt-4o-mini'
    },
    appearance: {
      theme: 'dark',
      themeColor: '#8b5cf6',
      secondaryColor: '#a78bfa',
      width: 500,
      height: 700,
      placement: 'top-right',
      borderRadius: 25,
      shadow: '0 25px 80px rgba(0,0,0,0.2)',
      backdropBlur: true,
      animationSpeed: 'slow',
      customCSS: '',
      useGradient: true
    },
    messages: {
      welcomeMessage: 'Hej! Jeg er din tekniske support agent. Hvordan kan jeg hjælpe dig i dag?',
      inputPlaceholder: 'Beskriv dit problem...',
      typingText: 'Undersøger problemet...',
      suggestedResponses: [
        'Min integration virker ikke',
        'Jeg har brug for hjælp til konfiguration',
        'Der er en fejl i systemet',
        'Hvordan opdaterer jeg?'
      ],
      popupMessage: '🔧 Teknisk support tilgængelig!',
      popupDelay: 7000,
      autoClose: false,
      closeButtonText: 'Luk'
    },
    branding: {
      title: 'Elva Tech Support',
      assistantName: 'Tech Assistant',
      avatarUrl: '',
      logoUrl: '',
      companyName: 'Elva Solutions',
      customLogo: false,
      showBranding: true
    },
    advanced: {
      showCloseButton: true,
      showConversationHistory: true,
      showNewChatButton: false,
      enableAnalytics: true,
      trackEvents: ['message_sent', 'conversation_started', 'widget_opened'],
      conversationRetention: 60,
      maxConversations: 200,
      language: 'da',
      timezone: 'Europe/Copenhagen'
    },
    analytics: {
      totalConversations: 12,
      totalMessages: 45,
      averageResponseTime: 3.2,
      satisfactionScore: 4.8,
      lastActivity: new Date(),
      monthlyStats: {
        '2024-01': { conversations: 4, messages: 15 },
        '2024-02': { conversations: 5, messages: 18 },
        '2024-03': { conversations: 3, messages: 12 }
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function handler(req, res) {
  try {
    // Get session for organization context
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentOrgId = session.user?.currentOrganizationId;
    const isPlatformAdmin = session.user?.role === 'platform_admin';

    if (req.method === 'GET') {
      // Generate cache key based on org
      const cacheKey = generateCacheKey('admin-widgets', {
        orgId: currentOrgId || 'none',
        isPlatformAdmin: isPlatformAdmin ? 'true' : 'false'
      });

      // Check for manual refresh parameter
      const shouldRefresh = req.query.refresh === 'true';
      
      // Check cache (60 second TTL for widgets data) - skip if refresh requested
      if (!shouldRefresh) {
        const cached = getCache(cacheKey);
        if (cached) {
          console.log('📦 Cache hit for admin-widgets');
          return res.status(200).json(cached);
        }
      } else {
        console.log('🔄 Manual refresh requested for admin-widgets');
      }

      // Get widgets from MongoDB filtered by organization
      try {
        const client = await clientPromise;
        const db = client.db('elva-agents'); // Use new database
        
        // Build query to filter by organization
        const query = {
          isDemoMode: { $ne: true } // Exclude demo widgets
        };
        
        // Filter by organization unless platform admin viewing all
        if (currentOrgId && !isPlatformAdmin) {
          query.organizationId = new ObjectId(currentOrgId);
        } else if (currentOrgId && isPlatformAdmin) {
          // Platform admin: filter by current org if one is selected
          query.organizationId = new ObjectId(currentOrgId);
        }
        
        const widgets = await db.collection('widgets').find(query).toArray();
        console.log('📊 Found widgets:', widgets.map(w => ({ id: w._id, name: w.name, slug: w.slug })));
        const analytics = db.collection('analytics');
        
        // Debug: Show all analytics records to understand the data structure
        const allAnalytics = await analytics.find({}).limit(5).toArray();
        console.log('📊 Sample analytics records:', allAnalytics.map(a => ({ 
          agentId: a.agentId, 
          widgetId: a.widgetId, 
          date: a.date, 
          conversations: a.metrics?.conversations 
        })));
        
        const widgetsWithStats = await Promise.all(widgets.map(async (widget) => {
          try {
            // IMPORTANT: Analytics always stores agentId as string
            // Convert widget._id to string for consistent lookup
            const widgetIdString = typeof widget._id === 'object' ? widget._id.toString() : String(widget._id);
            
            // Get organization's billing period from quota system
            // This ensures we use the SAME period as the Quota Widget
            const organization = widget.organizationId ? 
              await db.collection('organizations').findOne({ _id: new ObjectId(widget.organizationId) }) : 
              null;
            
            // Use organization's quota period dates if available, otherwise use calendar month
            let monthStart, monthEnd;
            if (organization?.usage?.conversations?.lastReset && organization?.usage?.conversations?.nextReset) {
              monthStart = new Date(organization.usage.conversations.lastReset);
              monthEnd = new Date(organization.usage.conversations.nextReset);
            } else {
              // Fallback to calendar month
              const now = new Date();
              monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            }
            
            const analyticsData = await analytics.find({ 
              agentId: widgetIdString,
              date: { $gte: monthStart, $lt: monthEnd }
            }).toArray();
            
            console.log(`📊 Widget ${widget.name} (${widgetIdString}): Found ${analyticsData.length} analytics records for ${monthStart.toISOString().split('T')[0]} to ${monthEnd.toISOString().split('T')[0]}`);
            if (analyticsData.length > 0) {
              console.log(`📊 Sample analytics data:`, analyticsData[0]);
            }
            
            // Count conversations directly from conversations collection
            // Only count conversations that:
            // 1. Have at least one message (messageCount > 0)
            // 2. Have at least one assistant message (handled by OpenAI API)
            const conversationsCollection = db.collection('conversations');
            
            // widgetId can be stored as ObjectId or string in conversations
            // widgetIdString is already declared above, now determine if we can use ObjectId
            // Only convert to ObjectId if it's a valid ObjectId format (24 char hex string)
            let widgetIdObjectId;
            
            if (typeof widget._id === 'object') {
              // Already an ObjectId
              widgetIdObjectId = widget._id;
            } else if (ObjectId.isValid(widget._id) && widget._id.length === 24) {
              // Valid ObjectId string - convert it
              widgetIdObjectId = new ObjectId(widget._id);
            } else {
              // Not a valid ObjectId format (e.g., 'cottonshoppen-widget-456')
              // Use as string only - widgetIdString is already set above
              widgetIdObjectId = null; // Don't use ObjectId for query
            }
            
            // Get all conversations for this widget in the period
            // Use $or to match widgetId as both string and ObjectId
            // Match conversations where either createdAt OR startTime falls within the period
            const widgetIdQuery = widgetIdObjectId 
              ? {
                  $or: [
                    { widgetId: widgetIdObjectId },
                    { widgetId: widgetIdString }
                  ]
                }
              : { widgetId: widgetIdString }; // Only match string if not a valid ObjectId
            
            const allConversations = await conversationsCollection.find({
              $and: [
                widgetIdQuery,
                {
                  $or: [
                    { createdAt: { $gte: monthStart, $lt: monthEnd } },
                    { startTime: { $gte: monthStart, $lt: monthEnd } }
                  ]
                }
              ]
            }).toArray();
            
            console.log(`📊 Widget ${widget.name}: Found ${allConversations.length} conversations in period`);
            
            // Filter to only count conversations with assistant messages and messageCount > 0
            const validConversations = allConversations.filter(conv => {
              // Must have at least one message
              if (!conv.messageCount || conv.messageCount === 0) {
                console.log(`📊 Conversation ${conv._id}: Filtered out - messageCount is ${conv.messageCount}`);
                return false;
              }
              
              // Must have at least one assistant message (handled by OpenAI)
              if (!conv.messages || !Array.isArray(conv.messages)) {
                console.log(`📊 Conversation ${conv._id}: Filtered out - no messages array`);
                return false;
              }
              
              const hasAssistantMessage = conv.messages.some(msg => msg.type === 'assistant');
              if (!hasAssistantMessage) {
                console.log(`📊 Conversation ${conv._id}: Filtered out - no assistant messages. Message types: ${conv.messages.map(m => m.type).join(', ')}`);
                return false;
              }
              
              return true;
            });
            
            console.log(`📊 Widget ${widget.name}: ${validConversations.length} valid conversations (out of ${allConversations.length} total)`);
            const totalConversations = validConversations.length;
            
            // Calculate total messages from valid conversations only
            // Only count assistant messages (handled by OpenAI API)
            const totalMessages = validConversations.reduce((sum, conv) => {
              const assistantMessages = conv.messages?.filter(msg => msg.type === 'assistant').length || 0;
              return sum + assistantMessages;
            }, 0);
            
            // Calculate average response time from valid conversations
            const allResponseTimes = validConversations
              .flatMap(conv => conv.messages?.filter(m => m.responseTime && m.type === 'assistant').map(m => m.responseTime) || [])
              .filter(rt => rt != null);
            const avgResponseTime = allResponseTimes.length > 0 
              ? Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length)
              : 0;
            
            // Calculate unique users from valid conversations
            const uniqueUserIds = new Set(validConversations
              .map(conv => conv.sessionId)
              .filter(id => id != null));
            const uniqueUsers = uniqueUserIds.size;
            
            return {
              ...widget,
              stats: {
                totalConversations,
                totalMessages,
                uniqueUsers,
                responseTime: avgResponseTime,
                analyticsDataPoints: analyticsData.length,
                periodStart: new Date(monthStart).toISOString(),
                periodEnd: new Date(monthEnd).toISOString()
              }
            };
          } catch (error) {
            console.error(`Error fetching analytics for widget ${widget._id}:`, error);
            
            // Get organization's billing period for error fallback too
            const organization = widget.organizationId ? 
              await db.collection('organizations').findOne({ _id: new ObjectId(widget.organizationId) }) : 
              null;
            
            let fallbackStart, fallbackEnd;
            if (organization?.usage?.conversations?.lastReset && organization?.usage?.conversations?.nextReset) {
              fallbackStart = new Date(organization.usage.conversations.lastReset).toISOString();
              fallbackEnd = new Date(organization.usage.conversations.nextReset).toISOString();
            } else {
              const now = new Date();
              fallbackStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
              fallbackEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
            }
            
            return {
              ...widget,
              stats: {
                totalConversations: 0,
                totalMessages: 0,
                uniqueUsers: 0,
                responseTime: 0,
                analyticsDataPoints: 0,
                periodStart: fallbackStart,
                periodEnd: fallbackEnd
              }
            };
          }
        }));
        
        console.log('📊 Sending widgets with stats:', widgetsWithStats.map(w => ({ 
          name: w.name, 
          id: w._id, 
          stats: w.stats 
        })));
        
        // Cache the response for 60 seconds
        setCache(cacheKey, widgetsWithStats, 60);
        console.log('📦 Cached admin-widgets response');
        
        res.status(200).json(widgetsWithStats);
      } catch (dbError) {
        console.error('Database error, falling back to mock data:', dbError);
        res.status(200).json(mockWidgets);
      }
    } else if (req.method === 'POST') {
      // Check role permissions for creating widgets
      const roleCheck = await requireRole(req, res, ['owner', 'admin']);
      if (!roleCheck.authorized) {
        return res.status(403).json({ error: roleCheck.error });
      }
      
      // Create new widget in MongoDB
      try {
        if (!currentOrgId) {
          return res.status(400).json({ error: 'No organization selected' });
        }

        const client = await clientPromise;
        const db = client.db('elva-agents'); // Use new database
        
        const newWidget = {
          ...req.body,
          organizationId: new ObjectId(currentOrgId), // Add organization
          createdBy: new ObjectId(session.user.id), // Add creator
          lastEditedBy: new ObjectId(session.user.id),
          lastEditedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          status: req.body.status || 'active'
        };
        
        const result = await db.collection('widgets').insertOne(newWidget);
        const createdWidget = await db.collection('widgets').findOne({ _id: result.insertedId });
        res.status(201).json(createdWidget);
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({ error: 'Failed to create widget' });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default handler;

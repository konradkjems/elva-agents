import clientPromise from '../../../lib/mongodb';
import { withAdmin } from '../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { ObjectId } from 'mongodb';
import { requireRole } from '../../../lib/roleCheck';

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
        
        // Fetch analytics data for each widget
        const widgetsWithStats = await Promise.all(widgets.map(async (widget) => {
          try {
            // IMPORTANT: Analytics always stores agentId as string
            // Convert widget._id to string for consistent lookup
            const widgetIdString = typeof widget._id === 'object' ? widget._id.toString() : String(widget._id);
            
            // Simple query - analytics uses string agentId
            const analyticsData = await analytics.find({ 
              agentId: widgetIdString 
            }).toArray();
            
            console.log(`📊 Widget ${widget.name} (${widgetIdString}): Found ${analyticsData.length} analytics records`);
            if (analyticsData.length > 0) {
              console.log(`📊 Sample analytics data:`, analyticsData[0]);
            }
            
            // Calculate stats
            const totalConversations = analyticsData.reduce((sum, data) => sum + (data.metrics?.conversations || 0), 0);
            const totalMessages = analyticsData.reduce((sum, data) => sum + (data.metrics?.messages || 0), 0);
            const totalResponseTimes = analyticsData.reduce((sum, data) => sum + (data.metrics?.avgResponseTime || 0), 0);
            const avgResponseTime = analyticsData.length > 0 ? Math.round(totalResponseTimes / analyticsData.length) : 0;
            
            // Calculate unique users by summing unique users across all analytics records
            // Each analytics record contains unique users for that specific date
            const uniqueUsers = analyticsData.reduce((sum, data) => sum + (data.metrics?.uniqueUsers || 0), 0);
            
            return {
              ...widget,
              stats: {
                totalConversations,
                totalMessages,
                uniqueUsers,
                responseTime: avgResponseTime,
                analyticsDataPoints: analyticsData.length
              }
            };
          } catch (error) {
            console.error(`Error fetching analytics for widget ${widget._id}:`, error);
            return {
              ...widget,
              stats: {
                totalConversations: 0,
                totalMessages: 0,
                uniqueUsers: 0,
                responseTime: 0,
                analyticsDataPoints: 0
              }
            };
          }
        }));
        
        console.log('📊 Sending widgets with stats:', widgetsWithStats.map(w => ({ 
          name: w.name, 
          id: w._id, 
          stats: w.stats 
        })));
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

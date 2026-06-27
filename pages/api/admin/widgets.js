import { admin } from '../../../lib/supabase/admin';
import { fromRow, fromRows } from '../../../lib/supabase/transform';
import { withAdmin } from '../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
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

      // Get widgets from Supabase filtered by organization
      try {
        // Build query to filter by organization (exclude demo widgets)
        let widgetsQuery = admin
          .from('widgets')
          .select('*')
          .eq('is_demo_mode', false);

        // Filter by organization unless platform admin viewing all orgs.
        // (Platform admins with no org selected bypass org scoping.)
        if (currentOrgId) {
          widgetsQuery = widgetsQuery.eq('organization_id', currentOrgId);
        }

        const { data: widgetRows, error: widgetsError } = await widgetsQuery;
        if (widgetsError) throw widgetsError;

        const widgets = fromRows(widgetRows);
        console.log('📊 Found widgets:', widgets.map(w => ({ id: w._id, name: w.name, slug: w.slug })));

        // Debug: sample a few analytics records to understand the data structure
        const { data: sampleAnalytics } = await admin
          .from('analytics')
          .select('widget_id, date, metrics')
          .limit(5);
        console.log('📊 Sample analytics records:', (sampleAnalytics || []).map(a => ({
          widgetId: a.widget_id,
          date: a.date,
          conversations: a.metrics?.conversations
        })));

        const widgetsWithStats = await Promise.all(widgets.map(async (widget) => {
          try {
            // Get organization's billing period from quota system
            // This ensures we use the SAME period as the Quota Widget
            let organization = null;
            if (widget.organizationId) {
              const { data: orgData } = await admin
                .from('organizations')
                .select('usage')
                .eq('id', widget.organizationId)
                .maybeSingle();
              organization = orgData;
            }

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

            // Analytics rollups are keyed by widget uuid and a `date` column
            const monthStartDate = new Date(monthStart).toISOString().split('T')[0];
            const monthEndDate = new Date(monthEnd).toISOString().split('T')[0];
            const { data: analyticsRows } = await admin
              .from('analytics')
              .select('*')
              .eq('widget_id', widget._id)
              .gte('date', monthStartDate)
              .lt('date', monthEndDate);
            const analyticsData = analyticsRows || [];

            console.log(`📊 Widget ${widget.name} (${widget._id}): Found ${analyticsData.length} analytics records for ${monthStartDate} to ${monthEndDate}`);
            if (analyticsData.length > 0) {
              console.log(`📊 Sample analytics data:`, analyticsData[0]);
            }

            // Count conversations directly from the conversations table.
            // Only count conversations that:
            // 1. Have at least one message (messageCount > 0)
            // 2. Have at least one assistant message (handled by OpenAI API)
            // Conversations are matched by widget uuid; a conversation counts if
            // either created_at OR start_time falls within the period.
            const monthStartIso = new Date(monthStart).toISOString();
            const monthEndIso = new Date(monthEnd).toISOString();
            const { data: convRows } = await admin
              .from('conversations')
              .select('*')
              .eq('widget_id', widget._id)
              .or(`and(created_at.gte.${monthStartIso},created_at.lt.${monthEndIso}),and(start_time.gte.${monthStartIso},start_time.lt.${monthEndIso})`);
            const allConversations = fromRows(convRows);

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
            let organization = null;
            if (widget.organizationId) {
              const { data: orgData } = await admin
                .from('organizations')
                .select('usage')
                .eq('id', widget.organizationId)
                .maybeSingle();
              organization = orgData;
            }

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
      
      // Create new widget in Supabase
      try {
        if (!currentOrgId) {
          return res.status(400).json({ error: 'No organization selected' });
        }

        const body = req.body || {};

        // Build a snake_case widget row from known columns only. Postgres
        // rejects unknown columns, and the GET response shape (and the duplicate
        // flow that spreads it) carries extras like `stats`/`_id`/`createdAt`.
        const newRow = {
          organization_id: currentOrgId,
          created_by: session.user.id,
          last_edited_by: session.user.id,
          last_edited_at: new Date().toISOString(),
          status: body.status || 'active',
          is_demo_mode: body.isDemoMode ?? false,
          name: body.name,
          description: body.description,
          prompt: body.prompt,
          theme: body.theme,
          timezone: body.timezone,
          openai: body.openai,
          appearance: body.appearance,
          messages: body.messages,
          branding: body.branding,
          advanced: body.advanced,
          analytics: body.analytics,
          behavior: body.behavior,
          consent: body.consent,
          demo_settings: body.demoSettings,
          imageupload: body.imageupload,
          integrations: body.integrations,
          manual_review: body.manualReview,
          satisfaction: body.satisfaction
        };

        // Insert (DB defaults the uuid id + timestamps), then set legacy_id to
        // the new id so the public/embed identifier stays stable.
        const { data: inserted, error: insertError } = await admin
          .from('widgets')
          .insert(newRow)
          .select('*')
          .single();
        if (insertError) throw insertError;

        const { data: createdWidget, error: legacyError } = await admin
          .from('widgets')
          .update({ legacy_id: inserted.id })
          .eq('id', inserted.id)
          .select('*')
          .single();
        if (legacyError) throw legacyError;

        res.status(201).json(fromRow(createdWidget));
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

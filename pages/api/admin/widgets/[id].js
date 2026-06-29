import { admin } from '../../../../lib/supabase/admin';
import { getSessionContext } from '../../../../lib/supabase/session';
import { fromRow } from '../../../../lib/supabase/transform';
import { withAdmin } from '../../../../lib/auth';
import { requireRole } from '../../../../lib/roleCheck';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A widget's public/embed id is stored as legacy_id; the same URL param may
// also be the uuid primary key. Resolve by legacy_id first, then by uuid.
async function findWidgetRowById(id) {
  let { data } = await admin.from('widgets').select('*').eq('legacy_id', id).maybeSingle();
  if (!data && UUID_RE.test(id)) {
    ({ data } = await admin.from('widgets').select('*').eq('id', id).maybeSingle());
  }
  return data;
}

// Mock data for testing (fallback when MongoDB is unavailable)
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
      showTypingText: true,
      suggestedResponses: [
        'Hvad er fordelene ved at bruge Elva Solutions?',
        'Hvad koster det at få en AI-Agent?',
        'Kan jeg prøve det gratis?',
        'Hvordan kan jeg få en AI til min virksomhed?'
      ],
      popupMessage: 'Hej! 👋 Har du brug for hjælp?',
      popupDelay: 5000,
      autoClose: false,
      closeButtonText: 'Close'
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
      showTypingText: true,
      suggestedResponses: [
        'Hvad kan Elva Solutions tilbyde min virksomhed?',
        'Kan I hjælpe med automatisering?',
        'Hvad koster implementering?',
        'Har I referencer?'
      ],
      popupMessage: '💡 Spørg mig om vores løsninger!',
      popupDelay: 3000,
      autoClose: true,
      closeButtonText: 'Luk'
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
    const session = await getSessionContext(req, res);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentOrgId = session.user?.currentOrganizationId;
    const isPlatformAdmin = session.user?.role === 'platform_admin';
    const { id } = req.query;

    if (req.method === 'GET') {
      // Get widget from Supabase
      try {
        const widgetRow = await findWidgetRowById(id);

        if (widgetRow) {
          const widget = fromRow(widgetRow);
          // Verify widget belongs to user's organization (unless platform admin)
          if (!isPlatformAdmin && widget.organizationId?.toString() !== currentOrgId) {
            return res.status(403).json({ error: 'Access denied' });
          }

          return res.status(200).json(widget);
        }
      } catch (dbError) {
        console.error('Database error, falling back to mock data:', dbError);
      }
      
      // Fallback to mock data
      const widget = mockWidgets.find(w => w._id === id);
      
      if (!widget) {
        return res.status(404).json({ error: 'Widget not found' });
      }
      
      res.status(200).json(widget);
    } else if (req.method === 'PUT') {
      // Check role permissions for updating widgets
      const roleCheck = await requireRole(req, res, ['owner', 'admin']);
      if (!roleCheck.authorized) {
        return res.status(403).json({ error: roleCheck.error });
      }
      
      // Update widget in Supabase
      try {
        // First, resolve the widget and verify it belongs to user's organization
        const existing = await findWidgetRowById(id);

        if (existing && !isPlatformAdmin && fromRow(existing).organizationId?.toString() !== currentOrgId) {
          return res.status(403).json({ error: 'Access denied' });
        }

        if (!existing) {
          return res.status(404).json({ error: 'Widget not found' });
        }

        const body = req.body || {};

        // Build a snake_case patch from known columns only. Unknown keys from the
        // editor's payload (e.g. _id, stats, createdAt) are naturally excluded;
        // undefined values are dropped by the client so absent fields untouched.
        // updated_at is maintained by a trigger.
        const patch = {
          last_edited_by: session.user.id,
          last_edited_at: new Date().toISOString(),
          status: body.status,
          is_demo_mode: body.isDemoMode,
          organization_id: body.organizationId,
          name: body.name,
          description: body.description,
          prompt: body.prompt,
          theme: body.theme,
          timezone: body.timezone,
          openai: body.openai,
          // In-platform prompt engine binding (coexists with legacy openai.promptId)
          prompt_id: body.promptId,
          prompt_version: body.promptVersion,
          ai: body.ai,
          knowledge_base: body.knowledgeBase,
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

        const { data: updatedWidget, error: updateError } = await admin
          .from('widgets')
          .update(patch)
          .eq('id', existing.id)
          .select('*')
          .single();
        if (updateError) throw updateError;

        return res.status(200).json(fromRow(updatedWidget));
      } catch (dbError) {
        console.error('Database error, falling back to mock data:', dbError);
      }
      
      // Fallback to mock data
      const widgetIndex = mockWidgets.findIndex(w => w._id === id);
      
      if (widgetIndex === -1) {
        return res.status(404).json({ error: 'Widget not found' });
      }
      
      const updateData = {
        ...req.body,
        updatedAt: new Date()
      };
      
      // Remove _id from update data as it's immutable
      delete updateData._id;
      
      mockWidgets[widgetIndex] = { ...mockWidgets[widgetIndex], ...updateData };
      res.status(200).json(mockWidgets[widgetIndex]);
    } else if (req.method === 'DELETE') {
      // Check role permissions for deleting widgets
      const roleCheck = await requireRole(req, res, ['owner', 'admin']);
      if (!roleCheck.authorized) {
        return res.status(403).json({ error: roleCheck.error });
      }
      
      // Delete widget from Supabase
      try {
        // First, resolve the widget and verify it belongs to user's organization
        const existing = await findWidgetRowById(id);

        if (existing && !isPlatformAdmin && fromRow(existing).organizationId?.toString() !== currentOrgId) {
          return res.status(403).json({ error: 'Access denied' });
        }

        if (existing) {
          const { error: deleteError } = await admin
            .from('widgets')
            .delete()
            .eq('id', existing.id);
          if (deleteError) throw deleteError;

          return res.status(200).json({ message: 'Widget deleted successfully' });
        }
      } catch (dbError) {
        console.error('Database error, falling back to mock data:', dbError);
      }
      
      // Fallback to mock data
      const widgetIndex = mockWidgets.findIndex(w => w._id === id);
      
      if (widgetIndex === -1) {
        return res.status(404).json({ error: 'Widget not found' });
      }
      
      mockWidgets.splice(widgetIndex, 1);
      res.status(200).json({ message: 'Widget deleted successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdmin(handler);

import clientPromise from '../../../lib/mongodb';

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

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Get all widgets from MongoDB
      try {
        const client = await clientPromise;
        const db = client.db('elva-agents');
        const widgets = await db.collection('widgets').find({}).toArray();
        res.status(200).json(widgets);
      } catch (dbError) {
        console.error('Database error, falling back to mock data:', dbError);
        res.status(200).json(mockWidgets);
      }
    } else if (req.method === 'POST') {
      // Create new widget in MongoDB
      try {
        const client = await clientPromise;
        const db = client.db('elva-agents');
        const newWidget = {
          ...req.body,
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

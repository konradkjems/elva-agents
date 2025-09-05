# 🎯 Widget Management Frontend - Implementation Plan

## 📋 Project Overview

Building a comprehensive frontend management system for AI chat widgets with advanced customization, analytics, and administration capabilities.

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: Zustand
- **Database**: MongoDB Atlas (existing)
- **Authentication**: NextAuth.js
- **File Upload**: Cloudinary/AWS S3
- **Real-time**: Socket.io (for live preview)

### Project Structure
```
elva-agents/
├── pages/
│   ├── admin/                    # Admin dashboard
│   │   ├── index.js             # Dashboard overview
│   │   ├── widgets/             # Widget management
│   │   │   ├── index.js         # Widget list
│   │   │   ├── [id]/            # Widget editor
│   │   │   │   ├── index.js     # Editor main
│   │   │   │   ├── appearance.js # Appearance settings
│   │   │   │   ├── messages.js   # Message settings
│   │   │   │   └── branding.js   # Branding settings
│   │   ├── analytics/           # Analytics dashboard
│   │   └── settings/            # Global settings
│   └── api/
│       ├── admin/               # Admin API routes
│       │   ├── widgets.js       # Widget CRUD
│       │   ├── analytics.js     # Analytics data
│       │   └── upload.js        # File upload
│       └── auth/                # Authentication
├── components/
│   ├── admin/                   # Admin components
│   │   ├── Layout.js           # Admin layout
│   │   ├── Sidebar.js          # Navigation sidebar
│   │   ├── WidgetCard.js       # Widget overview card
│   │   ├── WidgetEditor/        # Editor components
│   │   │   ├── LivePreview.js  # Live widget preview
│   │   │   ├── SettingsPanel.js # Settings sidebar
│   │   │   ├── ColorPicker.js  # Theme color picker
│   │   │   └── FileUpload.js   # Logo/avatar upload
│   │   └── Analytics/          # Analytics components
│   └── shared/                 # Shared components
├── lib/
│   ├── admin.js                # Admin utilities
│   ├── analytics.js            # Analytics helpers
│   └── upload.js               # File upload helpers
├── styles/
│   └── admin.css               # Admin-specific styles
└── public/
    └── admin/                  # Admin assets
```

## 📊 Database Schema Updates

### Enhanced Widget Schema
```javascript
// widgets collection
{
  _id: "widget-id",
  name: "Cottonshoppen Widget",
  description: "Customer service widget for Cottonshoppen.dk",
  status: "active", // active, inactive, draft
  createdAt: ISODate("2024-01-01"),
  updatedAt: ISODate("2024-01-01"),
  createdBy: "user-id",
  
  // OpenAI Configuration
  openai: {
    promptId: "pmpt_68aee2cd8bd881958ad99778533d3d750e3642c07a43035a",
    version: "26",
    model: "gpt-4o-mini"
  },
  
  // Appearance Settings
  appearance: {
    theme: "light", // light, dark, auto
    themeColor: "#059669",
    secondaryColor: "#10b981",
    width: 450,
    height: 600,
    placement: "bottom-right", // bottom-right, bottom-left, top-right, top-left
    minimizedSize: "medium", // small, medium, large
    borderRadius: 20,
    shadow: "0 20px 60px rgba(0,0,0,0.15)",
    backdropBlur: true,
    animationSpeed: "normal", // slow, normal, fast
    customCSS: ""
  },
  
  // Message Settings
  messages: {
    welcomeMessage: "Hej! 😊 Jeg er kundeservice agent for Elva Solutions. Du kan spørge mig om hvad som helst.",
    inputPlaceholder: "Skriv en besked her",
    typingText: "AI is thinking...",
    suggestedResponses: [
      "Hvad er fordelene ved at bruge Elva Solutions?",
      "Hvad koster det at få en AI-Agent?",
      "Kan jeg prøve det gratis?",
      "Hvordan kan jeg få en AI til min virksomhed?"
    ],
    popupMessage: "Need help? Chat with us!",
    popupDelay: 5000, // milliseconds
    autoClose: false,
    closeButtonText: "Close"
  },
  
  // Branding Settings
  branding: {
    title: "Elva AI kundeservice Agent",
    assistantName: "Elva Assistant",
    avatarUrl: "https://res.cloudinary.com/...",
    logoUrl: "https://res.cloudinary.com/...",
    companyName: "Elva Solutions",
    customLogo: false,
    showBranding: true
  },
  
  // Advanced Settings
  advanced: {
    showCloseButton: true,
    showConversationHistory: true,
    showNewChatButton: true,
    enableAnalytics: true,
    trackEvents: ["message_sent", "conversation_started", "widget_opened"],
    conversationRetention: 30, // days
    maxConversations: 100,
    language: "da", // da, en, auto
    timezone: "Europe/Copenhagen"
  },
  
  // Analytics & Performance
  analytics: {
    totalConversations: 1250,
    totalMessages: 5670,
    averageResponseTime: 2.3, // seconds
    satisfactionScore: 4.8,
    lastActivity: ISODate("2024-01-01"),
    monthlyStats: {
      "2024-01": { conversations: 150, messages: 670 },
      "2024-02": { conversations: 180, messages: 820 }
    }
  }
}

// conversations collection (enhanced)
{
  _id: "conversation-id",
  widgetId: "widget-id",
  userId: "user-id",
  conversationId: "conv-123",
  status: "active", // active, closed, archived
  createdAt: ISODate("2024-01-01"),
  updatedAt: ISODate("2024-01-01"),
  closedAt: ISODate("2024-01-01"),
  
  // Enhanced metadata
  metadata: {
    userAgent: "Mozilla/5.0...",
    ipAddress: "192.168.1.1",
    location: "Copenhagen, Denmark",
    referrer: "https://cottonshoppen.dk",
    sessionDuration: 1800, // seconds
    messageCount: 15,
    lastResponseId: "resp_123",
    satisfactionRating: 5
  },
  
  messages: [
    {
      role: "user",
      content: "Hej, jeg har et spørgsmål",
      timestamp: ISODate("2024-01-01T10:00:00Z"),
      messageId: "msg-1"
    },
    {
      role: "assistant", 
      content: "Hej! Hvordan kan jeg hjælpe dig?",
      timestamp: ISODate("2024-01-01T10:00:01Z"),
      messageId: "msg-2",
      responseId: "resp_123",
      responseTime: 1.2 // seconds
    }
  ]
}

// users collection (for admin access)
{
  _id: "user-id",
  email: "admin@elva.dk",
  name: "Admin User",
  role: "admin", // admin, editor, viewer
  permissions: ["read", "write", "delete", "analytics"],
  createdAt: ISODate("2024-01-01"),
  lastLogin: ISODate("2024-01-01"),
  settings: {
    theme: "light",
    language: "da",
    notifications: true
  }
}
```

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Basic admin structure and authentication

#### Tasks:
1. **Setup Admin Structure**
   - Create admin pages structure
   - Implement basic layout with sidebar
   - Add authentication with NextAuth.js
   - Create protected routes

2. **Database Updates**
   - Update widget schema with new fields
   - Create migration script
   - Add user management collection
   - Update existing widgets with new schema

3. **Basic Widget Management**
   - Widget list page with CRUD operations
   - Basic widget editor with form
   - Live preview component
   - Save/publish functionality

#### Deliverables:
- ✅ Admin login system
- ✅ Widget list with basic operations
- ✅ Basic widget editor
- ✅ Database schema updates

### Phase 2: Settings System (Week 3-4)
**Goal**: Comprehensive settings panels

#### Tasks:
1. **Appearance Settings**
   - Theme selector (light/dark/auto)
   - Color picker for theme colors
   - Size and placement controls
   - Border radius and shadow settings
   - Custom CSS editor

2. **Message Settings**
   - Welcome message editor
   - Input placeholder customization
   - Typing indicator text
   - Suggested responses management
   - Popup message settings

3. **Branding Settings**
   - Logo and avatar upload
   - Company name and title
   - Custom branding options
   - File upload integration

#### Deliverables:
- ✅ Complete settings panels
- ✅ Live preview updates
- ✅ File upload system
- ✅ Real-time settings sync

### Phase 3: Advanced Features (Week 5-6)
**Goal**: Analytics and advanced functionality

#### Tasks:
1. **Analytics Dashboard**
   - Conversation statistics
   - Performance metrics
   - User engagement data
   - Export functionality

2. **Conversation Management**
   - Conversation history viewer
   - Search and filter conversations
   - Export conversations
   - Conversation analytics

3. **Advanced Widget Features**
   - Close button implementation
   - Conversation history in widget
   - New chat functionality
   - Enhanced mobile responsiveness

#### Deliverables:
- ✅ Analytics dashboard
- ✅ Conversation management
- ✅ Advanced widget features
- ✅ Export/import functionality

### Phase 4: Polish & Optimization (Week 7-8)
**Goal**: Performance and user experience

#### Tasks:
1. **Performance Optimization**
   - Code splitting and lazy loading
   - Database query optimization
   - Caching strategies
   - Bundle size optimization

2. **User Experience**
   - Responsive design improvements
   - Loading states and animations
   - Error handling and validation
   - Accessibility improvements

3. **Testing & Documentation**
   - Unit tests for critical components
   - Integration tests for API routes
   - User documentation
   - Admin guide

#### Deliverables:
- ✅ Optimized performance
- ✅ Enhanced UX
- ✅ Comprehensive testing
- ✅ Documentation

## 🎨 UI/UX Design Specifications

### Color Palette
```css
/* Primary Colors */
--primary-50: #f0fdf4;
--primary-100: #dcfce7;
--primary-500: #059669;
--primary-600: #047857;
--primary-700: #065f46;

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-500: #6b7280;
--gray-700: #374151;
--gray-900: #111827;

/* Status Colors */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### Typography
```css
/* Font Family */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
```

### Component Specifications

#### Widget Card
```jsx
<WidgetCard
  widget={widget}
  onEdit={() => {}}
  onToggle={() => {}}
  onDelete={() => {}}
/>
```

#### Settings Panel
```jsx
<SettingsPanel
  settings={settings}
  onChange={handleChange}
  onSave={handleSave}
  onReset={handleReset}
/>
```

#### Live Preview
```jsx
<LivePreview
  widget={widget}
  settings={settings}
  isEditing={true}
  onInteraction={handleInteraction}
/>
```

## 🔧 Technical Implementation Details

### State Management
```javascript
// stores/widgetStore.js
import { create } from 'zustand';

const useWidgetStore = create((set, get) => ({
  widgets: [],
  currentWidget: null,
  settings: {},
  isLoading: false,
  
  // Actions
  fetchWidgets: async () => {
    set({ isLoading: true });
    const response = await fetch('/api/admin/widgets');
    const widgets = await response.json();
    set({ widgets, isLoading: false });
  },
  
  updateWidget: async (id, updates) => {
    const response = await fetch(`/api/admin/widgets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const updatedWidget = await response.json();
    set(state => ({
      widgets: state.widgets.map(w => w._id === id ? updatedWidget : w)
    }));
  },
  
  // Settings management
  updateSettings: (section, key, value) => {
    set(state => ({
      settings: {
        ...state.settings,
        [section]: {
          ...state.settings[section],
          [key]: value
        }
      }
    }));
  }
}));
```

### API Routes Structure
```javascript
// pages/api/admin/widgets.js
export default async function handler(req, res) {
  const { method } = req;
  
  switch (method) {
    case 'GET':
      // Get all widgets
      const widgets = await db.collection('widgets').find({}).toArray();
      res.json(widgets);
      break;
      
    case 'POST':
      // Create new widget
      const newWidget = await db.collection('widgets').insertOne(req.body);
      res.json(newWidget);
      break;
      
    case 'PUT':
      // Update widget
      const { id } = req.query;
      const updatedWidget = await db.collection('widgets').findOneAndUpdate(
        { _id: id },
        { $set: req.body },
        { returnDocument: 'after' }
      );
      res.json(updatedWidget);
      break;
      
    case 'DELETE':
      // Delete widget
      const { id: deleteId } = req.query;
      await db.collection('widgets').deleteOne({ _id: deleteId });
      res.json({ success: true });
      break;
  }
}
```

### File Upload Integration
```javascript
// lib/upload.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadImage = async (file) => {
  const result = await cloudinary.uploader.upload(file, {
    folder: 'elva-widgets',
    transformation: [
      { width: 400, height: 400, crop: 'fill' }
    ]
  });
  return result.secure_url;
};
```

## 📈 Analytics Implementation

### Event Tracking
```javascript
// lib/analytics.js
export const trackEvent = async (widgetId, event, data) => {
  await fetch('/api/admin/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      widgetId,
      event,
      data,
      timestamp: new Date().toISOString()
    })
  });
};

// Events to track
const EVENTS = {
  WIDGET_OPENED: 'widget_opened',
  MESSAGE_SENT: 'message_sent',
  CONVERSATION_STARTED: 'conversation_started',
  CONVERSATION_CLOSED: 'conversation_closed',
  SUGGESTED_RESPONSE_CLICKED: 'suggested_response_clicked'
};
```

### Analytics Dashboard Components
```jsx
// components/admin/Analytics/Dashboard.js
const AnalyticsDashboard = ({ widgetId }) => {
  const [stats, setStats] = useState({});
  const [timeRange, setTimeRange] = useState('7d');
  
  return (
    <div className="analytics-dashboard">
      <div className="stats-grid">
        <StatCard title="Total Conversations" value={stats.conversations} />
        <StatCard title="Total Messages" value={stats.messages} />
        <StatCard title="Avg Response Time" value={stats.avgResponseTime} />
        <StatCard title="Satisfaction Score" value={stats.satisfaction} />
      </div>
      
      <div className="charts">
        <ConversationChart data={stats.conversationData} />
        <ResponseTimeChart data={stats.responseTimeData} />
      </div>
    </div>
  );
};
```

## 🔒 Security Considerations

### Authentication & Authorization
- JWT-based authentication with NextAuth.js
- Role-based access control (admin, editor, viewer)
- API route protection with middleware
- Session management and timeout

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting on API routes
- Secure file upload validation

### Privacy Compliance
- GDPR compliance for conversation data
- Data retention policies
- User consent management
- Data export/deletion capabilities

## 🧪 Testing Strategy

### Unit Tests
```javascript
// __tests__/components/WidgetCard.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import WidgetCard from '../components/admin/WidgetCard';

describe('WidgetCard', () => {
  test('renders widget information correctly', () => {
    const widget = {
      _id: 'test-widget',
      name: 'Test Widget',
      status: 'active'
    };
    
    render(<WidgetCard widget={widget} />);
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
  });
});
```

### Integration Tests
```javascript
// __tests__/api/widgets.test.js
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/admin/widgets';

describe('/api/admin/widgets', () => {
  test('GET returns list of widgets', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });
    
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
  });
});
```

## 📚 Documentation Requirements

### User Documentation
- Admin dashboard user guide
- Widget creation tutorial
- Settings configuration guide
- Analytics interpretation guide

### Technical Documentation
- API documentation
- Database schema documentation
- Component library documentation
- Deployment guide

### Maintenance Documentation
- Backup procedures
- Update procedures
- Troubleshooting guide
- Performance monitoring guide

## 🚀 Deployment Strategy

### Environment Setup
```bash
# Production environment variables
NEXT_PUBLIC_API_URL=https://api.elva.dk
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Deployment Pipeline
1. **Development**: Local development with hot reload
2. **Staging**: Vercel preview deployments
3. **Production**: Automated deployment on main branch
4. **Monitoring**: Sentry for error tracking, Vercel Analytics

### Performance Optimization
- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Database query optimization
- CDN integration for static assets
- Caching strategies

## 📊 Success Metrics

### Technical Metrics
- Page load time < 2 seconds
- API response time < 500ms
- 99.9% uptime
- Zero security vulnerabilities

### Business Metrics
- Widget creation time < 5 minutes
- User satisfaction score > 4.5/5
- Feature adoption rate > 80%
- Support ticket reduction > 50%

## 🔄 Future Enhancements

### Phase 5: Advanced Features
- Multi-language support
- Advanced analytics and AI insights
- Widget templates and marketplace
- Integration with third-party platforms
- Advanced conversation routing

### Phase 6: Enterprise Features
- Multi-tenant architecture
- Advanced security features
- Custom integrations
- White-label solutions
- Advanced reporting and compliance

---

**This plan provides a comprehensive roadmap for building a world-class widget management system. Each phase builds upon the previous one, ensuring a solid foundation and gradual feature rollout.**

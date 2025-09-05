# 🚀 Quick Start Guide - Widget Management Frontend

## 📋 Getting Started

This guide will help you implement the widget management frontend step by step.

## 🛠️ Prerequisites

### Required Dependencies
```bash
npm install next-auth zustand @headlessui/react @heroicons/react
npm install cloudinary multer react-colorful
npm install recharts date-fns
npm install -D @types/multer
```

### Environment Variables
Add to your `.env.local`:
```bash
# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# File Upload
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Admin Access
ADMIN_EMAIL=konradkjems@gmail.com
ADMIN_PASSWORD=db_password112
```

## 🏗️ Phase 1: Foundation Setup

### Step 1: Create Admin Pages Structure
```bash
mkdir -p pages/admin/widgets
mkdir -p pages/admin/analytics
mkdir -p pages/admin/settings
mkdir -p pages/api/admin
mkdir -p components/admin
mkdir -p lib/admin
```

### Step 2: Database Migration
Create `scripts/migrate-widgets.cjs`:
```javascript
const { MongoClient } = require('mongodb');

async function migrateWidgets() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db("chatwidgets");
    
    // Update existing widgets with new schema
    const widgets = await db.collection("widgets").find({}).toArray();
    
    for (const widget of widgets) {
      const updates = {
        // Add new fields with defaults
        appearance: {
          theme: "light",
          themeColor: widget.theme?.buttonColor || "#059669",
          width: 450,
          height: 600,
          placement: "bottom-right",
          borderRadius: 20,
          shadow: "0 20px 60px rgba(0,0,0,0.15)",
          backdropBlur: true,
          animationSpeed: "normal",
          customCSS: ""
        },
        messages: {
          welcomeMessage: "Hello! How can I help you today?",
          inputPlaceholder: "Type your message...",
          typingText: "AI is thinking...",
          suggestedResponses: [],
          popupMessage: "Need help? Chat with us!",
          popupDelay: 5000,
          autoClose: false,
          closeButtonText: "Close"
        },
        branding: {
          title: "AI Assistant",
          assistantName: "AI Assistant",
          avatarUrl: "",
          logoUrl: "",
          companyName: "",
          customLogo: false,
          showBranding: true
        },
        advanced: {
          showCloseButton: true,
          showConversationHistory: true,
          showNewChatButton: true,
          enableAnalytics: true,
          trackEvents: ["message_sent", "conversation_started", "widget_opened"],
          conversationRetention: 30,
          maxConversations: 100,
          language: "da",
          timezone: "Europe/Copenhagen"
        },
        analytics: {
          totalConversations: 0,
          totalMessages: 0,
          averageResponseTime: 0,
          satisfactionScore: 0,
          lastActivity: new Date(),
          monthlyStats: {}
        },
        updatedAt: new Date()
      };
      
      await db.collection("widgets").updateOne(
        { _id: widget._id },
        { $set: updates }
      );
      
      console.log(`✅ Updated widget: ${widget._id}`);
    }
    
    console.log("🎉 Migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await client.close();
  }
}

migrateWidgets();
```

### Step 3: Basic Admin Layout
Create `components/admin/Layout.js`:
```jsx
import { useState } from 'react';
import Sidebar from './Sidebar';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* User menu */}
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

### Step 4: Admin Dashboard
Create `pages/admin/index.js`:
```jsx
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/Layout';
import WidgetCard from '../../components/admin/WidgetCard';

export default function AdminDashboard() {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
    try {
      const response = await fetch('/api/admin/widgets');
      const data = await response.json();
      setWidgets(data);
    } catch (error) {
      console.error('Failed to fetch widgets:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Widget Dashboard
            </h2>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <button
              type="button"
              className="ml-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Create Widget
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-8">Loading widgets...</div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {widgets.map((widget) => (
              <WidgetCard key={widget._id} widget={widget} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
```

## 🎨 Phase 2: Widget Editor

### Step 1: Create Widget Editor Page
Create `pages/admin/widgets/[id]/index.js`:
```jsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/Layout';
import LivePreview from '../../../components/admin/WidgetEditor/LivePreview';
import SettingsPanel from '../../../components/admin/WidgetEditor/SettingsPanel';

export default function WidgetEditor() {
  const router = useRouter();
  const { id } = router.query;
  const [widget, setWidget] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchWidget();
    }
  }, [id]);

  const fetchWidget = async () => {
    try {
      const response = await fetch(`/api/admin/widgets/${id}`);
      const data = await response.json();
      setWidget(data);
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch widget:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/admin/widgets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        alert('Widget saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save widget:', error);
      alert('Failed to save widget');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AdminLayout>
      <div className="flex h-screen">
        <div className="w-1/2 p-6">
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onSave={handleSave}
          />
        </div>
        <div className="w-1/2 p-6">
          <LivePreview widget={widget} settings={settings} />
        </div>
      </div>
    </AdminLayout>
  );
}
```

### Step 2: Settings Panel Component
Create `components/admin/WidgetEditor/SettingsPanel.js`:
```jsx
import { useState } from 'react';
import { Tab } from '@headlessui/react';

export default function SettingsPanel({ settings, onChange, onSave }) {
  const [activeTab, setActiveTab] = useState(0);

  const updateSetting = (section, key, value) => {
    onChange({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    });
  };

  return (
    <div className="h-full bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Widget Settings
        </h3>
        
        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
            }>
              Appearance
            </Tab>
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
            }>
              Messages
            </Tab>
            <Tab className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
               ${selected ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
            }>
              Branding
            </Tab>
          </Tab.List>
          
          <Tab.Panels className="mt-4">
            <Tab.Panel>
              {/* Appearance Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Theme Color
                  </label>
                  <input
                    type="color"
                    value={settings.appearance?.themeColor || '#059669'}
                    onChange={(e) => updateSetting('appearance', 'themeColor', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={settings.appearance?.width || 450}
                    onChange={(e) => updateSetting('appearance', 'width', parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={settings.appearance?.height || 600}
                    onChange={(e) => updateSetting('appearance', 'height', parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </Tab.Panel>
            
            <Tab.Panel>
              {/* Message Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Welcome Message
                  </label>
                  <textarea
                    value={settings.messages?.welcomeMessage || ''}
                    onChange={(e) => updateSetting('messages', 'welcomeMessage', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Input Placeholder
                  </label>
                  <input
                    type="text"
                    value={settings.messages?.inputPlaceholder || ''}
                    onChange={(e) => updateSetting('messages', 'inputPlaceholder', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </Tab.Panel>
            
            <Tab.Panel>
              {/* Branding Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Widget Title
                  </label>
                  <input
                    type="text"
                    value={settings.branding?.title || ''}
                    onChange={(e) => updateSetting('branding', 'title', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Assistant Name
                  </label>
                  <input
                    type="text"
                    value={settings.branding?.assistantName || ''}
                    onChange={(e) => updateSetting('branding', 'assistantName', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onSave}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 🔧 API Routes

### Step 1: Widget Management API
Create `pages/api/admin/widgets.js`:
```javascript
import clientPromise from '../../../lib/mongodb';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const client = await clientPromise;
    const db = client.db("chatwidgets");

    switch (method) {
      case 'GET':
        const widgets = await db.collection("widgets").find({}).toArray();
        res.json(widgets);
        break;

      case 'POST':
        const newWidget = {
          ...req.body,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active'
        };
        const result = await db.collection("widgets").insertOne(newWidget);
        res.json({ ...newWidget, _id: result.insertedId });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Step 2: Individual Widget API
Create `pages/api/admin/widgets/[id].js`:
```javascript
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;

  try {
    const client = await clientPromise;
    const db = client.db("chatwidgets");

    switch (method) {
      case 'GET':
        const widget = await db.collection("widgets").findOne({ _id: id });
        if (!widget) {
          return res.status(404).json({ error: 'Widget not found' });
        }
        res.json(widget);
        break;

      case 'PUT':
        const updatedWidget = await db.collection("widgets").findOneAndUpdate(
          { _id: id },
          { 
            $set: {
              ...req.body,
              updatedAt: new Date()
            }
          },
          { returnDocument: 'after' }
        );
        res.json(updatedWidget);
        break;

      case 'DELETE':
        await db.collection("widgets").deleteOne({ _id: id });
        res.json({ success: true });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## 🚀 Next Steps

1. **Run the migration script**:
   ```bash
   node scripts/migrate-widgets.cjs
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Visit the admin dashboard**:
   ```
   http://localhost:3000/admin
   ```

4. **Test the widget editor**:
   ```
   http://localhost:3000/admin/widgets/[widget-id]
   ```

## 📚 Additional Resources

- **Full Implementation Plan**: See `WIDGET-MANAGEMENT-FRONTEND-PLAN.md`
- **Component Library**: Check `components/admin/` for more components
- **API Documentation**: Review `pages/api/admin/` for all endpoints
- **Database Schema**: Reference the enhanced schema in the main plan

## 🎯 Success Checklist

- [ ] Admin pages structure created
- [ ] Database migration completed
- [ ] Basic admin layout working
- [ ] Widget list displaying
- [ ] Widget editor functional
- [ ] Settings panels working
- [ ] Live preview updating
- [ ] Save functionality working

---

**This quick start guide provides the essential foundation to begin building your widget management system. Follow the phases in the main plan for complete implementation.**

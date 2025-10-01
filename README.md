# 🤖 Elva Chat Widget Platform

AI-powered chat widget platform with conversation persistence, built with Next.js, OpenAI, and MongoDB.

## 📚 Documentation

**All documentation has been organized into the [`/docs`](./docs/) folder:**
- 🚀 [Deployment Guides](./docs/deployment/) - Production deployment instructions
- ⚙️ [Setup & Configuration](./docs/setup/) - MongoDB, OAuth, and initial setup
- ✨ [Features](./docs/features/) - Feature documentation and guides
- 🔧 [Development](./docs/development/) - Architecture and migration docs

**Quick Links:**
- [Complete Deployment Guide](./docs/deployment/COMPLETE_DEPLOYMENT_GUIDE.md)
- [MongoDB Setup](./docs/setup/MONGODB_SETUP_GUIDE.md)
- [Google OAuth Setup](./docs/setup/GOOGLE_OAUTH_SETUP.md)
- [Phase 1 Setup (Multi-Tenancy)](./docs/features/PHASE_1_SETUP_GUIDE.md) - **NEW** ✅
- [Project Summary](./docs/development/PROJECT-SUMMARY.md)

## ✨ Features

- 🚀 **Easy Integration**: Add to any website with a single script tag
- 💬 **Conversation Persistence**: Users can continue conversations across sessions
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- 🎨 **Customizable Themes**: Configure colors and styling per widget
- 🤖 **OpenAI Responses API**: Powered by OpenAI's Responses API with prompt management
- 📝 **Centralized Prompt Management**: Prompts managed on platform.openai.com
- 🗄️ **MongoDB Storage**: Reliable conversation and widget data storage
- 🌐 **CORS Enabled**: Works across different domains
- 🔄 **Stateful Conversations**: Automatic conversation context via OpenAI
- 🔐 **Authentication**: Email/password and Google OAuth login
- 🎨 **Modern UI**: Built with shadcn/ui components
- 🔍 **Global Search**: Command palette with Cmd+K shortcut
- 👤 **User Profiles**: Complete profile management
- 🏢 **Multi-Tenancy** (Phase 1 ✅): Organizations, team roles, data isolation
- 👥 **Team Collaboration** (In Development): Invite members, role-based access

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- OpenAI API key with Responses API access
- Prompts created on https://platform.openai.com/prompts

### Installation

1. **Clone and setup the project:**
   \`\`\`bash
   cd elva-agents
   npm install
   \`\`\`

2. **Configure environment variables:**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   
   Edit \`.env.local\` and add your credentials:
   \`\`\`env
   OPENAI_API_KEY=sk-your_openai_api_key_here
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatwidgets
   NEXT_PUBLIC_API_URL=http://localhost:3000
   \`\`\`

3. **Initialize the database for Responses API:**
   \`\`\`bash
   npm run migrate-responses
   \`\`\`

4. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Visit http://localhost:3000** to see the platform dashboard

## 📝 Using the Widget

### Integration

#### Responses API Widgets (Recommended)

For widgets using OpenAI Responses API with prompt management:

\`\`\`html
<script src="http://localhost:3000/api/widget-responses/cottonshoppen-widget-456"></script>
\`\`\`

#### Legacy Chat Completions Widgets

For older widgets using Chat Completions API:

\`\`\`html
<script src="http://localhost:3000/widget/test-widget-123/widget.js"></script>
\`\`\`

### Available Widgets

The Responses API migration creates these widgets:

- \`demo-widget-123\`: Demo Chat Widget (needs prompt ID configuration)
- \`cottonshoppen-widget-456\`: Cottonshoppen.dk Assistant (configured with actual prompt)
- \`support-widget-789\`: Generic Support Widget (needs prompt ID configuration)

### Configuring Prompt IDs

1. **Create prompts** at https://platform.openai.com/prompts
2. **Copy the prompt ID** (starts with \`pmpt_\`)
3. **Update widget configuration** in MongoDB or via the initialization script

## 🏗️ Architecture

### Backend Structure
\`\`\`
pages/api/
├── respond-responses.js        # Responses API chat endpoint (recommended)
├── respond.js                  # Legacy Chat Completions endpoint
├── conversation.js             # Load conversation history
├── widget-responses/[widgetId].js # Responses API widget serving
└── widget/[widgetId].js        # Legacy widget serving
\`\`\`

### Database Schema

**Widgets Collection (Responses API):**
\`\`\`json
{
  "_id": "widget-id",
  "name": "Widget Name",
  "description": "Widget description",
  "openai": {
    "promptId": "pmpt_68aee2cd8bd881958ad99778533d3d750e3642c07a43035a",
    "version": "19"
  },
  "theme": {
    "buttonColor": "#4f46e5",
    "chatBg": "#ffffff"
  }
}
\`\`\`

**Conversations Collection (Enhanced for Responses API):**
\`\`\`json
{
  "_id": "conversation-id",
  "widgetId": "widget-id",
  "userId": "user-id",
  "sessionId": "session-id",
  "openai": {
    "lastResponseId": "resp_abc123",
    "conversationHistory": ["resp_abc123", "resp_def456"]
  },
  "messages": [
    {
      "role": "user|assistant",
      "content": "Message content",
      "timestamp": "2024-01-15T10:30:00Z",
      "openai": {
        "responseId": "resp_abc123",
        "usage": { "total_tokens": 150 }
      }
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:32:15Z"
}
\`\`\`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| \`OPENAI_API_KEY\` | OpenAI API key for GPT integration | Yes |
| \`MONGODB_URI\` | MongoDB connection string | Yes |
| \`NEXT_PUBLIC_API_URL\` | Base URL for API calls | Yes |

### Widget Theming

Customize widget appearance by modifying the \`theme\` object in the widget configuration:

\`\`\`json
{
  "theme": {
    "buttonColor": "#your-brand-color",
    "chatBg": "#ffffff"
  }
}
\`\`\`

## 📚 API Reference

### POST /api/respond

Send a message and get AI response.

**Request:**
\`\`\`json
{
  "widgetId": "string",
  "message": "string", 
  "userId": "string",
  "conversationId": "string" // optional
}
\`\`\`

**Response:**
\`\`\`json
{
  "reply": "string",
  "conversationId": "string"
}
\`\`\`

### POST /api/conversation

Load conversation history.

**Request:**
\`\`\`json
{
  "conversationId": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "messages": [...],
  "conversationId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
\`\`\`

### GET /widget/[widgetId]/widget.js

Serves the widget JavaScript file with embedded configuration.

## 🚀 Deployment

### Vercel (Recommended)

1. **Deploy to Vercel:**
   \`\`\`bash
   npm install -g vercel
   vercel
   \`\`\`

2. **Configure environment variables** in the Vercel dashboard

3. **Update \`NEXT_PUBLIC_API_URL\`** to your Vercel domain

### Other Platforms

The project can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔒 Security

- API keys are server-side only
- CORS headers configured for cross-domain usage
- Input validation on all endpoints
- MongoDB injection protection
- Automatic conversation cleanup (30 days TTL)

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For questions or issues:
- Review the API documentation above
- Test with the sample widgets provided

---

Built with ❤️ by Elva Solutions

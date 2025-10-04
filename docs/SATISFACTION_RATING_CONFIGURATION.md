# Satisfaction Rating Configuration Guide

## Overview
The satisfaction rating system allows users to rate their conversation experience with your AI chatbot. Ratings appear automatically after a period of inactivity and are styled as AI messages.

## Configuration Options

### 1. Admin Dashboard Configuration

#### Access the Settings
1. Go to `/admin/widgets`
2. Click on any widget to edit it
3. Navigate to the **"Satisfaction"** tab (⭐ icon)

#### Available Settings

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| **Enable Satisfaction Rating** | Toggle the rating system on/off | `false` | Boolean |
| **Trigger After Messages** | Minimum messages before rating can appear | `3` | 1-10 |
| **Inactivity Delay** | Seconds of inactivity before showing rating | `30` | 5-300 |
| **Rating Prompt Text** | Question shown to users | `"How would you rate this conversation so far?"` | Text |
| **Allow Feedback** | Show optional text area for feedback | `true` | Boolean |
| **Feedback Placeholder** | Placeholder text for feedback area | `"Optional feedback..."` | Text |

#### Configuration Example
```javascript
{
  satisfaction: {
    enabled: true,
    triggerAfter: 2,
    inactivityDelay: 15000, // 15 seconds
    promptText: "How would you rate this conversation so far?",
    allowFeedback: true,
    feedbackPlaceholder: "Please share any additional feedback..."
  }
}
```

### 2. Database Configuration

#### Direct Database Updates
You can also configure satisfaction settings directly in MongoDB:

```javascript
// Update a specific widget
db.widgets.updateOne(
  { _id: ObjectId("widget-id") },
  {
    $set: {
      satisfaction: {
        enabled: true,
        triggerAfter: 2,
        inactivityDelay: 15000,
        promptText: "How would you rate this conversation so far?",
        allowFeedback: true,
        feedbackPlaceholder: "Optional feedback..."
      }
    }
  }
)

// Update all widgets
db.widgets.updateMany(
  { satisfaction: { $exists: false } },
  {
    $set: {
      satisfaction: {
        enabled: false,
        triggerAfter: 3,
        inactivityDelay: 30000,
        promptText: "How would you rate this conversation so far?",
        allowFeedback: true,
        feedbackPlaceholder: "Optional feedback..."
      }
    }
  }
)
```

#### Using the Update Script
Run the provided script to update all existing widgets:

```bash
node scripts/update-widgets-with-satisfaction.js
```

### 3. Widget Creation

#### New Widget Creation
When creating a new widget, satisfaction settings are included by default:

```javascript
const newWidget = {
  name: "My Widget",
  // ... other settings
  satisfaction: {
    enabled: false, // Default to disabled
    triggerAfter: 3,
    inactivityDelay: 30000,
    promptText: "How would you rate this conversation so far?",
    allowFeedback: true,
    feedbackPlaceholder: "Optional feedback..."
  }
}
```

## How It Works

### 1. Trigger Conditions
- User must send at least the specified number of messages
- User must be inactive for the specified delay period
- Rating appears only once per conversation

### 2. User Experience
- Rating appears as an AI message with avatar and name
- Shows 5 emoji options: 😡 😞 😐 😊 🤩
- Optional feedback text area (if enabled)
- Thank you message appears after rating

### 3. Data Storage
- Ratings are stored in the `conversations` collection
- Analytics are aggregated in the `satisfaction_analytics` collection
- Data includes rating, feedback, timestamp, and context

## Analytics

### Viewing Ratings
Ratings can be viewed through:
- Individual conversation records
- Satisfaction analytics API: `/api/satisfaction/analytics?widgetId=ID&timeRange=30d`
- Admin dashboard (future feature)

### Analytics Data Structure
```javascript
{
  widgetId: ObjectId,
  date: Date,
  ratings: {
    total: Number,
    average: Number,
    distribution: { 1: Number, 2: Number, 3: Number, 4: Number, 5: Number }
  },
  trends: {
    daily: [{ date: String, average: Number, total: Number }]
  }
}
```

## Best Practices

### 1. Timing Settings
- **Trigger After Messages**: 2-3 messages minimum
- **Inactivity Delay**: 15-30 seconds for good user experience
- **Too short**: May interrupt active conversations
- **Too long**: Users may have already left

### 2. Prompt Text
- Keep it conversational and friendly
- Ask about the "conversation" not just the AI
- Consider your brand voice and tone
- Examples:
  - "How would you rate this conversation so far?"
  - "How was your experience with our AI assistant?"
  - "Did we help you find what you were looking for?"

### 3. Feedback Settings
- Enable feedback for valuable insights
- Use clear, encouraging placeholder text
- Consider making feedback optional (recommended)

### 4. Testing
- Test with different inactivity delays
- Verify rating submission works
- Check analytics data collection
- Test with different conversation lengths

## Troubleshooting

### Common Issues

1. **Rating not appearing**
   - Check if `enabled` is set to `true`
   - Verify message count threshold is met
   - Ensure inactivity delay has passed

2. **Rating appears too frequently**
   - Increase `triggerAfter` value
   - Increase `inactivityDelay` value
   - Check if rating was already shown in conversation

3. **Styling issues**
   - Rating should appear as AI message with avatar
   - Check widget theme colors
   - Verify CSS classes are applied correctly

### Debug Information
Check browser console for:
- Widget configuration loading
- Inactivity timer status
- Rating submission success/failure
- API endpoint responses

## API Endpoints

### Submit Rating
```javascript
POST /api/satisfaction/rate
{
  "conversationId": "string",
  "widgetId": "string", 
  "rating": 1-5,
  "feedback": "string (optional)"
}
```

### Get Analytics
```javascript
GET /api/satisfaction/analytics?widgetId=ID&timeRange=30d
```

## Support

For issues or questions about satisfaction rating configuration:
1. Check this documentation
2. Review widget configuration in admin dashboard
3. Test with the provided test widget
4. Check database records for rating data

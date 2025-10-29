# 🖼️ Image Detection Feature

## Overview

The chat widget now includes an automatic image detection and display feature that identifies image URLs in AI assistant responses and renders them inline within the chat interface.

This feature aligns with the system prompt requirement that AI assistants should include images when referencing articles with visual content from the knowledge base.

## Features

### ✨ Automatic Image Detection

- **URL Pattern Matching**: Detects image URLs using regex patterns that match common formats
- **Multiple Formats Support**: Works with JPG, JPEG, PNG, GIF, WebP, and SVG formats
- **CDN Compatible**: Handles URLs from content delivery networks and knowledge base systems
- **Query Parameters**: Correctly processes URLs with query strings and fragments

### 🎨 Visual Rendering

- **Inline Display**: Images appear below the message text in a clean gallery layout
- **Responsive**: Images scale to fit the chat widget width (max-width: 100%, max-height: 250px)
- **Styling**: Professional appearance with rounded corners and shadow effects
- **Error Handling**: Failed images gracefully hide without breaking the layout

### 🖱️ User Interactions

- **Hover Effects**: Images scale up (102%) with enhanced shadows on hover for visual feedback
- **Click to Expand**: Users can click any image to open it in full size in a new browser tab
- **Smooth Transitions**: CSS transitions provide polished hover and interaction effects

### ⚙️ Integration

Works seamlessly with existing chat features:
- Compatible with typewriter effects (images appear after typing completes)
- Works alongside product cards (images appear after product cards)
- Preserves all markdown formatting in the message text
- Doesn't interfere with links or other formatted content

## How It Works

### Detection Process

1. **Extract URLs**: The `extractImageUrls()` function scans the message content using regex patterns
2. **Find Images**: Identifies URLs that match image extensions or known CDN patterns
3. **Avoid Duplicates**: Filters out duplicate URLs from the same message
4. **Render Images**: Creates DOM elements for each detected image

### Regex Pattern

```javascript
/(https?:\/\/[^\s)\]]+(?:\.(?:jpg|jpeg|png|gif|webp|svg)(?:[?#][^\s)\]]*)?|content\/.*?\/images\/[^\s)\]]*|cdn\/[^\s)\]]*\.(?:jpg|jpeg|png|gif|webp)))/gi
```

This pattern matches:
- Standard image URLs: `https://example.com/image.jpg`
- Knowledge base URLs: `https://kb.example.com/content/123/images/guide.png`
- CDN URLs: `https://cdn.example.com/images/photo.jpg`
- URLs with parameters: `https://example.com/image.jpg?size=large&format=webp`

## Implementation Details

### Code Location

**File**: `/pages/api/widget-embed/[widgetId].js`

### Key Functions

1. **`extractImageUrls(content)`** (line ~2291)
   - Extracts image URLs from message content
   - Returns array of unique image URLs
   - Uses regex pattern matching

2. **Image Rendering Block** (lines ~2965-3025)
   - Creates DOM elements for images
   - Applies styling and event listeners
   - Handles errors gracefully
   - Placed after product cards in message rendering

3. **Typewriter Effect Integration** (lines ~3265-3320)
   - Images appear after typewriter animation completes
   - Maintains consistent timing with product cards
   - Uses same rendering logic as standard messages

## System Prompt Integration

The feature is designed to work with AI system prompts that instruct the assistant to include images:

```
Håndtering af billeder: 
- Når du henviser til eller citerer fra artikler i knowledge basen, og artiklen 
  indeholder billeder (image URLs), skal du ALTID inkludere disse billed-URL'er i dit svar.
- Billederne skal formateres som klikbare links eller inkluderes direkte hvis systemet 
  understøtter det.
- Eksempel format: "Her er en guide til [artikel navn] (LINK til artikel) - 
  Se billederne her: [Billede 1 tekst] (image URL 1), [Billede 2 tekst] (image URL 2)"
```

The widget automatically detects and displays these included image URLs without requiring special formatting.

## Example Responses

### Example 1: Knowledge Base Article with Images

**Assistant Response:**
```
Her er en guide til Cowis systemet. Se skærmbillederne:

https://knowledge.cowis.net/content/23/27/images/cowis-hovedmaske-2014.png
https://knowledge.cowis.net/content/23/27/images/cowis-opsætning.png
https://knowledge.cowis.net/content/23/27/images/cowis-rapporter.png

Guidens vigtigste punkter:
- Start med at konfigurere systemet
- Opret dine første brugere
- Aktiver rapporteringsfunktionen
```

**Display:** The message text is shown normally, followed by the three detected images displayed in a vertical gallery.

### Example 2: CDN Hosted Images

**Assistant Response:**
```
Sådan uploader du produkter:

https://cdn.example.com/guides/upload-step1.jpg
https://cdn.example.com/guides/upload-step2.jpg
https://cdn.example.com/guides/upload-step3.jpg

Processen er simpel:
1. Klik på "Upload produkter"
2. Vælg billeder fra din computer
3. Udfyld produktinformation
```

**Display:** Step-by-step guide with embedded images that users can click to view in full size.

## Browser Support

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Considerations

- **Lightweight**: Minimal JavaScript execution for URL detection
- **Async Loading**: Images load asynchronously without blocking chat interaction
- **Error Isolation**: Failed images don't affect widget functionality
- **Memory**: Images are rendered in the DOM and managed by the browser

## Security

- **External URLs**: Images from external URLs are loaded with standard CORS handling
- **Error Handling**: Invalid or inaccessible URLs fail silently
- **User Control**: Users must explicitly click to open images in new tabs
- **No User Data**: Image detection doesn't collect or transmit user information

## Testing

### Manual Testing

1. Create a test message with image URLs
2. Verify images are detected and displayed
3. Test hover effects (scale and shadow)
4. Click to open in new tab
5. Test with invalid/broken image URLs

### Example Test Message

```
Her er nogle billeder for dig:
https://example.com/image1.jpg
https://example.com/image2.png
https://cdn.example.com/photo.gif
```

### Test Cases

- ✅ Single image URL
- ✅ Multiple image URLs in one message
- ✅ Mixed content (text + images)
- ✅ URLs with query parameters
- ✅ URLs with fragments (#anchor)
- ✅ Broken/invalid image URLs
- ✅ Non-image URLs (shouldn't display)
- ✅ Duplicate URLs (should deduplicate)

## Troubleshooting

### Images Not Appearing

1. **Check URL Format**: Ensure URL has proper extension (.jpg, .png, etc.)
2. **CORS Issues**: Some external images may fail due to CORS restrictions
3. **Browser Console**: Check for error messages in browser DevTools
4. **Network Tab**: Verify images are being requested

### Images Appearing but Broken

1. **URL Validity**: Test the URL directly in a browser
2. **Image Hosting**: Verify the image host is accessible
3. **SSL Certificate**: Check for mixed content warnings (HTTP vs HTTPS)

### Performance Issues

1. **Large Images**: Very large images may load slowly
2. **Too Many Images**: Limit to reasonable number per message
3. **Network**: Check connection speed for image loading

## Future Enhancements

Potential improvements for future versions:

- [ ] Image preview gallery with lightbox
- [ ] Image download option
- [ ] Lazy loading for multiple images
- [ ] Image sizing options in widget settings
- [ ] Image alt-text from system prompt
- [ ] Support for image captions
- [ ] Analytics for image interactions

## Related Documentation

- [Chat Widget Architecture](../WIDGET_ARCHITECTURE.md)
- [Widget Appearance Settings](./WIDGET_APPEARANCE.md)
- [AI Responses Configuration](./AI_RESPONSES.md)
- [Message Formatting](./MESSAGE_FORMATTING.md)

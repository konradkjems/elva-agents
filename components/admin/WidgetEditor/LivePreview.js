import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  X,
  Send,
  RotateCcw,
  Smartphone,
  Monitor
} from 'lucide-react';

export default function LivePreview({ widget, settings, showMobilePreview = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const [deviceView, setDeviceView] = useState('desktop'); // 'desktop', 'mobile'
  
  // Force desktop view when mobile preview is disabled
  useEffect(() => {
    if (!showMobilePreview && deviceView === 'mobile') {
      setDeviceView('desktop');
    }
  }, [showMobilePreview, deviceView]);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showConversationHistory, setShowConversationHistory] = useState(false);

  // Helper function to get theme colors based on theme mode
  const getThemeColors = () => {
    const theme = settings.appearance?.theme || 'light';
    
    if (theme === 'dark') {
      return {
        chatBg: '#1A1C23', // custom dark color
        inputBg: '#1A1C23', // same as chatBg
        messageBg: '#1A1C23', // custom dark color
        textColor: '#f9fafb', // gray-50
        borderColor: '#1A1C23' // custom dark color
      };
    } else if (theme === 'auto') {
      // For auto theme, we'll use light theme in preview
      // In actual widget, this would detect system preference
      return {
        chatBg: '#ffffff',
        inputBg: '#ffffff', // same as chatBg
        messageBg: '#f3f4f6',
        textColor: '#374151',
        borderColor: '#e5e7eb'
      };
    } else {
      // Light theme (default)
      return {
        chatBg: '#ffffff',
        inputBg: '#ffffff', // same as chatBg
        messageBg: '#f3f4f6',
        textColor: '#374151',
        borderColor: '#e5e7eb'
      };
    }
  };

  const themeColors = getThemeColors();

  // Helper function to generate smart AI icon based on widget name
  const generateAIIcon = (widgetName, brandingTitle) => {
    // Use branding title if available, otherwise use widget name
    const name = brandingTitle || widgetName || 'AI';
    
    // Extract first letter or initials
    if (name.includes(' ')) {
      // Multiple words - use initials
      const words = name.split(' ').filter(word => word.length > 0);
      if (words.length >= 2) {
        return words[0][0].toUpperCase() + words[1][0].toUpperCase();
      }
    }
    
    // Single word or fallback - use first letter
    return name[0]?.toUpperCase() || 'A';
  };

  // Show popup message when widget is closed
  useEffect(() => {
    if (!isOpen && settings.messages?.popupMessage) {
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [isOpen, settings.messages?.popupMessage]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    const messageText = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Check if widget has necessary configuration for API calls
    const promptId = widget?.openai?.promptId || settings?.openai?.promptId;
    if (!widget?._id || !promptId) {
      const errorResponse = {
        id: Date.now() + 1,
        text: 'Widget mangler AI konfiguration. Gå til AI Settings og tilføj en system prompt før du tester live preview.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsTyping(false);
      return;
    }

    try {
      // Send message to the actual API
      const requestBody = {
        message: messageText,
        widgetId: widget?._id,
        userId: 'preview-user', // Use a preview user ID
        conversationId: `preview-${Date.now()}`, // Generate a unique conversation ID for preview
      };
      
      const response = await fetch('/api/respond-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          widgetId: widget?._id,
          message: messageText
        });
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const aiResponse = {
        id: Date.now() + 1,
        text: data.reply || 'Jeg beklager, men jeg kunne ikke forstå dit spørgsmål. Prøv venligst igen.',
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback to a helpful message based on the error
      let fallbackMessage = 'Dette er en preview version. Rigtige svar kræver en deployed widget.';
      
      if (error.message.includes('404')) {
        fallbackMessage = 'Widget ikke fundet. Sørg for at widget\'en er korrekt konfigureret.';
      } else if (error.message.includes('400') || error.message.includes('Invalid value for \'content\'')) {
        fallbackMessage = 'Widget mangler AI prompt konfiguration. Gå til AI Settings og tilføj en system prompt.';
      } else if (error.message.includes('429')) {
        fallbackMessage = 'For mange anmodninger. Prøv igen om et øjeblik.';
      } else if (error.message.includes('500')) {
        fallbackMessage = 'Server fejl. Prøv igen senere.';
      }
      
      const errorResponse = {
        id: Date.now() + 1,
        text: fallbackMessage,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedResponse = async (response) => {
    const newMessage = {
      id: Date.now(),
      text: response,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages([newMessage]);
    setIsTyping(true);
    
    // Check if widget has necessary configuration for API calls
    const promptId = widget?.openai?.promptId || settings?.openai?.promptId;
    if (!widget?._id || !promptId) {
      const errorResponse = {
        id: Date.now() + 1,
        text: 'Widget mangler AI konfiguration. Gå til AI Settings og tilføj en system prompt før du tester live preview.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsTyping(false);
      return;
    }
    
    try {
      // Send suggested response to the actual API
      const apiResponse = await fetch('/api/respond-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: response,
          widgetId: widget?._id,
          userId: 'preview-user', // Use a preview user ID
          conversationId: `preview-${Date.now()}`,
        }),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('API Error (Suggested Response):', {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          error: errorText,
          widgetId: widget?._id,
          message: response
        });
        throw new Error(`API Error ${apiResponse.status}: ${apiResponse.statusText}`);
      }

      const data = await apiResponse.json();
      
      const aiResponse = {
        id: Date.now() + 1,
        text: data.reply || 'Jeg beklager, men jeg kunne ikke forstå dit spørgsmål. Prøv venligst igen.',
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending suggested response:', error);
      
      // Fallback to a helpful message based on the error
      let fallbackMessage = 'Dette er en preview version. Rigtige svar kræver en deployed widget.';
      
      if (error.message.includes('404')) {
        fallbackMessage = 'Widget ikke fundet. Sørg for at widget\'en er korrekt konfigureret.';
      } else if (error.message.includes('400') || error.message.includes('Invalid value for \'content\'')) {
        fallbackMessage = 'Widget mangler AI prompt konfiguration. Gå til AI Settings og tilføj en system prompt.';
      } else if (error.message.includes('429')) {
        fallbackMessage = 'For mange anmodninger. Prøv igen om et øjeblik.';
      } else if (error.message.includes('500')) {
        fallbackMessage = 'Server fejl. Prøv igen senere.';
      }
      
      const errorResponse = {
        id: Date.now() + 1,
        text: fallbackMessage,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const getPlacementStyles = () => {
    // For live preview, center the widget instead of using placement styles
    return { 
      position: 'relative',
      margin: '20px auto'
    };
  };

  const getWidgetStyles = () => {
    const baseWidth = settings.appearance?.width || 450;
    const baseHeight = settings.appearance?.height || 600;
    
    if (deviceView === 'mobile') {
      // Mobile bottom sheet style
      return {
        width: '100%',
        height: '70%',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        backgroundColor: '#ffffff',
        backdropFilter: settings.appearance?.backdropBlur ? 'blur(20px)' : 'none',
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0'
      };
    }
    
    // Desktop view
    const width = baseWidth;
    const height = baseHeight;

    return {
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: `${settings.appearance?.borderRadius || 20}px`,
      boxShadow: settings.appearance?.shadow || '0 20px 60px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1)',
      backgroundColor: '#ffffff',
      backdropFilter: settings.appearance?.backdropBlur ? 'blur(20px)' : 'none',
      ...getPlacementStyles()
    };
  };

  const themeColor = settings.appearance?.themeColor || '#3b82f6';
  const secondaryColor = settings.appearance?.secondaryColor || '#8b5cf6';
  const useGradient = settings.appearance?.useGradient !== false; // Default to true

  const getDeviceStyles = () => {
    if (deviceView === 'mobile') {
      return {
        width: '375px',
        height: '667px',
        margin: '0 auto',
        border: '8px solid #1f2937',
        borderRadius: '25px',
        position: 'relative',
        overflow: 'hidden'
      };
    }
    return {
      width: '100%',
      height: '700px', // Fixed height for live preview
      minHeight: '700px',
      position: 'relative'
    };
  };

  return (
    <div className="relative h-full">
      {/* Device View Controls */}
      <div className={`flex items-center mb-4 ${showMobilePreview ? 'justify-between' : 'justify-end'}`}>
        {showMobilePreview && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Preview:</span>
            <Button
              variant={deviceView === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceView('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceView === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceView('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMessages([]);
            setInputValue('');
            setIsTyping(false);
          }}
          title="Clear chat"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Preview Container */}
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg p-4 overflow-hidden relative border border-gray-200 dark:border-gray-700"
        style={getDeviceStyles()}
      >
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
          {deviceView === 'mobile' ? 'Mobile Preview' : 'Desktop Preview'} - Click the chat button to test
        </div>
        
        {/* Widget Preview */}
        <div className="relative">
          {/* Chat Widget */}
          <div 
            className={`transition-all duration-500 ease-out transform ${
              isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
            }`}
            style={{
              ...getWidgetStyles(),
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Mobile Bottom Sheet Handle removed per user request */}

            {/* Header */}
            <div 
              className="flex items-center justify-between p-5 text-white relative overflow-visible"
              style={{ 
                backgroundColor: useGradient ? 'transparent' : themeColor,
                background: useGradient ? `linear-gradient(135deg, ${themeColor} 0%, ${secondaryColor} 100%)` : themeColor,
                borderRadius: deviceView === 'mobile' ? '0' : `${settings.appearance?.borderRadius || 20}px ${settings.appearance?.borderRadius || 20}px 0 0`
              }}
            >
              <div className="flex items-center gap-3 relative z-10">
                <div 
                  className="bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden"
                  style={{ 
                    width: `${settings.branding?.iconSizes?.headerAvatar || 40}px`, 
                    height: `${settings.branding?.iconSizes?.headerAvatar || 40}px` 
                  }}
                >
                  {settings.branding?.avatarUrl ? (
                    <img 
                      src={settings.branding.avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                      style={{
                        transform: `scale(${settings.branding?.imageSettings?.avatarZoom || 1}) translate(${settings.branding?.imageSettings?.avatarOffsetX || 0}px, ${settings.branding?.imageSettings?.avatarOffsetY || 0}px)`,
                        transformOrigin: 'center center'
                      }}
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-white text-base">
                    {settings.branding?.title || 'AI Assistant'}
                  </div>
                  <div className="text-xs opacity-90 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    {settings.branding?.availableNowText || 'Tilgængelig nu'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 relative z-10">
                <div className="relative">
                  <button 
                    className="text-white hover:text-gray-200 transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                    onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showMenuDropdown && (
                    <div 
                      className="absolute top-full right-0 bg-white rounded-xl shadow-lg border border-gray-200 min-w-48 z-50 mt-2"
                      style={{
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div className="py-2">
                        <button 
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center gap-3"
                          onClick={() => {
                            setMessages([]);
                            setShowMenuDropdown(false);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          {settings.messages?.newConversationLabel || 'Ny samtale'}
                        </button>
                        <button 
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center gap-3"
                          onClick={() => {
                            setShowConversationHistory(!showConversationHistory);
                            setShowMenuDropdown(false);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {settings.messages?.conversationHistoryLabel || 'Tidligere samtaler'}
                        </button>
                        <button 
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center gap-3"
                          onClick={() => setShowMenuDropdown(false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Indstillinger
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Banner Text (centered, slight grey) */}
            {settings.messages?.bannerText && (
              <div 
                className="px-4 py-2 text-xs text-center"
                style={{ 
                  backgroundColor: "#edeef4",
                  color: themeColors.textColor,
                  opacity: 0.9
                }}
              >
                {settings.messages.bannerText}
              </div>
            )}

            {/* Messages Area */}
            <div 
              className="flex-1 overflow-y-auto p-4"
              style={{ 
                backgroundColor: themeColors.chatBg
              }}
            >
              {messages.length === 0 ? (
                <div className="space-y-4">
                  {/* Welcome Message Bubble */}
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3">
                      <div 
                        className="rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden"
                        style={{ 
                          width: `${settings.branding?.iconSizes?.messageAvatar || 32}px`, 
                          height: `${settings.branding?.iconSizes?.messageAvatar || 32}px`,
                          backgroundColor: themeColor || '#4f46e5'
                        }}
                      >
                        {settings.branding?.avatarUrl ? (
                          <img 
                            src={settings.branding.avatarUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                            style={{
                              transform: `scale(${settings.branding?.imageSettings?.avatarZoom || 1}) translate(${settings.branding?.imageSettings?.avatarOffsetX || 0}px, ${settings.branding?.imageSettings?.avatarOffsetY || 0}px)`,
                              transformOrigin: 'center center'
                            }}
                          />
                        ) : (
                          <span className="text-white text-xs font-semibold">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="text-xs text-gray-500 mb-2 font-medium">{settings.branding?.title || 'AI Assistant'}</div>
                        <div 
                          className="px-4 py-3 rounded-2xl text-sm max-w-xs shadow-sm border" 
                          style={{ 
                            borderRadius: '18px 18px 18px 4px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            borderColor: '#e5e7eb'
                          }}
                        >
                          {settings.messages?.welcomeMessage || 'Hej! 👋 Jeg er kundeservice agent for Elva Solutions. Du kan spørge mig om hvad som helst.'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 ml-3 mt-1">14.19</div>
                  </div>

                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.sender === 'assistant' ? (
                        <div className="flex items-start space-x-3">
                          <div 
                            className="rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden"
                            style={{ 
                              width: `${settings.branding?.iconSizes?.messageAvatar || 32}px`, 
                              height: `${settings.branding?.iconSizes?.messageAvatar || 32}px`,
                              backgroundColor: themeColor || '#4f46e5'
                            }}
                          >
                            {settings.branding?.avatarUrl ? (
                              <img 
                                src={settings.branding.avatarUrl} 
                                alt="Avatar" 
                                className="w-full h-full object-cover" 
                                style={{
                                  transform: `scale(${settings.branding?.imageSettings?.avatarZoom || 1}) translate(${settings.branding?.imageSettings?.avatarOffsetX || 0}px, ${settings.branding?.imageSettings?.avatarOffsetY || 0}px)`,
                                  transformOrigin: 'center center'
                                }}
                              />
                            ) : (
                              <span className="text-white text-xs font-semibold">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <div className="text-xs text-gray-500 mb-2 font-medium">{settings.branding?.title || 'AI Assistant'}</div>
                            <div 
                              className="px-4 py-3 rounded-2xl text-sm max-w-xs shadow-sm border" 
                              style={{ 
                                borderRadius: '18px 18px 18px 4px',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                borderColor: '#e5e7eb'
                              }}
                            >
                              {message.text}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="px-4 py-3 rounded-2xl text-sm max-w-xs shadow-sm" 
                          style={{ 
                            borderRadius: '18px 18px 4px 18px',
                            backgroundColor: themeColor || '#4f46e5',
                            color: '#ffffff'
                          }}
                        >
                          {message.text}
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-3">
                        <div 
                          className="rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden"
                          style={{ 
                            width: `${settings.branding?.iconSizes?.messageAvatar || 32}px`, 
                            height: `${settings.branding?.iconSizes?.messageAvatar || 32}px`,
                            backgroundColor: themeColor || '#4f46e5'
                          }}
                        >
                          {settings.branding?.avatarUrl ? (
                            <img 
                              src={settings.branding.avatarUrl} 
                              alt="Avatar" 
                              className="w-full h-full object-cover" 
                              style={{
                                transform: `scale(${settings.branding?.imageSettings?.avatarZoom || 1}) translate(${settings.branding?.imageSettings?.avatarOffsetX || 0}px, ${settings.branding?.imageSettings?.avatarOffsetY || 0}px)`,
                                transformOrigin: 'center center'
                              }}
                            />
                          ) : (
                            <span className="text-white text-xs font-semibold">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="text-xs text-gray-500 mb-2 font-medium">{settings.branding?.title || 'AI Assistant'}</div>
                          <div 
                            className={`bg-gray-50 text-gray-800 px-4 py-3 rounded-2xl text-sm shadow-sm border border-gray-100 flex items-center ${settings.messages?.showTypingText !== false ? 'gap-2' : ''}`} 
                            style={{ borderRadius: '18px 18px 18px 4px' }}
                          >
                            <div className="flex">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce mr-1" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            {settings.messages?.showTypingText !== false && (
                              <span>{settings.messages?.typingText || 'AI tænker...'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div 
              style={{ 
                backgroundColor: themeColors.inputBg,
                borderRadius: `0 0 ${settings.appearance?.borderRadius || 20}px ${settings.appearance?.borderRadius || 20}px`
              }}
            >
              {/* Quick Responses - Above input field */}
              {messages.length === 0 && settings.messages?.suggestedResponses?.length > 0 && (
                <div className="px-4 pt-3 pb-2">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {settings.messages.suggestedResponses
                      .filter(response => response.trim())
                      .map((response, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedResponse(response)}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-full transition-all duration-200 border"
                          style={{
                            backgroundColor: themeColors.messageBg,
                            color: themeColors.textColor,
                            borderColor: themeColors.borderColor
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = themeColors.borderColor;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = themeColors.messageBg;
                          }}
                        >
                          {response}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {/* Disclaimer Text */}
              {settings.messages?.disclaimerText && (
                  <div 
                    className="px-4 pb-2 text-xs text-center italic"
                    style={{ 
                      color: themeColors.textColor,
                      opacity: 0.7
                    }}
                  >
                    {settings.messages.disclaimerText}
                  </div>
                )}
              {/* Input Container - Matching widget-embed structure */}
              <div 
                style={{ 
                  background: themeColors.inputBg,
                  borderRadius: `0 0 ${settings.appearance?.borderRadius || 20}px ${settings.appearance?.borderRadius || 20}px`
                }}
              >
                <div 
                  style={{
                    padding: '10px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                  }}
                >
                  {/* Support Request Button (if enabled) */}
                  {settings.manualReview?.enabled !== false && (
                    <button
                      style={{
                        width: '44px',
                        height: '50px',
                        background: 'transparent',
                        color: themeColors.textColor,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        opacity: 0.5,
                        borderRadius: '12px',
                        marginRight: '4px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.opacity = '1';
                        e.target.style.backgroundColor = `${themeColor}15`;
                        e.target.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = '0.5';
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.transform = 'scale(1)';
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </button>
                  )}

                  {/* Input Container Inner */}
                  <div 
                    style={{
                      flex: 1,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      background: themeColors.inputBg,
                      border: `2px solid ${themeColors.borderColor}`,
                      borderRadius: '28px',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    {/* Voice Button (if enabled) */}
                    {settings.messages?.voiceInput?.enabled !== false && (
                      <button
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6b7280',
                          transition: 'all 0.2s ease',
                          zIndex: 2,
                          borderRadius: '4px'
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      </button>
                    )}

                    {/* Input Field */}
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={settings.messages?.inputPlaceholder || 'Skriv en besked her'}
                    style={{ 
                        width: '100%',
                        height: '50px',
                        padding: `0 16px 0 ${settings.messages?.voiceInput?.enabled !== false ? '46px' : '16px'}`,
                        border: 'none',
                        fontSize: '16px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        outline: 'none',
                        background: 'transparent',
                        color: themeColors.textColor,
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                    />

                    {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  style={{ 
                    width: `${settings.branding?.iconSizes?.sendButton || 44}px`,
                    height: `${settings.branding?.iconSizes?.sendButton || 44}px`,
                        background: themeColor,
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                        margin: '3px'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z"></path>
                    <path d="M22 2 11 13"></path>
                  </svg>
                </button>
                  </div>
                </div>
                {/* Footer Text */}
                <div
                  className="px-4 pb-3 text-xs flex items-center justify-center gap-1.5"
                  style={{ 
                    color: themeColors.textColor,
                    opacity: 0.5
                  }}
                >
                  <img 
                    src="/images/elva-logo-icon-grey.svg" 
                    alt="Elva Solutions" 
                    className="w-4 h-4 opacity-80 flex-shrink-0"
                  />
                  {settings.branding?.poweredByText ? (
                    <>
                      {settings.branding.poweredByText}{' '}
                      <a 
                        href="https://elva-solutions.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: themeColors.textColor, 
                          textDecoration: 'none', 
                          opacity: 0.8 
                        }}
                      >
                        elva-solutions.com
                      </a>
                    </>
                  ) : (
                    'Drevet af elva-solutions.com'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conversation History View */}
          {showConversationHistory && (
            <div 
              className={`absolute transition-all duration-500 ease-out transform ${
                showConversationHistory ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
              }`}
              style={getWidgetStyles()}
            >
              {/* Mobile Bottom Sheet Handle for History removed per user request */}

              {/* History Header */}
              <div 
                className="flex items-center justify-between p-5 text-white relative overflow-hidden"
                style={{ 
                  backgroundColor: useGradient ? 'transparent' : themeColor,
                  background: useGradient ? `linear-gradient(135deg, ${themeColor} 0%, ${secondaryColor} 100%)` : themeColor,
                  borderRadius: deviceView === 'mobile' ? '0' : `${settings.appearance?.borderRadius || 20}px ${settings.appearance?.borderRadius || 20}px 0 0`
                }}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <button 
                    className="text-white hover:text-gray-200 transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                    onClick={() => setShowConversationHistory(false)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <div className="font-semibold text-white text-base">{settings.messages?.conversationHistoryLabel || 'Tidligere samtaler'}</div>
                    <div className="text-xs opacity-90">Historik</div>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowConversationHistory(false)}
                  className="text-white hover:text-gray-200 transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* History Content */}
              <div 
                className="flex-1 overflow-y-auto p-4"
                style={{ 
                  height: 'calc(100% - 200px)',
                  backgroundColor: themeColors.chatBg
                }}
              >
                <div className="space-y-3">
                  {/* Mock conversation history */}
                  <div 
                    className="p-3 rounded-lg border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: themeColors.messageBg,
                      borderColor: themeColors.borderColor
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = themeColors.borderColor;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = themeColors.messageBg;
                    }}
                  >
                    <div className="text-sm font-medium" style={{ color: themeColors.textColor }}>Samtale fra i dag</div>
                    <div className="text-xs mt-1" style={{ color: themeColors.textColor, opacity: 0.7 }}>3 beskeder • 14:30</div>
                  </div>
                  <div 
                    className="p-3 rounded-lg border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: themeColors.messageBg,
                      borderColor: themeColors.borderColor
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = themeColors.borderColor;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = themeColors.messageBg;
                    }}
                  >
                    <div className="text-sm font-medium" style={{ color: themeColors.textColor }}>Samtale fra i går</div>
                    <div className="text-xs mt-1" style={{ color: themeColors.textColor, opacity: 0.7 }}>5 beskeder • 09:15</div>
                  </div>
                  <div 
                    className="p-3 rounded-lg border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: themeColors.messageBg,
                      borderColor: themeColors.borderColor
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = themeColors.borderColor;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = themeColors.messageBg;
                    }}
                  >
                    <div className="text-sm font-medium" style={{ color: themeColors.textColor }}>Samtale fra sidste uge</div>
                    <div className="text-xs mt-1" style={{ color: themeColors.textColor, opacity: 0.7 }}>2 beskeder • 16:45</div>
                  </div>
                </div>
              </div>

              {/* History Footer */}
              <div 
                className="p-4 border-t border-gray-100"
                style={{ 
                  backgroundColor: themeColors.inputBg,
                  borderRadius: `0 0 ${settings.appearance?.borderRadius || 20}px ${settings.appearance?.borderRadius || 20}px`
                }}
              >
                <button
                  onClick={() => {
                    setShowConversationHistory(false);
                    setMessages([]);
                  }}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
                >
                  Start ny samtale
                </button>
              </div>
            </div>
          )}

          {/* Popup Message (when widget is closed) */}
          {showPopup && settings.messages?.popupMessage && (
            <div 
              className="absolute transition-all duration-300 ease-out"
              style={{
                bottom: '100px',
                right: '25px',
                maxWidth: '280px',
                zIndex: 10,
                opacity: showPopup ? 1 : 0,
                transform: showPopup ? 'translateY(0)' : 'translateY(20px)'
              }}
            >
              <div 
                className="bg-white rounded-2xl p-4 border border-gray-200"
                style={{
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1)'
                }}
              >
                <div className="text-sm text-gray-800 leading-relaxed">
                  {settings.messages.popupMessage}
                </div>
                {/* Speech bubble tail */}
                <div 
                  className="absolute w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45"
                  style={{
                    bottom: '-6px',
                    right: '20px'
                  }}
                />
              </div>
            </div>
          )}

          {/* Floating Button (when closed) */}
          <div 
            className={`absolute cursor-pointer transition-all duration-300 ease-out ${
              !isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
            }`}
            style={{
              bottom: '25px',
              right: '25px',
              width: `${settings.branding?.iconSizes?.chatButton || 60}px`,
              height: `${settings.branding?.iconSizes?.chatButton || 60}px`,
              borderRadius: '50%',
              background: useGradient ? `linear-gradient(135deg, ${themeColor} 0%, ${secondaryColor} 100%)` : themeColor,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              zIndex: 10000
            }}
            onClick={() => {
              setIsOpen(true);
              setShowPopup(false);
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 12px 35px rgba(79, 70, 229, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 8px 25px rgba(79, 70, 229, 0.3)';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="27.5" height="27.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
            </svg>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          50% { opacity: 1; transform: scale(1.05) translateY(-5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.4s ease-out;
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}

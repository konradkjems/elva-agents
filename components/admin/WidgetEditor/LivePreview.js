import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  X,
  Send,
  RotateCcw,
  Smartphone,
  Monitor,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  Play,
  Pause
} from 'lucide-react';

export default function LivePreview({ widget, settings }) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const [deviceView, setDeviceView] = useState('desktop');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showWebsiteBackground, setShowWebsiteBackground] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const previewRef = useRef(null);
  
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showConversationHistory, setShowConversationHistory] = useState(false);

  // Helper function to get theme colors based on theme mode
  const getThemeColors = () => {
    const theme = settings.appearance?.theme || 'light';

    if (theme === 'dark') {
      return {
        chatBg: '#1A1C23',
        inputBg: '#1A1C23',
        messageBg: '#2D3748',
        textColor: '#f9fafb',
        borderColor: '#374151'
      };
    } else if (theme === 'auto') {
      return {
        chatBg: '#ffffff',
        inputBg: '#ffffff',
        messageBg: '#f3f4f6',
        textColor: '#374151',
        borderColor: '#e5e7eb'
      };
    } else {
      return {
        chatBg: '#ffffff',
        inputBg: '#ffffff',
        messageBg: '#f3f4f6',
        textColor: '#374151',
        borderColor: '#e5e7eb'
      };
    }
  };

  const themeColors = getThemeColors();

  // Helper function to generate smart AI icon based on widget name
  const generateAIIcon = (widgetName, brandingTitle) => {
    const name = brandingTitle || widgetName || 'AI';
    if (name.includes(' ')) {
      const words = name.split(' ').filter(word => word.length > 0);
      if (words.length >= 2) {
        return words[0][0].toUpperCase() + words[1][0].toUpperCase();
      }
    }
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
      const requestBody = {
        message: messageText,
        widgetId: widget?._id,
        userId: 'preview-user',
        conversationId: `preview-${Date.now()}`,
      };

      const response = await fetch('/api/respond-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
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
      let fallbackMessage = 'Dette er en preview version. Rigtige svar kræver en deployed widget.';
      if (error.message.includes('404')) {
        fallbackMessage = 'Widget ikke fundet. Sørg for at widget\'en er korrekt konfigureret.';
      } else if (error.message.includes('400')) {
        fallbackMessage = 'Widget mangler AI prompt konfiguration.';
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

    const promptId = widget?.openai?.promptId || settings?.openai?.promptId;
    if (!widget?._id || !promptId) {
      const errorResponse = {
        id: Date.now() + 1,
        text: 'Widget mangler AI konfiguration.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsTyping(false);
      return;
    }

    try {
      const apiResponse = await fetch('/api/respond-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: response,
          widgetId: widget?._id,
          userId: 'preview-user',
          conversationId: `preview-${Date.now()}`,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`API Error ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      const aiResponse = {
        id: Date.now() + 1,
        text: data.reply || 'Jeg beklager, men jeg kunne ikke forstå dit spørgsmål.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorResponse = {
        id: Date.now() + 1,
        text: 'Dette er en preview version.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const resetPreview = () => {
    setIsAnimating(true);
    setMessages([]);
    setInputValue('');
    setIsTyping(false);
    setIsOpen(true);
    setShowMenuDropdown(false);
    setShowConversationHistory(false);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const getWidgetStyles = () => {
    const baseWidth = settings.appearance?.width || 450;
    const baseHeight = settings.appearance?.height || 600;

    if (deviceView === 'mobile') {
      return {
        width: '320px',
        height: '480px',
        borderRadius: `${settings.appearance?.borderRadius || 16}px`,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        backgroundColor: '#ffffff',
        position: 'relative'
      };
    }

    // Desktop - use actual widget dimensions
    return {
      width: `${baseWidth}px`,
      height: `${baseHeight}px`,
      borderRadius: `${settings.appearance?.borderRadius || 20}px`,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      backgroundColor: '#ffffff',
      position: 'relative'
    };
  };

  const themeColor = settings.appearance?.themeColor || '#3b82f6';
  const secondaryColor = settings.appearance?.secondaryColor || '#8b5cf6';
  const useGradient = settings.appearance?.useGradient !== false;

  return (
    <div className="relative h-full flex flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl" />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: `radial-gradient(circle, ${themeColor}08 0%, transparent 70%)`
          }}
        />
      </div>

      {/* Enhanced Floating Preview Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 px-2 py-1.5 rounded-2xl flex items-center gap-1">
          {/* Device Switcher - Always visible */}
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-0.5">
            <button
              onClick={() => {
                setIsAnimating(true);
                setDeviceView('desktop');
                setTimeout(() => setIsAnimating(false), 500);
              }}
              className={`p-2 rounded-lg transition-all duration-300 ${
                deviceView === 'desktop'
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Desktop view"
            >
              <Monitor size={16} />
            </button>
            <button
              onClick={() => {
                setIsAnimating(true);
                setDeviceView('mobile');
                setTimeout(() => setIsAnimating(false), 500);
              }}
              className={`p-2 rounded-lg transition-all duration-300 ${
                deviceView === 'mobile'
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Mobile view"
            >
              <Smartphone size={16} />
            </button>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-1" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 px-1">
            <button
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Zoom ud"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-10 text-center tabular-nums">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Zoom ind"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-1" />

          {/* Toggle Background */}
          <button
            onClick={() => setShowWebsiteBackground(!showWebsiteBackground)}
            className={`p-2 rounded-lg transition-all ${
              showWebsiteBackground 
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={showWebsiteBackground ? 'Skjul website baggrund' : 'Vis website baggrund'}
          >
            {showWebsiteBackground ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          {/* Reset Button */}
          <button
            onClick={resetPreview}
            className={`p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all ${isAnimating ? 'animate-spin' : ''}`}
            title="Nulstil preview"
          >
            <RefreshCw size={16} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setZoomLevel(100)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Tilpas til vindue"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Preview Canvas */}
      <div 
        ref={previewRef}
        className="flex-1 flex items-center justify-center p-4 overflow-auto"
        style={{ transform: `scale(${zoomLevel / 100})`, transition: 'transform 0.3s ease', minHeight: 0 }}
      >
        <div
          className={`relative transition-all duration-500 ease-out ${
            deviceView === 'mobile'
              ? 'w-[390px] h-[844px]'
              : 'w-[1200px] h-[800px]'
          }`}
        >
          {/* Device Frame */}
          {deviceView === 'mobile' ? (
            /* iPhone 14 Pro Style Frame with Bottom Sheet Widget */
            <div className="relative w-full h-full">
              {/* Phone Body */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 rounded-[55px] shadow-[0_0_0_2px_#1a1a1a,0_50px_100px_-20px_rgba(0,0,0,0.5),0_30px_60px_-30px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Screen Bezel */}
                <div className="absolute inset-[12px] bg-black rounded-[45px] overflow-hidden">
                  {/* Dynamic Island */}
                  <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-full z-50 flex items-center justify-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-slate-900 ring-1 ring-slate-700" />
                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                  </div>
                  
                  {/* Screen Content */}
                  <div className="absolute inset-0 bg-white overflow-hidden">
                    {/* Status Bar */}
                    <div className="h-[54px] bg-white flex items-end justify-between px-8 pb-1">
                      <span className="text-sm font-semibold text-black">9:41</span>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-[18px] h-[12px]" viewBox="0 0 18 12" fill="black">
                          <path d="M1 4.5C1 3.67 1.67 3 2.5 3h1C4.33 3 5 3.67 5 4.5v5c0 .83-.67 1.5-1.5 1.5h-1C1.67 11 1 10.33 1 9.5v-5zm5-2C6 1.67 6.67 1 7.5 1h1C9.33 1 10 1.67 10 2.5v7c0 .83-.67 1.5-1.5 1.5h-1C6.67 11 6 10.33 6 9.5v-7zm5 3c0-.83.67-1.5 1.5-1.5h1c.83 0 1.5.67 1.5 1.5v4c0 .83-.67 1.5-1.5 1.5h-1c-.83 0-1.5-.67-1.5-1.5v-4z"/>
                        </svg>
                        <svg className="w-[17px] h-[12px]" viewBox="0 0 17 12" fill="black">
                          <path d="M8.5 2.5a6.5 6.5 0 016.5 6.5.5.5 0 01-1 0 5.5 5.5 0 00-11 0 .5.5 0 01-1 0 6.5 6.5 0 016.5-6.5z"/>
                          <path d="M8.5 5.5a3.5 3.5 0 013.5 3.5.5.5 0 01-1 0 2.5 2.5 0 00-5 0 .5.5 0 01-1 0 3.5 3.5 0 013.5-3.5z"/>
                          <circle cx="8.5" cy="9" r="1.5"/>
                        </svg>
                        <div className="flex items-center">
                          <div className="w-[25px] h-[12px] border-2 border-black rounded-[4px] relative">
                            <div className="absolute inset-[2px] right-[4px] bg-black rounded-[1px]" />
                          </div>
                          <div className="w-[2px] h-[5px] bg-black rounded-r-full ml-[1px]" />
                        </div>
                      </div>
                    </div>

                    {/* Website Background */}
                    {showWebsiteBackground && (
                      <div className="absolute inset-0 top-[54px] bg-gradient-to-b from-slate-50 to-white overflow-y-auto">
                        {/* Mobile App Header */}
                        <div className="h-12 bg-white border-b border-slate-100 flex items-center justify-between px-4">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
                          <div className="flex-1 mx-4 h-8 bg-slate-100 rounded-full flex items-center px-3">
                            <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span className="text-xs text-slate-400">Søg...</span>
                          </div>
                          <div className="w-8 h-8 bg-slate-100 rounded-full" />
                        </div>
                        
                        {/* Content */}
                        <div className="p-4 space-y-4">
                          {/* Hero Banner (no image) */}
                          <div className="h-40 bg-gradient-to-br from-slate-200 to-slate-100 rounded-2xl overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent flex items-end p-4">
                              <div className="text-slate-900">
                                <div className="text-sm font-bold">Vinter Udsalg</div>
                                <div className="text-xs opacity-80">Op til 50% rabat</div>
                              </div>
                            </div>
                          </div>
                          {/* Product Grid with actual images */}
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', title: 'Smartwatch', price: '1.299 kr' },
                              { img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', title: 'Høretelefoner', price: '899 kr' },
                              { img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop', title: 'Solbriller', price: '549 kr' },
                              { img: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=400&fit=crop', title: 'Sneakers', price: '1.199 kr' }
                            ].map((product, i) => (
                              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="h-24 bg-slate-100 overflow-hidden">
                                  <img src={product.img} alt={product.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-2">
                                  <div className="text-xs font-medium text-slate-700 mb-1">{product.title}</div>
                                  <div className="text-xs font-bold text-blue-600">{product.price}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mobile Bottom Sheet Widget - Matching widget-embed styling */}
                    <div
                      className={`absolute inset-x-0 bottom-0 transition-all duration-300 ease-out transform ${
                        isOpen 
                          ? 'opacity-100 translate-y-0' 
                          : 'opacity-0 translate-y-full pointer-events-none'
                      }`}
                      style={{
                        height: '94%',
                        backgroundColor: themeColors.chatBg,
                        borderRadius: '20px 20px 0 0',
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        zIndex: 20
                      }}
                    >
                      {/* Widget Header */}
                      <div
                        className="flex items-center justify-between p-4 text-white relative shrink-0"
                        style={{
                          background: useGradient 
                            ? `linear-gradient(135deg, ${themeColor} 0%, ${secondaryColor} 100%)` 
                            : themeColor,
                          borderRadius: '20px 20px 0 0'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden"
                            style={{
                              width: `${settings.branding?.iconSizes?.headerAvatar || 36}px`,
                              height: `${settings.branding?.iconSizes?.headerAvatar || 36}px`
                            }}
                          >
                            {settings.branding?.avatarUrl ? (
                              <img src={settings.branding.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-bold text-sm">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm">
                              {settings.branding?.title || 'AI Assistant'}
                            </div>
                            <div className="text-[11px] opacity-90 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                              {settings.messages?.availableNowText || settings.branding?.availableNowText || 'Tilgængelig nu'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            className="text-white/80 hover:text-white hover:bg-white/10 transition-all p-1.5 rounded-lg"
                            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="6" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="12" cy="18" r="2" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/80 hover:text-white hover:bg-white/10 transition-all p-1.5 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Dropdown Menu */}
                        {showMenuDropdown && (
                          <div className="absolute top-full right-2 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 min-w-[200px] z-50 overflow-hidden">
                            <button
                              className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              onClick={() => { setMessages([]); setShowMenuDropdown(false); }}
                            >
                              <RefreshCw size={14} />
                              {settings.messages?.newConversationLabel || 'Ny samtale'}
                            </button>
                            <button
                              className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              onClick={() => { setShowConversationHistory(true); setShowMenuDropdown(false); }}
                            >
                              <MessageCircle size={14} />
                              {settings.messages?.conversationHistoryLabel || 'Tidligere samtaler'}
                            </button>
                          </div>
                        )}
                      </div>

                    {/* Banner Text - Matching widget-embed */}
                      {settings.messages?.bannerText && (
                        <div className="px-4 py-2 text-xs text-center bg-slate-50 text-slate-500 border-b border-slate-100">
                          {settings.messages.bannerText}
                        </div>
                      )}

                      {/* Messages Area */}
                      <div className="flex-1 overflow-y-auto p-3" style={{ backgroundColor: themeColors.chatBg, WebkitOverflowScrolling: 'touch' }}>
                        {messages.length === 0 ? (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden"
                                style={{ backgroundColor: themeColor }}
                              >
                                {settings.branding?.avatarUrl ? (
                                  <img src={settings.branding.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white text-[10px] font-semibold">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-[10px] text-slate-400 mb-1 font-medium">{settings.branding?.title || 'AI Assistant'}</div>
                                <div className="bg-slate-100 px-3 py-2 rounded-2xl rounded-tl-md text-[13px] text-slate-700 leading-relaxed inline-block">
                                  {settings.messages?.welcomeMessage || 'Hej! 👋 Hvordan kan jeg hjælpe dig i dag?'}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 ml-1">Nu</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {messages.map((message) => (
                              <div key={message.id} className={`flex gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                                {message.sender === 'assistant' && (
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden"
                                    style={{ backgroundColor: themeColor }}
                                  >
                                    {settings.branding?.avatarUrl ? (
                                      <img src={settings.branding.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-white text-[10px] font-semibold">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                                    )}
                                  </div>
                                )}
                                <div className={`flex-1 ${message.sender === 'user' ? 'text-right' : ''}`}>
                                  {message.sender === 'assistant' && (
                                    <div className="text-[10px] text-slate-400 mb-1 font-medium">{settings.branding?.title || 'AI Assistant'}</div>
                                  )}
                                  <div
                                    className={`inline-block px-3 py-2 rounded-2xl text-[13px] leading-relaxed max-w-[85%] ${
                                      message.sender === 'user'
                                        ? 'rounded-br-md text-white'
                                        : 'rounded-tl-md bg-slate-100 text-slate-700'
                                    }`}
                                    style={message.sender === 'user' ? { backgroundColor: themeColor } : {}}
                                  >
                                    {message.text}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {isTyping && (
                              <div className="flex gap-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: themeColor }}>
                                  <span className="text-white text-[10px] font-semibold">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                                </div>
                                <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-md">
                                  <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quick Responses */}
                      {messages.length === 0 && settings.messages?.suggestedResponses?.length > 0 && (
                        <div className="px-3 py-2 flex flex-wrap gap-1.5 justify-end bg-white border-t border-slate-100">
                          {settings.messages.suggestedResponses.filter(r => r.trim()).slice(0, 3).map((response, i) => (
                            <button
                              key={i}
                              onClick={() => handleSuggestedResponse(response)}
                              className="px-2.5 py-1.5 text-[11px] rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                              style={{ minHeight: '44px' }}
                            >
                              {response.length > 25 ? response.slice(0, 25) + '...' : response}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Input Area - Mobile optimized */}
                      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                        <div className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1 border border-slate-200">
                          {settings.messages?.voiceInput?.enabled !== false && (
                            <button className="text-slate-400 hover:text-slate-600 transition-colors p-1" style={{ minWidth: '44px', minHeight: '44px' }}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                              </svg>
                            </button>
                          )}
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={settings.messages?.inputPlaceholder || 'Skriv en besked...'}
                            className="flex-1 bg-transparent text-[16px] outline-none text-slate-700 placeholder:text-slate-400 py-2"
                            style={{ minHeight: '44px' }}
                          />
                          <button
                            onClick={handleSendMessage}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-105"
                            style={{ backgroundColor: themeColor, minWidth: '44px', minHeight: '44px' }}
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                      {/* Powered By - Matching widget-embed */}
                      <a 
                        href="https://elva-solutions.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-5 pb-2 text-[11px] opacity-60 hover:opacity-80 transition-opacity no-underline"
                        style={{ color: themeColors.textColor }}
                      >
                        <img 
                          src="https://www.elva-agents.com/images/elva-logo-icon-grey.svg" 
                          alt="Elva Solutions" 
                          className="w-4 h-4 opacity-80"
                        />
                        <span>
                          {settings.branding?.poweredByText || 'Drevet af'}{' '}
                          <span className="opacity-80 italic">elva-solutions.com</span>
                        </span>
                      </a>
                    </div>

                    {/* Floating Button - Only visible when chat is closed */}
                    <div
                      className={`absolute bottom-6 right-4 cursor-pointer transition-all duration-300 ${!isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: useGradient ? `linear-gradient(135deg, ${themeColor} 0%, ${secondaryColor} 100%)` : themeColor,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                      }}
                      onClick={() => setIsOpen(true)}
                    >
                      <MessageCircle className="text-white" size={24} />
                    </div>

                    {/* Home Indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/20 rounded-full z-30" />
                  </div>
                </div>
              </div>
              
              {/* Side Buttons */}
              <div className="absolute left-0 top-32 w-[3px] h-8 bg-slate-700 rounded-l-full" />
              <div className="absolute left-0 top-44 w-[3px] h-16 bg-slate-700 rounded-l-full" />
              <div className="absolute left-0 top-64 w-[3px] h-16 bg-slate-700 rounded-l-full" />
              <div className="absolute right-0 top-44 w-[3px] h-20 bg-slate-700 rounded-r-full" />
            </div>
          ) : (
            /* Desktop Browser Frame */
            <div className="w-full h-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
              {/* Browser Chrome */}
              <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400 hover:bg-rose-500 transition-colors cursor-pointer" />
                  <div className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 transition-colors cursor-pointer" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-pointer" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1 w-96 shadow-sm">
                    <svg className="w-3.5 h-3.5 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs text-slate-500">example-shop.com</span>
                  </div>
                </div>
                <div className="w-20" />
              </div>

              {/* Browser Content */}
              <div className="flex-1 relative overflow-hidden">
                {/* Website Background */}
                {showWebsiteBackground && (
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white overflow-y-auto">
                    {/* Nav */}
                    <div className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8">
                      <div className="flex items-center gap-8">
                        <div className="w-32 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg" />
                        <div className="flex gap-6">
                          {['Produkter', 'Priser', 'Om os', 'Kontakt'].map(item => (
                            <span key={item} className="text-sm text-slate-600 hover:text-slate-900 cursor-pointer">{item}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-64 h-9 bg-slate-100 rounded-full flex items-center px-4">
                          <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span className="text-sm text-slate-400">Søg produkter...</span>
                        </div>
                        <div className="w-9 h-9 bg-slate-100 rounded-full" />
                      </div>
                    </div>

                    {/* Hero (no background image) */}
                    <div className="h-80 bg-gradient-to-br from-slate-100 via-slate-50 to-white flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-40">
                        <div className="absolute top-10 left-20 w-40 h-40 bg-blue-200 rounded-full blur-3xl" />
                        <div className="absolute bottom-10 right-20 w-60 h-60 bg-purple-200 rounded-full blur-3xl" />
                      </div>
                      <div className="text-center relative z-10">
                        <div className="text-4xl font-bold text-slate-800 mb-4">Velkommen til vores shop</div>
                        <div className="text-lg text-slate-600 mb-6">Find de bedste produkter til de bedste priser</div>
                        <div className="flex gap-3 justify-center">
                          <div className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-lg">Se produkter</div>
                          <div className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium shadow">Læs mere</div>
                        </div>
                      </div>
                    </div>

                    {/* Products Grid with actual images */}
                    <div className="max-w-6xl mx-auto px-8 py-12">
                      <div className="text-2xl font-bold text-slate-800 mb-8">Populære produkter</div>
                      <div className="grid grid-cols-4 gap-6">
                        {[
                          { img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop', name: 'Premium Smartwatch', desc: 'Fitness tracker med GPS', price: '1.299 kr' },
                          { img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop', name: 'Trådløse Høretelefoner', desc: 'Noise cancelling', price: '899 kr' },
                          { img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop', name: 'Designer Solbriller', desc: 'UV-beskyttelse', price: '549 kr' },
                          { img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', name: 'Sport Sneakers', desc: 'Ekstra komfort', price: '1.199 kr' }
                        ].map((product, i) => (
                          <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                            <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
                              <img src={product.img} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="p-4">
                              <div className="text-sm font-semibold text-slate-800 mb-1">{product.name}</div>
                              <div className="text-xs text-slate-500 mb-3">{product.desc}</div>
                              <div className="flex justify-between items-center">
                                <div className="text-base font-bold text-blue-600">{product.price}</div>
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Widget Container */}
                <div className="absolute bottom-6 right-6 flex flex-col items-end gap-4 z-10">
                  {/* Popup Message */}
                  {showPopup && settings.messages?.popupMessage && !isOpen && (
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                      <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-100 max-w-[280px] relative">
                        <button 
                          onClick={() => setShowPopup(false)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-slate-400 hover:text-slate-600"
                        >
                          <X size={12} />
                        </button>
                        <p className="text-sm text-slate-700">{settings.messages.popupMessage}</p>
                        <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-slate-100 transform rotate-45" />
                      </div>
                    </div>
                  )}

                  {/* Chat Widget */}
                  <div
                    className={`transition-all duration-500 ease-out transform ${
                      isOpen 
                        ? 'opacity-100 scale-100 translate-y-0' 
                        : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
                    }`}
                    style={{
                      ...getWidgetStyles(),
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header */}
                    <div
                      className="flex items-center justify-between p-4 text-white relative shrink-0"
                      style={{
                        background: useGradient 
                          ? `linear-gradient(135deg, ${themeColor} 0%, ${secondaryColor} 100%)` 
                          : themeColor,
                        borderRadius: `${settings.appearance?.borderRadius || 20}px ${settings.appearance?.borderRadius || 20}px 0 0`
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden"
                          style={{
                            width: `${settings.branding?.iconSizes?.headerAvatar || 40}px`,
                            height: `${settings.branding?.iconSizes?.headerAvatar || 40}px`
                          }}
                        >
                          {settings.branding?.avatarUrl ? (
                            <img src={settings.branding.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-base">
                            {settings.branding?.title || 'AI Assistant'}
                          </div>
                          <div className="text-xs opacity-90 flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            {settings.branding?.availableNowText || 'Tilgængelig nu'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          className="text-white/80 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
                          onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="6" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="18" r="2" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setIsOpen(false)}
                          className="text-white/80 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Dropdown */}
                      {showMenuDropdown && (
                        <div className="absolute top-full right-2 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 min-w-48 z-50 overflow-hidden">
                          <button
                            className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                            onClick={() => { setMessages([]); setShowMenuDropdown(false); }}
                          >
                            <RefreshCw size={16} />
                            {settings.messages?.newConversationLabel || 'Ny samtale'}
                          </button>
                          <button
                            className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                            onClick={() => { setShowConversationHistory(true); setShowMenuDropdown(false); }}
                          >
                            <MessageCircle size={16} />
                            {settings.messages?.conversationHistoryLabel || 'Tidligere samtaler'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Banner - Matching widget-embed */}
                    {settings.messages?.bannerText && (
                      <div className="px-4 py-2 text-xs text-center bg-slate-50 text-slate-500 border-b border-slate-100 opacity-80">
                        {settings.messages.bannerText}
                      </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4" style={{ backgroundColor: themeColors.chatBg }}>
                      {messages.length === 0 ? (
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden"
                              style={{ backgroundColor: themeColor }}
                            >
                              {settings.branding?.avatarUrl ? (
                                <img src={settings.branding.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-white text-xs font-semibold">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-slate-400 mb-1.5 font-medium">{settings.branding?.title || 'AI Assistant'}</div>
                              <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-md text-sm text-slate-700 leading-relaxed inline-block">
                                {settings.messages?.welcomeMessage || 'Hej! 👋 Hvordan kan jeg hjælpe dig i dag?'}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1.5 ml-1">Nu</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                              {message.sender === 'assistant' && (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden"
                                  style={{ backgroundColor: themeColor }}
                                >
                                  {settings.branding?.avatarUrl ? (
                                    <img src={settings.branding.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-white text-xs font-semibold">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                                  )}
                                </div>
                              )}
                              <div className={`flex-1 ${message.sender === 'user' ? 'text-right' : ''}`}>
                                {message.sender === 'assistant' && (
                                  <div className="text-xs text-slate-400 mb-1.5 font-medium">{settings.branding?.title || 'AI Assistant'}</div>
                                )}
                                <div
                                  className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
                                    message.sender === 'user'
                                      ? 'rounded-br-md text-white'
                                      : 'rounded-tl-md bg-slate-100 text-slate-700'
                                  }`}
                                  style={message.sender === 'user' ? { backgroundColor: themeColor } : {}}
                                >
                                  {message.text}
                                </div>
                              </div>
                            </div>
                          ))}
                          {isTyping && (
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: themeColor }}>
                                <span className="text-white text-xs font-semibold">{generateAIIcon(widget?.name, settings.branding?.title)}</span>
                              </div>
                              <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-md">
                                <div className="flex gap-1.5">
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Responses */}
                    {messages.length === 0 && settings.messages?.suggestedResponses?.length > 0 && (
                      <div className="px-4 py-3 flex flex-wrap gap-2 justify-end bg-white border-t border-slate-100">
                        {settings.messages.suggestedResponses.filter(r => r.trim()).map((response, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestedResponse(response)}
                            className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                          >
                            {response}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-slate-100" style={{ borderRadius: `0 0 ${settings.appearance?.borderRadius || 20}px ${settings.appearance?.borderRadius || 20}px` }}>
                      <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-1 border border-slate-200 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
                        {settings.messages?.voiceInput?.enabled !== false && (
                          <button className="text-slate-400 hover:text-slate-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </button>
                        )}
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={settings.messages?.inputPlaceholder || 'Skriv en besked...'}
                          className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400 py-2.5"
                        />
                        <button
                          onClick={handleSendMessage}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 hover:shadow-lg"
                          style={{ backgroundColor: themeColor }}
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                    {/* Powered By - Matching widget-embed */}
                    <a 
                      href="https://elva-solutions.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-5 pb-2 text-[11px] opacity-60 hover:opacity-80 transition-opacity no-underline"
                      style={{ color: themeColors.textColor }}
                    >
                      <img 
                        src="https://www.elva-agents.com/images/elva-logo-icon-grey.svg" 
                        alt="Elva Solutions" 
                        className="w-4 h-4 opacity-80"
                      />
                      <span>
                        {settings.branding?.poweredByText || 'Drevet af'}{' '}
                        <span className="opacity-80 italic">elva-solutions.com</span>
                      </span>
                    </a>
                  </div>

                  {/* Floating Button */}
                  <div
                    className={`cursor-pointer transition-all duration-300 hover:scale-110 ${!isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
                    style={{
                      width: `${settings.branding?.iconSizes?.chatButton || 60}px`,
                      height: `${settings.branding?.iconSizes?.chatButton || 60}px`,
                      borderRadius: '50%',
                      background: useGradient ? `linear-gradient(135deg, ${themeColor} 0%, ${secondaryColor} 100%)` : themeColor,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => setIsOpen(true)}
                  >
                    <MessageCircle className="text-white" size={26} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-slate-400">
        <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">⌘</kbd>
        <span>+</span>
        <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">scroll</kbd>
        <span className="ml-1">for at zoome</span>
      </div>
    </div>
  );
}

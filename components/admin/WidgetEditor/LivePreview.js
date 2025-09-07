import { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

export default function LivePreview({ widget, settings }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const [deviceView, setDeviceView] = useState('desktop'); // 'desktop', 'mobile'

  // Show popup message when widget is closed
  useEffect(() => {
    if (!isOpen && settings.messages?.popupMessage) {
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [isOpen, settings.messages?.popupMessage]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: 'Tak for dit spørgsmål! Dette er en preview af svaret.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedResponse = (response) => {
    const newMessage = {
      id: Date.now(),
      text: response,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages([newMessage]);
    setIsTyping(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: 'Tak for dit spørgsmål! Dette er en preview af svaret.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getPlacementStyles = () => {
    const placement = settings.appearance?.placement || 'bottom-right';
    switch (placement) {
      case 'bottom-right':
        return { bottom: '-10px', right: '20px' };
      case 'bottom-left':
        return { bottom: '-10px', left: '20px' };
      case 'top-right':
        return { top: '-10px', right: '20px' };
      case 'top-left':
        return { top: '-10px', left: '20px' };
      default:
        return { bottom: '-10px', right: '20px' };
    }
  };

  const getWidgetStyles = () => {
    const baseWidth = settings.appearance?.width || 450;
    const baseHeight = settings.appearance?.height || 600;
    
    // Adjust dimensions for mobile view
    const width = deviceView === 'mobile' 
      ? Math.min(baseWidth, 320) 
      : baseWidth;
    const height = deviceView === 'mobile' 
      ? Math.min(baseHeight, 500) 
      : baseHeight;

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
      height: '900px', // Fixed height for desktop view
      minHeight: '800px',
      position: 'relative'
    };
  };

  return (
    <div className="relative h-full">
      {/* Device View Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Preview:</span>
          <button
            onClick={() => setDeviceView('desktop')}
            className={`p-2 rounded-lg transition-colors ${
              deviceView === 'desktop' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ComputerDesktopIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDeviceView('mobile')}
            className={`p-2 rounded-lg transition-colors ${
              deviceView === 'mobile' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DevicePhoneMobileIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setMessages([]);
              setInputValue('');
              setIsTyping(false);
            }}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Clear chat"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div 
        className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 rounded-lg p-4 overflow-hidden relative"
        style={getDeviceStyles()}
      >
        <div className="text-sm text-gray-300 mb-4 text-center">
          {deviceView === 'mobile' ? 'Mobile Preview' : 'Desktop Preview'} - Click the chat button to test
        </div>
        
        {/* Widget Preview */}
        <div className="relative" style={{ height: 'calc(100% - 80px)' }}>
          {/* Chat Widget */}
          <div 
            className={`absolute transition-all duration-500 ease-out transform ${
              isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
            }`}
            style={getWidgetStyles()}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 rounded-t-lg text-white relative overflow-hidden"
              style={{ 
                backgroundColor: useGradient ? 'transparent' : themeColor,
                background: useGradient ? `linear-gradient(135deg, ${themeColor} 0%, ${secondaryColor} 100%)` : themeColor
              }}
            >
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12"></div>
              </div>
              
              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">
                    {settings.branding?.title || 'Elva AI kundeservice Agent'}
                  </div>
                  <div className="text-xs opacity-90">
                    {settings.branding?.assistantName || 'AI Assistant'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 relative z-10">
                <button className="text-white hover:text-gray-200 transition-colors duration-200 p-2 rounded-full hover:bg-white/10">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors duration-200 p-2 rounded-full hover:bg-white/10"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4" style={{ height: 'calc(100% - 200px)' }}>
              {messages.length === 0 ? (
                <div className="space-y-4">
                  {/* Welcome Message Bubble */}
                  <div className="flex justify-start animate-fade-in">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-white text-sm font-semibold">E</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="text-xs text-gray-500 mb-2 font-medium">Elva Kundeservice</div>
                        <div className="bg-gray-50 text-gray-800 px-4 py-3 rounded-2xl text-sm max-w-xs shadow-sm border border-gray-100">
                          {settings.messages?.welcomeMessage || 'Hej! 👋 Jeg er Elva og jeg er en virtuel kundeservice agent for Elva Solutions. Du kan spørge mig om hvad som helst.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {message.sender === 'assistant' ? (
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-white text-sm font-semibold">E</span>
                          </div>
                          <div className="flex flex-col">
                            <div className="text-xs text-gray-500 mb-2 font-medium">Elva Kundeservice</div>
                            <div className="bg-gray-50 text-gray-800 px-4 py-3 rounded-2xl text-sm max-w-xs shadow-sm border border-gray-100">
                              {message.text}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-500 text-white px-4 py-3 rounded-2xl text-sm max-w-xs shadow-sm">
                          {message.text}
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start animate-pulse">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                          <span className="text-white text-sm font-semibold">E</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="text-xs text-gray-500 mb-2 font-medium">Elva Kundeservice</div>
                          <div className="bg-gray-50 text-gray-800 px-4 py-3 rounded-2xl text-sm shadow-sm border border-gray-100">
                            {settings.messages?.typingText || 'AI tænker...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100 bg-white rounded-b-lg">
              {/* Suggested Responses - Above input field */}
              {messages.length === 0 && settings.messages?.suggestedResponses?.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {settings.messages.suggestedResponses
                      .filter(response => response.trim())
                      .map((response, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedResponse(response)}
                          className="inline-flex items-center px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-all duration-200 border border-gray-200 hover:border-gray-300"
                        >
                          {response}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={settings.messages?.inputPlaceholder || 'Skriv en besked her'}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-3 rounded-xl text-white text-sm font-medium transition-all duration-200 flex items-center shadow-sm hover:shadow-md transform hover:scale-105"
                  style={{ 
                    backgroundColor: useGradient ? 'transparent' : secondaryColor,
                    background: useGradient ? `linear-gradient(135deg, ${secondaryColor} 0%, ${themeColor} 100%)` : secondaryColor
                  }}
                >
                  <PaperAirplaneIcon className="w-4 h-4 mr-1" />
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Popup Message (when widget is closed) */}
          {showPopup && settings.messages?.popupMessage && (
            <div 
              className="absolute transition-all duration-500 ease-out transform animate-bounce-in"
              style={{
                ...getPlacementStyles(),
                bottom: '65px',
                right: '25px',
                zIndex: 10
              }}
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-w-xs backdrop-blur-sm">
                <div className="flex items-start justify-between">
                  <div className="text-sm text-gray-800 pr-4 leading-relaxed">
                    {settings.messages.popupMessage}
                  </div>
                  <button
                    onClick={() => setShowPopup(false)}
                    className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-blue-600 transition-all duration-200 flex-shrink-0 shadow-sm hover:shadow-md transform hover:scale-110"
                  >
                    ×
                  </button>
                </div>
                {/* Speech bubble tail */}
                <div 
                  className="absolute w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45 shadow-sm"
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
            className={`absolute cursor-pointer transition-all duration-500 ease-out transform hover:scale-110 ${
              !isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
            }`}
            style={{
              ...getPlacementStyles(),
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: useGradient ? `linear-gradient(135deg, ${themeColor} 0%, ${secondaryColor} 100%)` : themeColor,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)'
            }}
            onClick={() => {
              setIsOpen(true);
              setShowPopup(false);
            }}
          >
            <div className="flex items-center justify-center h-full">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
            </div>
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

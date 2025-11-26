"use client"

import { useState } from 'react';
import {
  Palette,
  MessageCircle,
  Building2,
  Settings,
  Code,
  Info,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Maximize2,
  ZoomIn,
  Star,
  ClipboardList,
  ShieldCheck,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import ColorPicker from './ColorPicker';
import FileUpload from './FileUpload';
import AdvancedSettings from './AdvancedSettings';
import ImageZoomModal from './ImageZoomModal';

// Default enabled languages
const defaultEnabledLanguages = ['da', 'en', 'de', 'sv', 'no'];

// Support Request Labels by Language
const supportRequestLabels = {
  'da': {
    emailSupportButtonText: '📧 Email Support',
    attachmentNoticeText: 'Samtalen vedhæftes: Din nuværende samtale med AI\'en vil automatisk blive vedhæftet til denne anmodning.',
    nameLabel: 'Dit navn (valgfri)',
    namePlaceholder: 'Skriv dit navn her',
    emailLabel: 'Din email',
    emailPlaceholder: 'Skriv din email her',
    messageLabel: 'Efterlad en besked (valgfri)',
    messagePlaceholder: 'Skriv din besked her',
    liveChatButtonText: '💬 Live Chat',
    liveChatNoticeText: 'Live Chat: En agent vil tage over samtalen og chatte med dig i real-time.',
    liveChatReasonLabel: 'Hvorfor har du brug for live chat? (valgfri)',
    liveChatReasonPlaceholder: 'Forklar hvorfor du gerne vil tale med en person...',
    cancelButtonText: 'Annuller',
    submitButtonText: 'Send anmodning'
  },
  'en': {
    emailSupportButtonText: '📧 Email Support',
    attachmentNoticeText: 'Conversation attached: Your current conversation with the AI will automatically be attached to this request.',
    nameLabel: 'Your name (optional)',
    namePlaceholder: 'Enter your name',
    emailLabel: 'Your email',
    emailPlaceholder: 'Enter your email',
    messageLabel: 'Leave a message (optional)',
    messagePlaceholder: 'Type your message here',
    liveChatButtonText: '💬 Live Chat',
    liveChatNoticeText: 'Live Chat: An agent will take over the conversation and chat with you in real-time.',
    liveChatReasonLabel: 'Why do you need live chat? (optional)',
    liveChatReasonPlaceholder: 'Explain why you would like to speak with a person...',
    cancelButtonText: 'Cancel',
    submitButtonText: 'Send request'
  },
  'de': {
    emailSupportButtonText: '📧 E-Mail-Support',
    attachmentNoticeText: 'Unterhaltung angehängt: Ihre aktuelle Unterhaltung mit der KI wird automatisch an diese Anfrage angehängt.',
    nameLabel: 'Ihr Name (optional)',
    namePlaceholder: 'Geben Sie Ihren Namen ein',
    emailLabel: 'Ihre E-Mail',
    emailPlaceholder: 'Geben Sie Ihre E-Mail ein',
    messageLabel: 'Nachricht hinterlassen (optional)',
    messagePlaceholder: 'Geben Sie hier Ihre Nachricht ein',
    liveChatButtonText: '💬 Live-Chat',
    liveChatNoticeText: 'Live-Chat: Ein Agent übernimmt die Unterhaltung und chattet mit Ihnen in Echtzeit.',
    liveChatReasonLabel: 'Warum benötigen Sie einen Live-Chat? (optional)',
    liveChatReasonPlaceholder: 'Erklären Sie, warum Sie gerne mit einer Person sprechen möchten...',
    cancelButtonText: 'Abbrechen',
    submitButtonText: 'Anfrage senden'
  },
  'sv': {
    emailSupportButtonText: '📧 E-post Support',
    attachmentNoticeText: 'Konversation bifogad: Din nuvarande konversation med AI:n kommer automatiskt att bifogas till denna förfrågan.',
    nameLabel: 'Ditt namn (valfritt)',
    namePlaceholder: 'Skriv ditt namn',
    emailLabel: 'Din e-post',
    emailPlaceholder: 'Skriv din e-post',
    messageLabel: 'Lämna ett meddelande (valfritt)',
    messagePlaceholder: 'Skriv ditt meddelande här',
    liveChatButtonText: '💬 Live Chat',
    liveChatNoticeText: 'Live Chat: En agent kommer att ta över konversationen och chatta med dig i realtid.',
    liveChatReasonLabel: 'Varför behöver du live chat? (valfritt)',
    liveChatReasonPlaceholder: 'Förklara varför du vill prata med en person...',
    cancelButtonText: 'Avbryt',
    submitButtonText: 'Skicka förfrågan'
  },
  'no': {
    emailSupportButtonText: '📧 E-post Support',
    attachmentNoticeText: 'Samtale vedlagt: Din nåværende samtale med AI-en vil automatisk bli vedlagt til denne forespørselen.',
    nameLabel: 'Ditt navn (valgfritt)',
    namePlaceholder: 'Skriv ditt navn',
    emailLabel: 'Din e-post',
    emailPlaceholder: 'Skriv din e-post',
    messageLabel: 'Legg igjen en melding (valgfritt)',
    messagePlaceholder: 'Skriv meldingen din her',
    liveChatButtonText: '💬 Live Chat',
    liveChatNoticeText: 'Live Chat: En agent vil ta over samtalen og chatte med deg i sanntid.',
    liveChatReasonLabel: 'Hvorfor trenger du live chat? (valgfritt)',
    liveChatReasonPlaceholder: 'Forklar hvorfor du gjerne vil snakke med en person...',
    cancelButtonText: 'Avbryt',
    submitButtonText: 'Send forespørsel'
  }
};

const defaultLanguagePacks = {
  'da': {
    welcomeMessage: 'Hej! Hvordan kan jeg hjælpe dig i dag?',
    popupMessage: 'Hej! Har du brug for hjælp?',
    typingText: 'AI tænker...',
    inputPlaceholder: 'Skriv din besked...',
    bannerText: 'Velkommen til vores kundeservice chat!',
    suggestedResponses: [
      'Hvad kan du hjælpe mig med?',
      'Fortæl mig mere om jeres services',
      'Hvordan kommer jeg i gang?',
      'Kontakt support'
    ],
    newConversationLabel: 'Ny samtale',
    conversationHistoryLabel: 'Samtalehistorik',
    conversationLoadedLabel: 'Samtale indlæst',
    todayLabel: 'I dag',
    yesterdayLabel: 'I går',
    daysAgoSuffix: 'd',
    messagesLabel: 'beskeder',
    noConversationsLabel: 'Ingen tidligere samtaler',
    startConversationLabel: 'Start en samtale for at se den her',
    conversationDeletedLabel: 'Samtale slettet',
    newConversationStartedLabel: 'Ny samtale startet',
    disclaimerText: 'Opgiv ikke personlige oplysninger'
  },
  'en': {
    welcomeMessage: 'Hello! How can I help you today?',
    popupMessage: 'Hi! Need help?',
    typingText: 'AI is thinking...',
    inputPlaceholder: 'Type your message...',
    bannerText: 'Welcome to our customer service chat!',
    suggestedResponses: [
      'What can you help me with?',
      'Tell me more about your services',
      'How do I get started?',
      'Contact support'
    ],
    newConversationLabel: 'New conversation',
    conversationHistoryLabel: 'Conversation history',
    conversationLoadedLabel: 'Conversation loaded',
    todayLabel: 'Today',
    yesterdayLabel: 'Yesterday',
    daysAgoSuffix: 'd',
    messagesLabel: 'messages',
    noConversationsLabel: 'No previous conversations',
    startConversationLabel: 'Start a conversation to see it here',
    conversationDeletedLabel: 'Conversation deleted',
    newConversationStartedLabel: 'New conversation started',
    disclaimerText: 'Do not share personal information'
  },
  'de': {
    welcomeMessage: 'Hallo! Wie kann ich Ihnen heute helfen?',
    popupMessage: 'Hallo! Brauchen Sie Hilfe?',
    typingText: 'KI denkt nach...',
    inputPlaceholder: 'Schreiben Sie Ihre Nachricht...',
    bannerText: 'Willkommen in unserem Kundenservice-Chat!',
    suggestedResponses: [
      'Womit können Sie mir helfen?',
      'Erzählen Sie mir mehr über Ihre Dienstleistungen',
      'Wie fange ich an?',
      'Kontaktieren Sie den Support'
    ],
    newConversationLabel: 'Neues Gespräch',
    conversationHistoryLabel: 'Gesprächsverlauf',
    conversationLoadedLabel: 'Gespräch geladen',
    todayLabel: 'Heute',
    yesterdayLabel: 'Gestern',
    daysAgoSuffix: 'd',
    messagesLabel: 'Nachrichten',
    noConversationsLabel: 'Keine früheren Gespräche',
    startConversationLabel: 'Starten Sie ein Gespräch, um es hier zu sehen',
    conversationDeletedLabel: 'Gespräch gelöscht',
    newConversationStartedLabel: 'Neues Gespräch gestartet',
    disclaimerText: 'Geben Sie keine persönlichen Informationen preis'
  },
  'sv': {
    welcomeMessage: 'Hej! Hur kan jag hjälpa dig idag?',
    popupMessage: 'Hej! Behöver du hjälp?',
    typingText: 'AI tänker...',
    inputPlaceholder: 'Skriv ditt meddelande...',
    bannerText: 'Välkommen till vår kundservicechatt!',
    suggestedResponses: [
      'Vad kan du hjälpa mig med?',
      'Berätta mer om era tjänster',
      'Hur kommer jag igång?',
      'Kontakta support'
    ],
    newConversationLabel: 'Nytt samtal',
    conversationHistoryLabel: 'Samtalshistorik',
    conversationLoadedLabel: 'Samtal laddat',
    todayLabel: 'Idag',
    yesterdayLabel: 'Igår',
    daysAgoSuffix: 'd',
    messagesLabel: 'meddelanden',
    noConversationsLabel: 'Inga tidigare samtal',
    startConversationLabel: 'Starta ett samtal för att se det här',
    conversationDeletedLabel: 'Samtal raderat',
    newConversationStartedLabel: 'Nytt samtal startat',
    disclaimerText: 'Dela inte personlig information'
  },
  'no': {
    welcomeMessage: 'Hei! Hvordan kan jeg hjelpe deg i dag?',
    popupMessage: 'Hei! Trenger du hjelp?',
    typingText: 'AI tenker...',
    inputPlaceholder: 'Skriv meldingen din...',
    bannerText: 'Velkommen til vår kundeservicechat!',
    suggestedResponses: [
      'Hva kan du hjelpe meg med?',
      'Fortell meg mer om tjenestene deres',
      'Hvordan kommer jeg i gang?',
      'Kontakt support'
    ],
    newConversationLabel: 'Ny samtale',
    conversationHistoryLabel: 'Samtalehistorikk',
    conversationLoadedLabel: 'Samtale lastet',
    todayLabel: 'I dag',
    yesterdayLabel: 'I går',
    daysAgoSuffix: 'd',
    messagesLabel: 'meldinger',
    noConversationsLabel: 'Ingen tidligere samtaler',
    startConversationLabel: 'Start en samtale for å se den her',
    conversationDeletedLabel: 'Samtale slettet',
    newConversationStartedLabel: 'Ny samtale startet',
    disclaimerText: 'Ikke del personlig informasjon'
  }
};

export default function SettingsPanel({ settings, onChange, onSave, saving }) {
  const [validationErrors, setValidationErrors] = useState({});
  const [isImageZoomModalOpen, setIsImageZoomModalOpen] = useState(false);

  const getLanguagePackValue = (langCode, field) => {
    // Først tjek brugerdefinerede værdier, derefter default værdier
    return settings.messages?.languagePacks?.[langCode]?.[field] ??
      defaultLanguagePacks[langCode]?.[field] ??
      '';
  };

  const updateSetting = (section, key, value) => {
    // Clear validation error when user makes changes
    if (validationErrors[`${section}.${key}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${section}.${key}`];
        return newErrors;
      });
    }

    onChange({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    });
  };

  const validateField = (section, key, value) => {
    const fieldId = `${section}.${key}`;

    // Basic validation rules
    if (key === 'width' && (value < 300 || value > 800)) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldId]: 'Width must be between 300 and 800 pixels'
      }));
      return false;
    }

    if (key === 'height' && (value < 400 || value > 800)) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldId]: 'Height must be between 400 and 800 pixels'
      }));
      return false;
    }

    if (key === 'borderRadius' && (value < 0 || value > 50)) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldId]: 'Border radius must be between 0 and 50 pixels'
      }));
      return false;
    }

    if (key === 'popupDelay' && (value < 0 || value > 30000)) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldId]: 'Popup delay must be between 0 and 30000 milliseconds'
      }));
      return false;
    }

    return true;
  };

  const handleFieldChange = (section, key, value) => {
    validateField(section, key, value);
    updateSetting(section, key, value);
  };

  return (
    <div className="h-full bg-white dark:bg-[#111]">
      <Accordion type="single" collapsible defaultValue="appearance" className="divide-y divide-slate-100 dark:divide-slate-800">
          <AccordionItem value="appearance" className="border-0">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Palette className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Appearance</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              {/* Appearance Settings */}
              <div className="space-y-5">
                {/* Color Settings */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Theme Color</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 uppercase">{settings.appearance?.themeColor || '#3b82f6'}</span>
                      <div className="relative overflow-hidden w-8 h-8 rounded-full shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 cursor-pointer hover:scale-105 transition-transform">
                        <div 
                          className="absolute inset-0"
                          style={{ backgroundColor: settings.appearance?.themeColor || '#3b82f6' }}
                        />
                        <input
                          id="themeColor"
                          type="color"
                          value={settings.appearance?.themeColor || '#3b82f6'}
                          onChange={(e) => handleFieldChange('appearance', 'themeColor', e.target.value)}
                          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Theme Mode */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Widget Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'light', label: 'Light', icon: '☀️' },
                      { value: 'dark', label: 'Dark', icon: '🌙' },
                      { value: 'auto', label: 'Auto', icon: '🔄' }
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => handleFieldChange('appearance', 'theme', theme.value)}
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          settings.appearance?.theme === theme.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-lg mb-1">{theme.icon}</div>
                          <div className="text-xs font-medium">{theme.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Effects */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Visual Effects
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2.5 px-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Use Gradient Colors</span>
                      <Switch
                        checked={settings.appearance?.useGradient !== false}
                        onCheckedChange={(checked) => handleFieldChange('appearance', 'useGradient', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2.5 px-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Backdrop Blur Effect</span>
                      <Switch
                        checked={settings.appearance?.backdropBlur || false}
                        onCheckedChange={(checked) => handleFieldChange('appearance', 'backdropBlur', checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Dimensions */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Dimensions & Layout
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Width (px)</label>
                      <Input
                        type="number"
                        value={settings.appearance?.width || 450}
                        onChange={(e) => handleFieldChange('appearance', 'width', parseInt(e.target.value))}
                        className={`w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${validationErrors['appearance.width'] ? 'border-red-300 dark:border-red-600' : ''}`}
                        min="300"
                        max="800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Height (px)</label>
                      <Input
                        type="number"
                        value={settings.appearance?.height || 600}
                        onChange={(e) => handleFieldChange('appearance', 'height', parseInt(e.target.value))}
                        className={`w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${validationErrors['appearance.height'] ? 'border-red-300 dark:border-red-600' : ''}`}
                        min="400"
                        max="800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Border Radius</label>
                      <Input
                        type="number"
                        value={settings.appearance?.borderRadius || 20}
                        onChange={(e) => handleFieldChange('appearance', 'borderRadius', parseInt(e.target.value))}
                        className={`w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${validationErrors['appearance.borderRadius'] ? 'border-red-300 dark:border-red-600' : ''}`}
                        min="0"
                        max="50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Placement</label>
                      <select
                        value={settings.appearance?.placement || 'bottom-right'}
                        onChange={(e) => handleFieldChange('appearance', 'placement', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 dark:text-slate-200"
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="top-left">Top Left</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Custom CSS */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Custom CSS
                  </label>
                  <Textarea
                    value={settings.appearance?.customCSS || ''}
                    onChange={(e) => handleFieldChange('appearance', 'customCSS', e.target.value)}
                    rows={4}
                    className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    placeholder="/* Add custom CSS here */&#10;.widget-container { }"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Use classes like <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">.widget-container</code> to target elements.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="messages" className="border-0">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Messages & Texts</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              {/* Message Settings */}
              <div className="space-y-5">
                {/* Welcome Message */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Welcome Message
                  </label>
                  <Textarea
                    value={settings.messages?.welcomeMessage || ''}
                    onChange={(e) => handleFieldChange('messages', 'welcomeMessage', e.target.value)}
                    rows={3}
                    className="w-full text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    placeholder="Hej! 😊 Hvordan kan jeg hjælpe dig i dag?"
                  />
                  <p className="text-[10px] text-slate-400">This message appears when users first open the chat</p>
                </div>

                {/* Input Placeholder */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Input Placeholder
                  </label>
                  <Input
                    type="text"
                    value={settings.messages?.inputPlaceholder || ''}
                    onChange={(e) => handleFieldChange('messages', 'inputPlaceholder', e.target.value)}
                    className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Skriv din besked her..."
                  />
                </div>

                {/* Banner Text */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Banner Text
                  </label>
                  <Input
                    type="text"
                    value={settings.messages?.bannerText || ''}
                    onChange={(e) => handleFieldChange('messages', 'bannerText', e.target.value)}
                    className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Velkommen til vores kundeservice chat!"
                  />
                </div>

                {/* Typing Indicator */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Typing Indicator
                  </label>
                  <Input
                    type="text"
                    value={settings.messages?.typingText || ''}
                    onChange={(e) => handleFieldChange('messages', 'typingText', e.target.value)}
                    className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="AI tænker..."
                  />
                  <div className="flex items-center justify-between py-2 px-1">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Show typing text</span>
                    <Switch
                      checked={settings.messages?.showTypingText !== false}
                      onCheckedChange={(checked) => handleFieldChange('messages', 'showTypingText', checked)}
                    />
                  </div>
                </div>

                {/* Popup Settings */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Popup Behavior
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Popup Message</label>
                      <Input
                        type="text"
                        value={settings.messages?.popupMessage || ''}
                        onChange={(e) => handleFieldChange('messages', 'popupMessage', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Hej! 👋 Har du brug for hjælp?"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Disclaimer Text</label>
                      <Input
                        type="text"
                        value={settings.messages?.disclaimerText || ''}
                        onChange={(e) => handleFieldChange('messages', 'disclaimerText', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Opgiv ikke personlige oplysninger"
                      />
                    </div>

                    {/* Custom Language Toggle */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between py-2 px-1">
                        <div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">Custom Language Mode</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">Disable auto-detection</p>
                        </div>
                        <Switch
                          checked={settings.messages?.customLanguage || false}
                          onCheckedChange={(checked) => handleFieldChange('messages', 'customLanguage', checked)}
                        />
                      </div>

                      {/* Enabled Languages Section */}
                      {settings.messages?.customLanguage && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Enabled Languages
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Select which languages should be available for auto-detection.
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                              { code: 'da', name: 'Dansk' },
                              { code: 'en', name: 'English' },
                              { code: 'de', name: 'Deutsch' },
                              { code: 'sv', name: 'Svenska' },
                              { code: 'no', name: 'Norsk' }
                            ].map((lang) => {
                              const enabledLanguages = settings.messages?.enabledLanguages || defaultEnabledLanguages;
                              const isEnabled = enabledLanguages.includes(lang.code);

                              return (
                                <div key={lang.code} className="flex items-center space-x-2">
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                      const currentEnabled = settings.messages?.enabledLanguages || defaultEnabledLanguages;
                                      let newEnabled;

                                      if (checked) {
                                        newEnabled = [...currentEnabled, lang.code];
                                      } else {
                                        newEnabled = currentEnabled.filter(code => code !== lang.code);
                                        // Ensure at least one language is always enabled
                                        if (newEnabled.length === 0) {
                                          newEnabled = ['en'];
                                        }
                                      }

                                      handleFieldChange('messages', 'enabledLanguages', newEnabled);
                                    }}
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {lang.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Language Packs Section */}
                    <div className="border-t pt-6 mt-6">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Language Packs
                      </h5>

                      <div className="space-y-6">
                        {(settings.messages?.enabledLanguages || defaultEnabledLanguages).map((langCode) => {
                          const langNames = {
                            'da': 'Dansk',
                            'en': 'English',
                            'de': 'Deutsch',
                            'sv': 'Svenska',
                            'no': 'Norsk'
                          };

                          return (
                            <details key={langCode} className="bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <summary className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-between">
                                <span>{langNames[langCode]} ({langCode.toUpperCase()})</span>
                                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 details-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="px-4 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Welcome Message
                                    </label>
                                    <Input
                                      type="text"
                                      value={getLanguagePackValue(langCode, 'welcomeMessage')}
                                      onChange={(e) => handleFieldChange('messages', 'languagePacks', {
                                        ...settings.messages?.languagePacks,
                                        [langCode]: {
                                          ...settings.messages?.languagePacks?.[langCode],
                                          welcomeMessage: e.target.value
                                        }
                                      })}
                                      className="block w-full"
                                      placeholder="Welcome message..."
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Input Placeholder
                                    </label>
                                    <Input
                                      type="text"
                                      value={getLanguagePackValue(langCode, 'inputPlaceholder')}
                                      onChange={(e) => handleFieldChange('messages', 'languagePacks', {
                                        ...settings.messages?.languagePacks,
                                        [langCode]: {
                                          ...settings.messages?.languagePacks?.[langCode],
                                          inputPlaceholder: e.target.value
                                        }
                                      })}
                                      className="block w-full"
                                      placeholder="Type your message..."
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Typing Text
                                    </label>
                                    <Input
                                      type="text"
                                      value={getLanguagePackValue(langCode, 'typingText')}
                                      onChange={(e) => handleFieldChange('messages', 'languagePacks', {
                                        ...settings.messages?.languagePacks,
                                        [langCode]: {
                                          ...settings.messages?.languagePacks?.[langCode],
                                          typingText: e.target.value
                                        }
                                      })}
                                      className="block w-full"
                                      placeholder="AI is thinking..."
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Disclaimer Text
                                    </label>
                                    <Input
                                      type="text"
                                      value={getLanguagePackValue(langCode, 'disclaimerText')}
                                      onChange={(e) => handleFieldChange('messages', 'languagePacks', {
                                        ...settings.messages?.languagePacks,
                                        [langCode]: {
                                          ...settings.messages?.languagePacks?.[langCode],
                                          disclaimerText: e.target.value
                                        }
                                      })}
                                      className="block w-full"
                                      placeholder="Disclaimer text..."
                                    />
                                  </div>
                                </div>

                                <details className="mt-4">
                                  <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-800 dark:hover:text-blue-300">
                                    Show all labels
                                  </summary>
                                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                      'availableNowText', 'suggestedResponses', 'bannerText', 'popupMessage', 'newConversationLabel', 'conversationHistoryLabel',
                                      'conversationLoadedLabel', 'todayLabel', 'yesterdayLabel',
                                      'daysAgoSuffix', 'messagesLabel', 'noConversationsLabel',
                                      'startConversationLabel', 'conversationDeletedLabel', 'newConversationStartedLabel'
                                    ].map((labelKey) => (
                                      <div key={labelKey}>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">
                                          {labelKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                        </label>
                                        {labelKey === 'suggestedResponses' ? (
                                          <Textarea
                                            value={Array.isArray(getLanguagePackValue(langCode, labelKey))
                                              ? getLanguagePackValue(langCode, labelKey).join('\n')
                                              : ''}
                                            onChange={(e) => {
                                              const lines = e.target.value.split('\n').filter(line => line.trim());
                                              handleFieldChange('messages', 'languagePacks', {
                                                ...settings.messages?.languagePacks,
                                                [langCode]: {
                                                  ...settings.messages?.languagePacks?.[langCode],
                                                  [labelKey]: lines
                                                }
                                              });
                                            }}
                                            rows={4}
                                            className="block w-full font-mono text-xs"
                                            placeholder="Enter one suggestion per line..."
                                          />
                                        ) : (
                                          <Input
                                            type="text"
                                            value={getLanguagePackValue(langCode, labelKey)}
                                            onChange={(e) => handleFieldChange('messages', 'languagePacks', {
                                              ...settings.messages?.languagePacks,
                                              [langCode]: {
                                                ...settings.messages?.languagePacks?.[langCode],
                                                [labelKey]: e.target.value
                                              }
                                            })}
                                            className="block w-full"
                                            placeholder={`Label for ${labelKey}...`}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    </div>

                    {/* Labels Section */}
                    <div className="border-t pt-6 mt-6">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Menu & Conversation Labels
                      </h5>

                      <div className="space-y-3">
                        {/* Menu Labels */}
                        <details className="bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <summary className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-between">
                            <span>Menu Labels</span>
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 details-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="px-4 pb-4">
                            <div className="space-y-4 mt-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  "Ny samtale" Label
                                </label>
                                <input
                                  type="text"
                                  value={settings.messages?.newConversationLabel || ''}
                                  onChange={(e) => handleFieldChange('messages', 'newConversationLabel', e.target.value)}
                                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="Ny samtale"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Label for the "New conversation" button in the menu
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  "Tidligere samtaler" Label
                                </label>
                                <input
                                  type="text"
                                  value={settings.messages?.conversationHistoryLabel || ''}
                                  onChange={(e) => handleFieldChange('messages', 'conversationHistoryLabel', e.target.value)}
                                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="Tidligere samtaler"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Label for the "Conversation history" button and header
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  "Samtale indlæst" Label
                                </label>
                                <input
                                  type="text"
                                  value={settings.messages?.conversationLoadedLabel || ''}
                                  onChange={(e) => handleFieldChange('messages', 'conversationLoadedLabel', e.target.value)}
                                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="Samtale indlæst"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Notification message when a conversation is loaded
                                </p>
                              </div>
                            </div>
                          </div>
                        </details>

                        {/* Date/Time Labels */}
                        <details className="bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <summary className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-between">
                            <span>Date & Time Labels</span>
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 details-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="px-4 pb-4">
                            <div className="space-y-4 mt-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  "I dag" Label
                                </label>
                                <input
                                  type="text"
                                  value={settings.messages?.todayLabel || ''}
                                  onChange={(e) => handleFieldChange('messages', 'todayLabel', e.target.value)}
                                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="I dag"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Label for conversations from today
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  "I går" Label
                                </label>
                                <input
                                  type="text"
                                  value={settings.messages?.yesterdayLabel || ''}
                                  onChange={(e) => handleFieldChange('messages', 'yesterdayLabel', e.target.value)}
                                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="I går"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Label for conversations from yesterday
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Days Suffix (for "2d", "3d", etc.)
                                </label>
                                <input
                                  type="text"
                                  value={settings.messages?.daysAgoSuffix || ''}
                                  onChange={(e) => handleFieldChange('messages', 'daysAgoSuffix', e.target.value)}
                                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="d"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Suffix for days ago (e.g., "2d" = 2 + "d")
                                </p>
                              </div>
                            </div>
                          </div>
                        </details>

                        {/* Conversation Status Labels */}
                        <details className="bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <summary className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-between">
                            <span>Conversation Status Labels</span>
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 details-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="px-4 pb-4">
                            <div className="space-y-4 mt-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  "Beskeder" Label
                                </label>
                                <input
                                  type="text"
                                  value={settings.messages?.messagesLabel || ''}
                                  onChange={(e) => handleFieldChange('messages', 'messagesLabel', e.target.value)}
                                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="beskeder"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Label for message count (e.g., "5 beskeder")
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  "Ingen tidligere samtaler" Label
                                </label>
                                <input
                                  type="text"
                                  value={settings.messages?.noConversationsLabel || ''}
                                  onChange={(e) => handleFieldChange('messages', 'noConversationsLabel', e.target.value)}
                                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="Ingen tidligere samtaler"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Message shown when there are no conversations
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  "Start en samtale..." Label
                                </label>
                                <input
                                  type="text"
                                  value={settings.messages?.startConversationLabel || ''}
                                  onChange={(e) => handleFieldChange('messages', 'startConversationLabel', e.target.value)}
                                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                  placeholder="Start en samtale for at se den her"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Helper text shown when there are no conversations
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  "Samtale slettet" Label
                                </label>
                                <Input
                                  type="text"
                                  value={settings.messages?.conversationDeletedLabel || ''}
                                  onChange={(e) => handleFieldChange('messages', 'conversationDeletedLabel', e.target.value)}
                                  className="block w-full"
                                  placeholder="Samtale slettet"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Notification message when a conversation is deleted
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  "New conversation started" Label
                                </label>
                                <Input
                                  type="text"
                                  value={settings.messages?.newConversationStartedLabel || ''}
                                  onChange={(e) => handleFieldChange('messages', 'newConversationStartedLabel', e.target.value)}
                                  className="block w-full"
                                  placeholder="New conversation started"
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Notification message when a new conversation is started
                                </p>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Popup Delay (milliseconds)
                      </label>
                      <Input
                        type="number"
                        value={settings.messages?.popupDelay || 5000}
                        onChange={(e) => handleFieldChange('messages', 'popupDelay', parseInt(e.target.value))}
                        className={`block w-full ${validationErrors['messages.popupDelay'] ? 'border-red-300 dark:border-red-500' : ''}`}
                        min="0"
                        max="30000"
                      />
                      {validationErrors['messages.popupDelay'] && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {validationErrors['messages.popupDelay']}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        How long to wait before showing the popup message (0 = show immediately)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Suggested Responses */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-purple-600" />
                    Suggested Responses (Max 5)
                  </h4>

                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      These quick response buttons appear when the chat starts
                    </p>

                    {/* Suggested Responses List */}
                    <div className="space-y-2">
                      {(settings.messages?.suggestedResponses || ['']).map((response, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={response}
                            onChange={(e) => {
                              const responses = [...(settings.messages?.suggestedResponses || [''])];
                              responses[index] = e.target.value;
                              handleFieldChange('messages', 'suggestedResponses', responses);
                            }}
                            className="flex-1"
                            placeholder={`Suggested response ${index + 1}...`}
                          />
                          {(settings.messages?.suggestedResponses || ['']).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const responses = [...(settings.messages?.suggestedResponses || [''])];
                                responses.splice(index, 1);
                                handleFieldChange('messages', 'suggestedResponses', responses);
                              }}
                              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Response Button */}
                    {(settings.messages?.suggestedResponses || ['']).length < 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          const responses = [...(settings.messages?.suggestedResponses || ['']), ''];
                          handleFieldChange('messages', 'suggestedResponses', responses);
                        }}
                        className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Response
                      </button>
                    )}

                    {/* Max limit notice */}
                    {(settings.messages?.suggestedResponses || ['']).length >= 5 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Maximum 5 responses reached
                      </p>
                    )}
                  </div>
                </div>

                {/* Behavior Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-orange-600" />
                    Behavior Settings
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Auto-close after inactivity
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Automatically close the chat widget after a period of inactivity
                        </p>
                      </div>
                      <Switch
                        checked={settings.messages?.autoClose || false}
                        onCheckedChange={(checked) => handleFieldChange('messages', 'autoClose', checked)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Close Button Text
                      </label>
                      <Input
                        type="text"
                        value={settings.messages?.closeButtonText || 'Close'}
                        onChange={(e) => handleFieldChange('messages', 'closeButtonText', e.target.value)}
                        className="block w-full"
                        placeholder="Close"
                      />
                    </div>
                  </div>
                </div>

                {/* Voice Input Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-indigo-600" />
                    Voice Input (Diktering)
                  </h4>

                  <div className="space-y-6">
                    {/* Enable Voice Input */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Enable Voice Input
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Allow users to dictate messages using their microphone
                        </p>
                      </div>
                      <Switch
                        checked={settings.messages?.voiceInput?.enabled !== false}
                        onCheckedChange={(checked) => handleFieldChange('messages', 'voiceInput', {
                          ...settings.messages?.voiceInput,
                          enabled: checked
                        })}
                      />
                    </div>

                    {/* Voice Input Configuration */}
                    {settings.messages?.voiceInput?.enabled !== false && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Voice Language
                          </label>
                          <select
                            value={settings.messages?.voiceInput?.language || 'da-DK'}
                            onChange={(e) => handleFieldChange('messages', 'voiceInput', {
                              ...settings.messages?.voiceInput,
                              language: e.target.value
                            })}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="da-DK">Dansk (Danmark)</option>
                            <option value="en-US">English (US)</option>
                            <option value="en-GB">English (UK)</option>
                            <option value="sv-SE">Svenska (Sverige)</option>
                            <option value="no-NO">Norsk (Norge)</option>
                            <option value="de-DE">Deutsch (Deutschland)</option>
                            <option value="fr-FR">Français (France)</option>
                            <option value="es-ES">Español (España)</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Language for speech recognition
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Voice Button Position
                          </label>
                          <select
                            value={settings.messages?.voiceInput?.buttonPosition || 'left'}
                            onChange={(e) => handleFieldChange('messages', 'voiceInput', {
                              ...settings.messages?.voiceInput,
                              buttonPosition: e.target.value
                            })}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="left">Left side of input</option>
                            <option value="right">Right side of input</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Position of the microphone button in the input field
                          </p>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Continuous Recording
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Keep recording until manually stopped
                            </p>
                          </div>
                          <Switch
                            checked={settings.messages?.voiceInput?.continuousRecording || false}
                            onCheckedChange={(checked) => handleFieldChange('messages', 'voiceInput', {
                              ...settings.messages?.voiceInput,
                              continuousRecording: checked
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Auto-send on Complete
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Automatically send message when voice input stops
                            </p>
                          </div>
                          <Switch
                            checked={settings.messages?.voiceInput?.autoSendOnComplete || false}
                            onCheckedChange={(checked) => handleFieldChange('messages', 'voiceInput', {
                              ...settings.messages?.voiceInput,
                              autoSendOnComplete: checked
                            })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Information Panel */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-blue-800 dark:text-blue-300">
                          <p className="font-medium mb-1">Voice Input Information</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Uses browser's built-in speech recognition</li>
                            <li>• Works best in Chrome, Edge, and Safari</li>
                            <li>• Requires microphone permission from user</li>
                            <li>• Speech is processed locally in the browser</li>
                            <li>• No audio data is sent to our servers</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Upload Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-purple-600" />
                    Image Upload (GPT-4.1 Vision)
                  </h4>

                  <div className="space-y-6">
                    {/* Enable Image Upload */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Enable Image Upload
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Allow users to upload images for AI analysis (requires GPT-4.1 or vision-capable model)
                        </p>
                      </div>
                      <Switch
                        checked={settings.imageUpload?.enabled || settings.imageupload?.enabled || false}
                        onCheckedChange={(checked) => handleFieldChange('imageupload', 'enabled', checked)}
                      />
                    </div>

                    {/* Information Panel */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-purple-800 dark:text-purple-300">
                          <p className="font-medium mb-1">Image Upload Information</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Maximum file size: 5MB</li>
                            <li>• Supported formats: JPEG, PNG, GIF, WebP</li>
                            <li>• Images auto-compressed to 1024x1024 for optimal performance</li>
                            <li>• Saves ~73% on API token costs through compression</li>
                            <li>• Images stored securely in Cloudinary CDN</li>
                            <li>• Requires GPT-4.1 or vision-capable model in your OpenAI prompt</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Cards Settings */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-emerald-600" />
                    Product Recommendation Cards
                  </h4>

                  <div className="space-y-6">
                    {/* Enable Product Cards */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Enable Product Cards
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Allow AI to display product recommendations as visual cards
                        </p>
                      </div>
                      <Switch
                        checked={settings.messages?.productCards?.enabled !== false}
                        onCheckedChange={(checked) => handleFieldChange('messages', 'productCards', {
                          ...settings.messages?.productCards,
                          enabled: checked
                        })}
                      />
                    </div>

                    {/* Product Cards Configuration */}
                    {settings.messages?.productCards?.enabled !== false && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Card Layout
                            </label>
                            <select
                              value={settings.messages?.productCards?.layout || 'horizontal'}
                              onChange={(e) => handleFieldChange('messages', 'productCards', {
                                ...settings.messages?.productCards,
                                layout: e.target.value
                              })}
                              className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="horizontal">Horizontal Scroll</option>
                              <option value="grid">Grid Layout</option>
                              <option value="vertical">Vertical Stack</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              How product cards are arranged
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Cards per Row
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="4"
                              value={settings.messages?.productCards?.cardsPerRow || 3}
                              onChange={(e) => handleFieldChange('messages', 'productCards', {
                                ...settings.messages?.productCards,
                                cardsPerRow: parseInt(e.target.value)
                              })}
                              className="block w-full"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Maximum cards per row (for grid layout)
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Card Style
                            </label>
                            <select
                              value={settings.messages?.productCards?.cardStyle || 'standard'}
                              onChange={(e) => handleFieldChange('messages', 'productCards', {
                                ...settings.messages?.productCards,
                                cardStyle: e.target.value
                              })}
                              className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="minimal">Minimal</option>
                              <option value="standard">Standard</option>
                              <option value="detailed">Detailed</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Visual style of product cards
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Price Currency
                            </label>
                            <Input
                              type="text"
                              value={settings.messages?.productCards?.priceCurrency || 'kr.'}
                              onChange={(e) => handleFieldChange('messages', 'productCards', {
                                ...settings.messages?.productCards,
                                priceCurrency: e.target.value
                              })}
                              className="block w-full"
                              placeholder="kr."
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Default currency symbol
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Show Price
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Display product prices on cards
                            </p>
                          </div>
                          <Switch
                            checked={settings.messages?.productCards?.showPrice !== false}
                            onCheckedChange={(checked) => handleFieldChange('messages', 'productCards', {
                              ...settings.messages?.productCards,
                              showPrice: checked
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Auto-fetch Product Data
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Automatically fetch product images and details from URLs
                            </p>
                          </div>
                          <Switch
                            checked={settings.messages?.productCards?.autoFetchProductData || false}
                            onCheckedChange={(checked) => handleFieldChange('messages', 'productCards', {
                              ...settings.messages?.productCards,
                              autoFetchProductData: checked
                            })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Information Panel */}
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-emerald-800 dark:text-emerald-300">
                          <p className="font-medium mb-1">Product Cards Information</p>
                          <ul className="space-y-1 text-xs">
                            <li>• AI can display products using [PRODUCTS] markup format</li>
                            <li>• Cards show product image, name, and price</li>
                            <li>• Cards are clickable links to product pages</li>
                            <li>• Supports multiple layout options</li>
                            <li>• Mobile-responsive with horizontal scroll</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="branding" className="border-0">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Branding</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              {/* Branding Settings */}
              <div className="space-y-5">
                {/* Company Information */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Company Information
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Widget Title</label>
                      <Input
                        type="text"
                        value={settings.branding?.title || ''}
                        onChange={(e) => handleFieldChange('branding', 'title', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="AI Assistant"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Assistant Name</label>
                      <Input
                        type="text"
                        value={settings.branding?.assistantName || ''}
                        onChange={(e) => handleFieldChange('branding', 'assistantName', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Elva"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Company Name</label>
                      <Input
                        type="text"
                        value={settings.branding?.companyName || ''}
                        onChange={(e) => handleFieldChange('branding', 'companyName', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Elva Solutions"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">"Powered by" Text</label>
                      <Input
                        type="text"
                        value={settings.branding?.poweredByText || ''}
                        onChange={(e) => handleFieldChange('branding', 'poweredByText', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Powered by Elva"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">"Available now" Text</label>
                      <Input
                        type="text"
                        value={settings.messages?.availableNowText || ''}
                        onChange={(e) => handleFieldChange('messages', 'availableNowText', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Tilgængelig nu"
                      />
                    </div>
                  </div>
                </div>

                {/* Visual Assets */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    Visual Assets
                  </label>
                  <div className="space-y-4">
                    <FileUpload
                      currentUrl={settings.branding?.avatarUrl || ''}
                      onUpload={(url) => handleFieldChange('branding', 'avatarUrl', url)}
                      onRemove={() => handleFieldChange('branding', 'avatarUrl', '')}
                      label="Assistant Avatar"
                      aspectRatio="1:1"
                      labelClassName="text-xs text-slate-600 dark:text-slate-400"
                    />

                    {/* Avatar Background Color */}
                    <div className="flex items-center justify-between py-2 px-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Avatar Background</span>
                      <Switch
                        checked={settings.branding?.useAvatarBackgroundColor !== false}
                        onCheckedChange={(checked) => handleFieldChange('branding', 'useAvatarBackgroundColor', checked)}
                      />
                    </div>

                    {settings.branding?.useAvatarBackgroundColor !== false && (
                      <ColorPicker
                        label="Avatar Background Color"
                        color={settings.branding?.avatarBackgroundColor || settings.appearance?.themeColor || '#4f46e5'}
                        onChange={(color) => handleFieldChange('branding', 'avatarBackgroundColor', color)}
                      />
                    )}

                    <FileUpload
                      currentUrl={settings.branding?.logoUrl || ''}
                      onUpload={(url) => handleFieldChange('branding', 'logoUrl', url)}
                      onRemove={() => handleFieldChange('branding', 'logoUrl', '')}
                      label="Company Logo"
                      aspectRatio="16:9"
                      labelClassName="text-xs text-slate-600 dark:text-slate-400"
                    />

                    {/* Image Zoom */}
                    <button
                      onClick={() => setIsImageZoomModalOpen(true)}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ZoomIn className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">Customize Image Zoom</span>
                    </button>
                  </div>
                </div>

                {/* Branding Options */}
                <div className="flex items-center justify-between py-2 px-1">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Show Branding</span>
                  <Switch
                    checked={settings.branding?.showBranding !== false}
                    onCheckedChange={(checked) => handleFieldChange('branding', 'showBranding', checked)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="privacy" className="border-0">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Privacy & Cookies</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              <div className="space-y-5">
                {/* Enable Cookie Banner */}
                <div className="flex items-center justify-between py-2 px-1">
                  <div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Cookie Consent Banner</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">GDPR-compliant consent</p>
                  </div>
                  <Switch
                    checked={settings.consent?.enabled !== false}
                    onCheckedChange={(checked) => handleFieldChange('consent', 'enabled', checked)}
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Banner Title</label>
                    <Input
                      type="text"
                      value={settings.consent?.title || '🍪 Vi respekterer dit privatliv'}
                      onChange={(e) => handleFieldChange('consent', 'title', e.target.value)}
                      className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Description</label>
                    <Textarea
                      value={settings.consent?.description || 'Vi bruger localStorage til at gemme din samtalehistorik...'}
                      onChange={(e) => handleFieldChange('consent', 'description', e.target.value)}
                      rows={2}
                      className="w-full text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Privacy URL</label>
                      <Input
                        type="url"
                        value={settings.consent?.privacyUrl || ''}
                        onChange={(e) => handleFieldChange('consent', 'privacyUrl', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Cookie URL</label>
                      <Input
                        type="url"
                        value={settings.consent?.cookiesUrl || ''}
                        onChange={(e) => handleFieldChange('consent', 'cookiesUrl', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="satisfaction" className="border-0">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <Star className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Satisfaction Rating</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              <div className="space-y-5">
                {/* Enable Satisfaction Rating */}
                <div className="flex items-center justify-between py-2 px-1">
                  <div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">Enable Rating</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Let users rate conversations</p>
                  </div>
                  <Switch
                    checked={settings.satisfaction?.enabled !== false}
                    onCheckedChange={(checked) => handleFieldChange('satisfaction', 'enabled', checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Trigger After</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.satisfaction?.triggerAfter || 3}
                      onChange={(e) => handleFieldChange('satisfaction', 'triggerAfter', parseInt(e.target.value))}
                      className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="3 messages"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Delay (sec)</label>
                    <Input
                      type="number"
                      min="5"
                      max="300"
                      value={settings.satisfaction?.inactivityDelay ? settings.satisfaction.inactivityDelay / 1000 : 30}
                      onChange={(e) => handleFieldChange('satisfaction', 'inactivityDelay', parseInt(e.target.value) * 1000)}
                      className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1.5">Prompt Text</label>
                  <Input
                    type="text"
                    value={settings.satisfaction?.promptText || 'How would you rate this conversation?'}
                    onChange={(e) => handleFieldChange('satisfaction', 'promptText', e.target.value)}
                    className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                {/* Rating Scale Preview */}
                <div className="flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-lg">🙁</span>
                  <span className="text-lg">😞</span>
                  <span className="text-lg">😐</span>
                  <span className="text-lg">😊</span>
                  <span className="text-lg">🤩</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="support" className="border-0">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Support Request</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              <div className="space-y-5">
                {/* Enable Support Request */}
                <div className="flex items-center justify-between py-2 px-1">
                  <div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">Enable Support Request</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Allow users to contact your team</p>
                  </div>
                  <Switch
                    checked={settings.manualReview?.enabled !== false}
                    onCheckedChange={(checked) => handleFieldChange('manualReview', 'enabled', checked)}
                  />
                </div>

                {/* Support Request Settings */}
                {settings.manualReview?.enabled !== false && (
                  <div className="space-y-3">
                    {/* Enable Live Chat */}
                    <div className="flex items-center justify-between py-2 px-1">
                      <div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">Enable Live Chat</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Real-time agent support</p>
                      </div>
                      <Switch
                        checked={settings.manualReview?.liveChatEnabled !== false}
                        onCheckedChange={(checked) => handleFieldChange('manualReview', 'liveChatEnabled', checked)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Button Text</label>
                      <Input
                        type="text"
                        value={settings.manualReview?.buttonText || 'Request Support'}
                        onChange={(e) => handleFieldChange('manualReview', 'buttonText', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                        placeholder="Request Support"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Form Title</label>
                      <Input
                        type="text"
                        value={settings.manualReview?.formTitle || 'Request Support'}
                        onChange={(e) => handleFieldChange('manualReview', 'formTitle', e.target.value)}
                        className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                        placeholder="Request Support"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Form Description</label>
                      <Textarea
                        value={settings.manualReview?.formDescription || 'Please provide your contact information...'}
                        onChange={(e) => handleFieldChange('manualReview', 'formDescription', e.target.value)}
                        rows={2}
                        className="w-full text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                        placeholder="Please provide your contact information..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Success Message</label>
                      <Textarea
                        value={settings.manualReview?.successMessage || 'Thank you for your request!'}
                        onChange={(e) => handleFieldChange('manualReview', 'successMessage', e.target.value)}
                        rows={2}
                        className="w-full text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                        placeholder="Thank you for your request!"
                      />
                    </div>

                    {/* Email Support Labels */}
                    <details className="pt-2">
                      <summary className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                        Email Support Labels
                      </summary>
                      <div className="space-y-3 mt-3">
                        <div>
                          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Email Button Text</label>
                          <Input
                            type="text"
                            value={settings.manualReview?.emailSupportButtonText || '📧 Email Support'}
                            onChange={(e) => handleFieldChange('manualReview', 'emailSupportButtonText', e.target.value)}
                            className="w-full h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Name Label</label>
                            <Input
                              type="text"
                              value={settings.manualReview?.nameLabel || 'Dit navn'}
                              onChange={(e) => handleFieldChange('manualReview', 'nameLabel', e.target.value)}
                              className="w-full h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Email Label</label>
                            <Input
                              type="text"
                              value={settings.manualReview?.emailLabel || 'Din email'}
                              onChange={(e) => handleFieldChange('manualReview', 'emailLabel', e.target.value)}
                              className="w-full h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Cancel Button</label>
                            <Input
                              type="text"
                              value={settings.manualReview?.cancelButtonText || 'Annuller'}
                              onChange={(e) => handleFieldChange('manualReview', 'cancelButtonText', e.target.value)}
                              className="w-full h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Submit Button</label>
                            <Input
                              type="text"
                              value={settings.manualReview?.submitButtonText || 'Send'}
                              onChange={(e) => handleFieldChange('manualReview', 'submitButtonText', e.target.value)}
                              className="w-full h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="advanced" className="border-0">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Advanced Settings</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              <AdvancedSettings settings={settings} onChange={onChange} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="embed" className="border-0">
            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <Code className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Embed Code</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0">
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Add this code before the closing &lt;/body&gt; tag on your website.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Widget ID</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={settings._id || 'widget-id'}
                      readOnly
                      className="flex-1 h-9 px-3 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(settings._id || 'widget-id')}
                      className="h-9 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Embed Code</label>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/widget-embed/${settings._id || 'widget-id'}"></script>`}
                      rows={3}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 resize-none"
                    />
                    <button
                      onClick={() => {
                        const code = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/widget-embed/${settings._id || 'widget-id'}"></script>`;
                        navigator.clipboard.writeText(code);
                      }}
                      className="absolute top-2 right-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Steps</span>
                    </div>
                    <ol className="text-[10px] text-emerald-600 dark:text-emerald-400 space-y-0.5 list-decimal list-inside">
                      <li>Copy embed code</li>
                      <li>Paste before &lt;/body&gt;</li>
                      <li>Save & publish</li>
                    </ol>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Tips</span>
                    </div>
                    <ul className="text-[10px] text-amber-600 dark:text-amber-400 space-y-0.5 list-disc list-inside">
                      <li>Test on staging first</li>
                      <li>Mobile-responsive</li>
                      <li>Instant updates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={isImageZoomModalOpen}
        onClose={() => setIsImageZoomModalOpen(false)}
        imageSettings={settings.branding?.imageSettings || {
          avatarZoom: 1.0,
          avatarOffsetX: 0,
          avatarOffsetY: 0,
          logoZoom: 1.0,
          logoOffsetX: 0,
          logoOffsetY: 0
        }}
        onSave={(imageSettings) => {
          // Update settings directly to ensure imageSettings are saved
          console.log('Saving imageSettings:', imageSettings);
          onChange({
            ...settings,
            branding: {
              ...settings.branding,
              imageSettings: imageSettings
            }
          });
        }}
        widgetName={settings.name}
        brandingTitle={settings.branding?.title}
        avatarUrl={settings.branding?.avatarUrl}
        logoUrl={settings.branding?.logoUrl}
        themeColor={settings.appearance?.themeColor || settings.theme?.buttonColor}
        avatarBackgroundColor={settings.branding?.avatarBackgroundColor}
        useAvatarBackgroundColor={settings.branding?.useAvatarBackgroundColor !== false}
      />
    </div>
  );
}

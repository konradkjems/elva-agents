import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import ColorPicker from './ColorPicker';
import LivePreview from './LivePreview';
import {
  Save,
  Eye,
  Settings,
  Palette,
  MessageSquare,
  Sparkles,
  Code,
  Shield,
  Moon,
  Sun,
  Monitor,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Zap,
  MessageCircle,
  RefreshCw
} from 'lucide-react';

export default function ModernWidgetEditor({ widget, isNew = false }) {
  const router = useRouter();
  const { toast } = useToast();

  // UI State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' | 'mobile'

  // Data State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    promptId: '',
    status: 'active',
    appearance: {
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      borderRadius: 8,
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      position: 'bottom-right',
      size: 'medium'
    },
    messages: {
      welcomeMessage: 'Hi! How can I help you today?',
      placeholderText: 'Type your message...',
      offlineMessage: 'We\'re currently offline. Please leave a message.',
      errorMessage: 'Sorry, something went wrong. Please try again.',
      customLanguage: false,
      languagePacks: widget?.messages?.languagePacks || {
        'da': {
          welcomeMessage: 'Hej! Hvordan kan jeg hjælpe dig i dag?',
          popupMessage: 'Hej! Har du brug for hjælp?',
          typingText: 'AI tænker...',
          inputPlaceholder: 'Skriv din besked...',
          bannerText: 'Velkommen til vores kundeservice chat!',
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
        // ... (other languages preserved via spread below if needed, but initializing with defaults)
      }
    },
    branding: {
      showBranding: true,
      customLogo: '',
      brandName: 'Powered by Elva'
    },
    advanced: {
      maxMessages: 50,
      sessionTimeout: 30,
      enableSounds: true,
      enableEmojis: true,
      allowFileUploads: false,
      customCSS: ''
    },
    consent: {
      enabled: true,
      title: '🍪 Vi respekterer dit privatliv',
      description: 'Vi bruger localStorage til at gemme din samtalehistorik, så du kan fortsætte hvor du slap. Vi indsamler ikke personlige oplysninger uden din tilladelse.',
      privacyUrl: 'https://elva-solutions.com/privacy',
      cookiesUrl: 'https://elva-solutions.com/cookies'
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (widget && !isNew) {
      setFormData(prev => ({
        ...prev,
        name: widget.name || '',
        description: widget.description || '',
        promptId: widget.promptId || '',
        status: widget.status || 'active',
        appearance: {
          ...prev.appearance,
          ...widget.appearance
        },
        messages: {
          ...prev.messages,
          ...widget.messages,
          customLanguage: widget.messages?.customLanguage || false,
          languagePacks: widget.messages?.languagePacks || prev.messages.languagePacks
        },
        branding: {
          ...prev.branding,
          ...widget.branding
        },
        advanced: {
          ...prev.advanced,
          ...widget.advanced
        },
        consent: {
          ...prev.consent,
          ...widget.consent
        }
      }));
    }
  }, [widget, isNew]);

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Widget name is required.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = isNew ? '/api/admin/widgets' : `/api/admin/widgets/${widget._id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const savedWidget = await response.json();
        setJustSaved(true);

        toast({
          title: `Widget ${isNew ? 'created' : 'updated'}`,
          description: `Your widget has been successfully ${isNew ? 'created' : 'updated'}.`,
        });

        if (isNew) {
          router.push(`/admin/widgets/${savedWidget._id}`);
        }

        setTimeout(() => setJustSaved(false), 2000);
      } else {
        throw new Error(`Failed to ${isNew ? 'create' : 'update'} widget`);
      }
    } catch (error) {
      setJustSaved(false);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: `There was a problem ${isNew ? 'creating' : 'updating'} the widget.`,
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setJustSaved(false), 100);
    }
  };

  const handlePreview = () => {
    const previewData = encodeURIComponent(JSON.stringify(formData));
    window.open(`/admin/widgets/preview?data=${previewData}`, '_blank');
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-black text-slate-100' : 'bg-[#f3f5f7] text-slate-900'}`}>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* Editor Top Bar */}
        <header className={`h-16 border-b flex items-center justify-between px-6 z-20 ${isDarkMode ? 'bg-[#050505] border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <ChevronLeft size={20} />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                <span>Widgets</span>
                <ChevronRight size={12} />
                <span>{formData.name || 'New Widget'}</span>
              </div>
              <h1 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Widget Editor</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <Button variant="ghost" size="icon" onClick={() => setIsDarkMode(!isDarkMode)} className={`rounded-full mr-2 ${isDarkMode ? 'text-yellow-400 hover:bg-[#1a1a1a]' : 'text-slate-400 hover:bg-slate-100'}`}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </Button>

            <Button
              variant="outline"
              className={`gap-2 ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              onClick={() => {
                navigator.clipboard.writeText(`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://elva-solutions.com'}/widget/${widget?._id || 'YOUR_WIDGET_ID'}/widget.js"></script>`);
                toast({ title: "Copied!", description: "Embed code copied to clipboard." });
              }}
            >
              <Code size={16} />
              <span>Embed</span>
            </Button>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#075ef0] text-white hover:bg-blue-600 gap-2 shadow-lg shadow-[#075ef0]/20"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Editor Workspace */}
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT PANEL: Settings */}
          <div className={`w-[400px] border-r flex flex-col overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-[#111] border-slate-800' : 'bg-white border-slate-200'}`}>

            {/* General Info Section (Always visible at top) */}
            <div className={`p-6 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Widget Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('', 'name', e.target.value)}
                    placeholder="Enter widget name"
                    className={`mt-1.5 ${isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div>
                  <Label htmlFor="promptId" className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Prompt ID</Label>
                  <Input
                    id="promptId"
                    value={formData.promptId}
                    onChange={(e) => handleInputChange('', 'promptId', e.target.value)}
                    placeholder="Enter prompt ID"
                    className={`mt-1.5 ${isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="status" className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Active Status</Label>
                  <Switch
                    id="status"
                    checked={formData.status === 'active'}
                    onCheckedChange={(checked) => handleInputChange('', 'status', checked ? 'active' : 'inactive')}
                  />
                </div>
              </div>
            </div>

            <Accordion type="single" collapsible defaultValue="appearance" className="w-full">

              {/* Appearance Section */}
              <AccordionItem value="appearance" className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <AccordionTrigger className={`px-6 hover:no-underline ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-[#075ef0]' : 'bg-blue-50 text-[#075ef0]'}`}>
                      <Palette size={18} />
                    </div>
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Appearance</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6 pt-2">
                    <div className="space-y-4">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Colors</Label>
                      <ColorPicker
                        label="Primary Color"
                        color={formData.appearance.primaryColor}
                        onChange={(color) => handleInputChange('appearance', 'primaryColor', color)}
                        isDarkMode={isDarkMode}
                      />
                      <ColorPicker
                        label="Secondary Color"
                        color={formData.appearance.secondaryColor}
                        onChange={(color) => handleInputChange('appearance', 'secondaryColor', color)}
                        isDarkMode={isDarkMode}
                      />
                    </div>

                    <Separator className={isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Position</Label>
                        <select
                          className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#075ef0]/20 ${isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                          value={formData.appearance.position}
                          onChange={(e) => handleInputChange('appearance', 'position', e.target.value)}
                        >
                          <option value="bottom-right">Bottom Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="top-left">Top Left</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Size</Label>
                        <select
                          className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#075ef0]/20 ${isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                          value={formData.appearance.size}
                          onChange={(e) => handleInputChange('appearance', 'size', e.target.value)}
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Border Radius (px)</Label>
                      <Input
                        type="number"
                        value={formData.appearance.borderRadius}
                        onChange={(e) => handleInputChange('appearance', 'borderRadius', parseInt(e.target.value))}
                        className={isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Messages Section */}
              <AccordionItem value="messages" className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <AccordionTrigger className={`px-6 hover:no-underline ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-[#075ef0]' : 'bg-blue-50 text-[#075ef0]'}`}>
                      <MessageCircle size={18} />
                    </div>
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Messages & Texts</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Welcome Message</Label>
                      <Textarea
                        value={formData.messages.welcomeMessage}
                        onChange={(e) => handleInputChange('messages', 'welcomeMessage', e.target.value)}
                        className={`resize-none ${isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Input Placeholder</Label>
                      <Input
                        value={formData.messages.placeholderText}
                        onChange={(e) => handleInputChange('messages', 'placeholderText', e.target.value)}
                        className={isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Error Message</Label>
                      <Textarea
                        value={formData.messages.errorMessage}
                        onChange={(e) => handleInputChange('messages', 'errorMessage', e.target.value)}
                        className={`resize-none ${isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                        rows={2}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Branding Section */}
              <AccordionItem value="branding" className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <AccordionTrigger className={`px-6 hover:no-underline ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-[#075ef0]' : 'bg-blue-50 text-[#075ef0]'}`}>
                      <Sparkles size={18} />
                    </div>
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Branding</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Show Branding</Label>
                      <Switch
                        checked={formData.branding.showBranding}
                        onCheckedChange={(checked) => handleInputChange('branding', 'showBranding', checked)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Brand Name</Label>
                      <Input
                        value={formData.branding.brandName}
                        onChange={(e) => handleInputChange('branding', 'brandName', e.target.value)}
                        className={isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Custom Logo URL</Label>
                      <Input
                        value={formData.branding.customLogo}
                        onChange={(e) => handleInputChange('branding', 'customLogo', e.target.value)}
                        className={isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Advanced Section */}
              <AccordionItem value="advanced" className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <AccordionTrigger className={`px-6 hover:no-underline ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-[#075ef0]' : 'bg-blue-50 text-[#075ef0]'}`}>
                      <Settings size={18} />
                    </div>
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Advanced</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Max Messages</Label>
                        <Input
                          type="number"
                          value={formData.advanced.maxMessages}
                          onChange={(e) => handleInputChange('advanced', 'maxMessages', parseInt(e.target.value))}
                          className={isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Timeout (min)</Label>
                        <Input
                          type="number"
                          value={formData.advanced.sessionTimeout}
                          onChange={(e) => handleInputChange('advanced', 'sessionTimeout', parseInt(e.target.value))}
                          className={isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}
                        />
                      </div>
                    </div>
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Enable Sounds</Label>
                        <Switch
                          checked={formData.advanced.enableSounds}
                          onCheckedChange={(checked) => handleInputChange('advanced', 'enableSounds', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Enable Emojis</Label>
                        <Switch
                          checked={formData.advanced.enableEmojis}
                          onCheckedChange={(checked) => handleInputChange('advanced', 'enableEmojis', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Allow File Uploads</Label>
                        <Switch
                          checked={formData.advanced.allowFileUploads}
                          onCheckedChange={(checked) => handleInputChange('advanced', 'allowFileUploads', checked)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Custom CSS</Label>
                      <Textarea
                        value={formData.advanced.customCSS}
                        onChange={(e) => handleInputChange('advanced', 'customCSS', e.target.value)}
                        className={`font-mono text-xs ${isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                        rows={4}
                        placeholder=".widget-container { ... }"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Privacy Section */}
              <AccordionItem value="privacy" className={`border-b-0`}>
                <AccordionTrigger className={`px-6 hover:no-underline ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${isDarkMode ? 'bg-slate-800 text-[#075ef0]' : 'bg-blue-50 text-[#075ef0]'}`}>
                      <Shield size={18} />
                    </div>
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Privacy</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Enable Consent Banner</Label>
                      <Switch
                        checked={formData.consent.enabled}
                        onCheckedChange={(checked) => handleInputChange('consent', 'enabled', checked)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Banner Title</Label>
                      <Input
                        value={formData.consent.title}
                        onChange={(e) => handleInputChange('consent', 'title', e.target.value)}
                        className={isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Banner Description</Label>
                      <Textarea
                        value={formData.consent.description}
                        onChange={(e) => handleInputChange('consent', 'description', e.target.value)}
                        className={`resize-none ${isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Privacy Policy URL</Label>
                      <Input
                        value={formData.consent.privacyUrl}
                        onChange={(e) => handleInputChange('consent', 'privacyUrl', e.target.value)}
                        className={isDarkMode ? 'bg-[#1a1a1a] border-slate-700 text-white' : 'bg-white border-slate-200'}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* RIGHT PANEL: Live Preview Area */}
          <div className={`flex-1 flex flex-col relative ${isDarkMode ? 'bg-[#000]' : 'bg-[#f0f2f5]'}`}>

            {/* Preview Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-slate-200 shadow-sm p-1 rounded-full flex gap-1 z-10">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-2 rounded-full transition-all ${previewMode === 'desktop' ? 'bg-slate-100 text-[#075ef0]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Monitor size={18} />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded-full transition-all ${previewMode === 'mobile' ? 'bg-slate-100 text-[#075ef0]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Smartphone size={18} />
              </button>
              <div className="w-px h-6 bg-slate-200 my-auto mx-1"></div>
              <button
                onClick={() => {
                  // Refresh preview logic if needed, or just visual feedback
                  toast({ description: "Preview refreshed" });
                }}
                className="p-2 text-slate-400 hover:text-[#075ef0] rounded-full hover:bg-slate-50 transition-colors"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* The Actual Preview Canvas */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
              <div
                className={`relative transition-all duration-500 ease-in-out shadow-2xl ${previewMode === 'mobile'
                  ? 'w-[375px] h-[700px] rounded-[3rem] border-8 border-slate-900 bg-white overflow-hidden'
                  : 'w-full max-w-4xl h-[600px] rounded-xl border border-slate-200 bg-white overflow-hidden'
                  }`}
              >
                {/* Fake Browser Header (Desktop only) */}
                {previewMode === 'desktop' && (
                  <div className="h-8 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                    </div>
                    <div className="flex-1 mx-4 h-5 bg-white border border-slate-200 rounded text-[10px] flex items-center px-2 text-slate-400">
                      example-shop.com
                    </div>
                  </div>
                )}

                {/* Fake Website Content Background */}
                <div className="absolute inset-0 top-8 bg-slate-50 overflow-y-auto">
                  <div className="w-full h-64 bg-slate-200/50 mb-8 flex items-center justify-center text-slate-300">
                    Hero Banner Placeholder
                  </div>
                  <div className="max-w-2xl mx-auto space-y-4 px-8">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    <div className="grid grid-cols-3 gap-4 mt-8">
                      <div className="h-32 bg-slate-200 rounded"></div>
                      <div className="h-32 bg-slate-200 rounded"></div>
                      <div className="h-32 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* --- THE WIDGET ITSELF --- */}
                <LivePreview settings={formData} />

              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

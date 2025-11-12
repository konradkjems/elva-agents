import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Globe,
  Zap,
  Shield
} from 'lucide-react';

export default function ModernWidgetEditor({ widget, isNew = false }) {
  const router = useRouter();
  const { toast } = useToast();
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
      languagePacks: widget.messages?.languagePacks || {
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
        ...(widget.messages?.languagePacks?.en || {
          welcomeMessage: 'Hello! How can I help you today?',
          popupMessage: 'Hi! Need help?',
          typingText: 'AI is typing...',
          inputPlaceholder: 'Enter your message here...',
          bannerText: 'Welcome to our customer service chat!',
          newConversationLabel: 'Start new chat',
          conversationHistoryLabel: 'Chat history',
          conversationLoadedLabel: 'Chat loaded',
          todayLabel: 'Today',
          yesterdayLabel: 'Yesterday',
          daysAgoSuffix: 'd',
          messagesLabel: 'messages',
          noConversationsLabel: 'No previous chats',
          startConversationLabel: 'Start a chat to see it here',
          conversationDeletedLabel: 'Chat deleted',
          newConversationStartedLabel: 'New chat started',
          disclaimerText: 'Please do not share sensitive information'
        }),
        ...(widget.messages?.languagePacks?.de || {
          welcomeMessage: 'Hallo! Wie kann ich Ihnen heute helfen?',
          popupMessage: 'Hallo! Brauchen Sie Hilfe?',
          typingText: 'KI denkt nach...',
          inputPlaceholder: 'Schreiben Sie Ihre Nachricht...',
          bannerText: 'Willkommen in unserem Kundenservice-Chat!',
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
        }),
        ...(widget.messages?.languagePacks?.sv || {
          welcomeMessage: 'Hej! Hur kan jag hjälpa dig idag?',
          popupMessage: 'Hej! Behöver du hjälp?',
          typingText: 'AI tänker...',
          inputPlaceholder: 'Skriv ditt meddelande...',
          bannerText: 'Välkommen till vår kundservicechatt!',
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
        }),
        ...(widget.messages?.languagePacks?.no || {
          welcomeMessage: 'Hei! Hvordan kan jeg hjelpe deg i dag?',
          popupMessage: 'Hei! Trenger du hjelp?',
          typingText: 'AI tenker...',
          inputPlaceholder: 'Skriv meldingen din...',
          bannerText: 'Velkommen til vår kundeservicechat!',
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
        })
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
      setFormData({
        name: widget.name || '',
        description: widget.description || '',
        promptId: widget.promptId || '',
        status: widget.status || 'active',
        appearance: {
          ...formData.appearance,
          ...widget.appearance
        },
        messages: {
          ...formData.messages,
          ...widget.messages,
          customLanguage: widget.messages?.customLanguage || false,
          languagePacks: widget.messages?.languagePacks || formData.messages.languagePacks
        },
        branding: {
          ...formData.branding,
          ...widget.branding
        },
        advanced: {
          ...formData.advanced,
          ...widget.advanced
        },
        consent: {
          ...formData.consent,
          ...widget.consent
        }
      });
    }
  }, [widget, isNew]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
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

        // Reset justSaved flag after a short delay
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
      // Reset justSaved flag in case of error
      setTimeout(() => setJustSaved(false), 100);
    }
  };

  const handlePreview = () => {
    // Open preview in new window
    const previewData = encodeURIComponent(JSON.stringify(formData));
    window.open(`/admin/widgets/preview?data=${previewData}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor Panel */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {isNew ? 'Create Widget' : 'Edit Widget'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure your AI chat widget settings and appearance
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline"
                  className={formData.status === 'active' 
                    ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70" 
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }
                >
                  {formData.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Widget Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('', 'name', e.target.value)}
                    placeholder="Enter widget name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promptId">Prompt ID</Label>
                  <Input
                    id="promptId"
                    value={formData.promptId}
                    onChange={(e) => handleInputChange('', 'promptId', e.target.value)}
                    placeholder="Enter prompt ID"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('', 'description', e.target.value)}
                  placeholder="Describe your widget's purpose"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => handleInputChange('', 'status', checked ? 'active' : 'inactive')}
                />
                <Label htmlFor="status">Widget is active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Settings */}
        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="appearance" className="w-full">
              <div className="border-b">
                <TabsList className="grid w-full grid-cols-5 rounded-none h-auto">
                  <TabsTrigger value="appearance" className="gap-2 py-3">
                    <Palette className="h-4 w-4" />
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="gap-2 py-3">
                    <MessageSquare className="h-4 w-4" />
                    Messages
                  </TabsTrigger>
                  <TabsTrigger value="branding" className="gap-2 py-3">
                    <Sparkles className="h-4 w-4" />
                    Branding
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="gap-2 py-3">
                    <Code className="h-4 w-4" />
                    Advanced
                  </TabsTrigger>
                  <TabsTrigger value="privacy" className="gap-2 py-3">
                    <Shield className="h-4 w-4" />
                    Privacy
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="appearance" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Widget Appearance</h3>
                    <div className="grid gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Primary Color</Label>
                          <ColorPicker
                            color={formData.appearance.primaryColor}
                            onChange={(color) => handleInputChange('appearance', 'primaryColor', color)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Secondary Color</Label>
                          <ColorPicker
                            color={formData.appearance.secondaryColor}
                            onChange={(color) => handleInputChange('appearance', 'secondaryColor', color)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="position">Position</Label>
                          <select
                            id="position"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                          <Label htmlFor="size">Size</Label>
                          <select
                            id="size"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={formData.appearance.size}
                            onChange={(e) => handleInputChange('appearance', 'size', e.target.value)}
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="borderRadius">Border Radius</Label>
                          <Input
                            id="borderRadius"
                            type="number"
                            value={formData.appearance.borderRadius}
                            onChange={(e) => handleInputChange('appearance', 'borderRadius', parseInt(e.target.value))}
                            min="0"
                            max="20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="messages" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Message Settings</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="welcomeMessage">Welcome Message</Label>
                        <Textarea
                          id="welcomeMessage"
                          value={formData.messages.welcomeMessage}
                          onChange={(e) => handleInputChange('messages', 'welcomeMessage', e.target.value)}
                          placeholder="Enter welcome message"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="placeholderText">Placeholder Text</Label>
                        <Input
                          id="placeholderText"
                          value={formData.messages.placeholderText}
                          onChange={(e) => handleInputChange('messages', 'placeholderText', e.target.value)}
                          placeholder="Enter placeholder text"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="errorMessage">Error Message</Label>
                        <Textarea
                          id="errorMessage"
                          value={formData.messages.errorMessage}
                          onChange={(e) => handleInputChange('messages', 'errorMessage', e.target.value)}
                          placeholder="Enter error message"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="branding" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Branding Options</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="showBranding"
                          checked={formData.branding.showBranding}
                          onCheckedChange={(checked) => handleInputChange('branding', 'showBranding', checked)}
                        />
                        <Label htmlFor="showBranding">Show Elva branding</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brandName">Brand Name</Label>
                        <Input
                          id="brandName"
                          value={formData.branding.brandName}
                          onChange={(e) => handleInputChange('branding', 'brandName', e.target.value)}
                          placeholder="Enter brand name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customLogo">Custom Logo URL</Label>
                        <Input
                          id="customLogo"
                          value={formData.branding.customLogo}
                          onChange={(e) => handleInputChange('branding', 'customLogo', e.target.value)}
                          placeholder="Enter logo URL"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="maxMessages">Max Messages</Label>
                          <Input
                            id="maxMessages"
                            type="number"
                            value={formData.advanced.maxMessages}
                            onChange={(e) => handleInputChange('advanced', 'maxMessages', parseInt(e.target.value))}
                            min="10"
                            max="100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                          <Input
                            id="sessionTimeout"
                            type="number"
                            value={formData.advanced.sessionTimeout}
                            onChange={(e) => handleInputChange('advanced', 'sessionTimeout', parseInt(e.target.value))}
                            min="5"
                            max="120"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableSounds"
                            checked={formData.advanced.enableSounds}
                            onCheckedChange={(checked) => handleInputChange('advanced', 'enableSounds', checked)}
                          />
                          <Label htmlFor="enableSounds">Enable notification sounds</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="enableEmojis"
                            checked={formData.advanced.enableEmojis}
                            onCheckedChange={(checked) => handleInputChange('advanced', 'enableEmojis', checked)}
                          />
                          <Label htmlFor="enableEmojis">Enable emoji support</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="allowFileUploads"
                            checked={formData.advanced.allowFileUploads}
                            onCheckedChange={(checked) => handleInputChange('advanced', 'allowFileUploads', checked)}
                          />
                          <Label htmlFor="allowFileUploads">Allow file uploads</Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customCSS">Custom CSS</Label>
                        <Textarea
                          id="customCSS"
                          value={formData.advanced.customCSS}
                          onChange={(e) => handleInputChange('advanced', 'customCSS', e.target.value)}
                          placeholder="Enter custom CSS rules"
                          rows={6}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="privacy" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Cookie Consent Banner</h3>
                    <div className="space-y-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="consentEnabled"
                          checked={formData.consent.enabled}
                          onCheckedChange={(checked) => handleInputChange('consent', 'enabled', checked)}
                        />
                        <Label htmlFor="consentEnabled">Enable cookie consent banner</Label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="consentTitle">Banner Title</Label>
                        <Input
                          id="consentTitle"
                          value={formData.consent.title}
                          onChange={(e) => handleInputChange('consent', 'title', e.target.value)}
                          placeholder="🍪 Vi respekterer dit privatliv"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="consentDescription">Banner Description</Label>
                        <Textarea
                          id="consentDescription"
                          value={formData.consent.description}
                          onChange={(e) => handleInputChange('consent', 'description', e.target.value)}
                          placeholder="Vi bruger localStorage til at gemme din samtalehistorik..."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
                        <Input
                          id="privacyUrl"
                          value={formData.consent.privacyUrl}
                          onChange={(e) => handleInputChange('consent', 'privacyUrl', e.target.value)}
                          placeholder="https://your-website.com/privacy"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cookiesUrl">Cookie Policy URL</Label>
                        <Input
                          id="cookiesUrl"
                          value={formData.consent.cookiesUrl}
                          onChange={(e) => handleInputChange('consent', 'cookiesUrl', e.target.value)}
                          placeholder="https://your-website.com/cookies"
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-4 border-t">
                        <Switch
                          id="customLanguage"
                          checked={formData.messages.customLanguage}
                          onCheckedChange={(checked) => handleInputChange('messages', 'customLanguage', checked)}
                        />
                        <Label htmlFor="customLanguage">Custom Language Mode</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Disable automatic language detection and use only manually defined labels
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Language Packs</Label>
                      <p className="text-sm text-muted-foreground">
                        Configure language-specific labels in the Messages tab above, or use the detailed editor in Settings Panel.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isNew ? 'Create Widget' : 'Save Changes'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="space-y-6">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LivePreview settings={formData} />
          </CardContent>
        </Card>

        {/* Embed Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Embed Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Copy this code to your website:</Label>
              <div className="bg-muted p-3 rounded-md">
                <code className="text-sm">
                  {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://elva-solutions.com'}/widget/${widget?._id || 'YOUR_WIDGET_ID'}/widget.js"></script>`}
                </code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://elva-solutions.com'}/widget/${widget?._id || 'YOUR_WIDGET_ID'}/widget.js"></script>`);
                  toast({
                    title: "Copied!",
                    description: "Embed code copied to clipboard.",
                  });
                }}
              >
                Copy Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

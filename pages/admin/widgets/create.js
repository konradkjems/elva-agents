import { useState } from 'react';
import { useRouter } from 'next/router';
import ModernLayout from '../../../components/admin/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Save,
  Settings,
  Palette,
  MessageSquare,
  Sparkles,
  Globe,
  Zap,
  Plus,
  AlertTriangle
} from 'lucide-react';

export default function CreateWidget() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDemoMode: false,
    openai: {
      promptId: ''
    },
    demoSettings: {
      clientWebsiteUrl: '',
      clientInfo: '',
      usageLimits: {
        maxInteractions: 50,
        maxViews: 100,
        expiresAt: null
      }
    },
    appearance: {
      theme: 'light',
      themeColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      width: 450,
      height: 600,
      placement: 'bottom-right',
      borderRadius: 20,
      shadow: '0 20px 60px rgba(0,0,0,0.15)',
      backdropBlur: true,
      animationSpeed: 'normal',
      customCSS: '',
      useGradient: true
    },
    messages: {
      welcomeMessage: 'Hej! 😊 Jeg er din AI assistent. Hvordan kan jeg hjælpe dig i dag?',
      inputPlaceholder: 'Skriv en besked her',
      typingText: 'AI tænker...',
      suggestedResponses: [
        'Hvordan kan du hjælpe mig?',
        'Hvad er dine muligheder?',
        'Kan du give mig mere information?',
        'Hvad anbefaler du?'
      ],
      popupMessage: 'Hej! 👋 Har du brug for hjælp?',
      popupDelay: 5000,
      autoClose: false,
      closeButtonText: 'Close'
    },
    branding: {
      title: 'AI Kundeservice Agent',
      assistantName: 'AI Assistant',
      avatarUrl: '',
      logoUrl: '',
      companyName: 'Dit Firma',
      customLogo: false,
      imageSettings: {
        avatar: {
          enabled: true,
          url: '',
          alt: 'Assistant Avatar',
          size: 40,
          borderRadius: '50%'
        },
        logo: {
          enabled: false,
          url: '',
          alt: 'Company Logo',
          size: 120,
          borderRadius: 8
        }
      }
    },
    behavior: {
      autoOpen: false,
      autoOpenDelay: 3000,
      showTypingIndicator: true,
      showTimestamp: true,
      enableSound: false,
      soundUrl: '',
      persistentChat: true,
      sessionTimeout: 30,
      maxMessages: 100,
      rateLimit: {
        enabled: false,
        maxRequests: 10,
        timeWindow: 60
      }
    },
    integrations: {
      webhooks: {
        enabled: false,
        url: '',
        events: ['message_received', 'conversation_started', 'conversation_ended']
      },
      analytics: {
        enabled: true,
        trackEvents: true,
        customEvents: []
      },
      crm: {
        enabled: false,
        provider: 'none',
        apiKey: '',
        syncContacts: false
      }
    },
    timezone: 'Europe/Copenhagen',
    analytics: {
      totalConversations: 0,
      totalMessages: 0,
      averageResponseTime: 0,
      satisfactionScore: 0,
      lastActivity: new Date(),
      monthlyStats: {}
    },
    satisfaction: {
      enabled: false,
      triggerAfter: 3,
      inactivityDelay: 30000,
      promptText: 'How would you rate this conversation so far?',
      allowFeedback: true,
      feedbackPlaceholder: 'Optional feedback...'
    },
    manualReview: {
      enabled: false,
      buttonText: 'Request Manual Review',
      formTitle: 'Request Manual Review',
      formDescription: 'Please provide your contact information and describe what you need help with. Our team will review your conversation and get back to you.',
      successMessage: 'Thank you for your request! Our team will review your conversation and contact you within 24 hours.'
    }
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (section, key, value) => {
    if (section === 'name' || section === 'description' || section === 'isDemoMode') {
      // Handle top-level fields
      setFormData(prev => ({
        ...prev,
        [section]: value
      }));
    } else if (section === 'demoSettings') {
      // Handle demo settings (nested object)
      setFormData(prev => ({
        ...prev,
        demoSettings: {
          ...prev.demoSettings,
          [key]: value
        }
      }));
    } else {
      // Handle other nested fields
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value
        }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use demo API if in demo mode, otherwise use regular widget API
      const apiEndpoint = formData.isDemoMode ? '/api/admin/demo-widgets' : '/api/admin/widgets';
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create widget');
      }

      const newWidget = await response.json();
      
      if (formData.isDemoMode) {
        toast({
          title: "Demo Widget Created",
          description: "Your demo widget has been created successfully!",
        });
        router.push(`/admin/demo-widgets`);
      } else {
        toast({
          title: "Widget Created",
          description: "Your new widget has been created successfully!",
        });
        router.push(`/admin/widgets/${newWidget._id}`);
      }
    } catch (error) {
      console.error('Error creating widget:', error);
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: "Failed to create widget. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Create New Widget</h1>
              <p className="text-muted-foreground">
                Set up a new AI chat widget with your preferred settings
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              New Widget
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Configure the basic settings for your widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Widget Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', '', e.target.value)}
                    placeholder="My Customer Service Widget"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    value={formData.branding.companyName}
                    onChange={(e) => handleInputChange('branding', 'companyName', e.target.value)}
                    placeholder="Your Company"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', '', e.target.value)}
                  rows={3}
                  placeholder="Describe what this widget will be used for..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Demo Mode Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Demo Mode
              </CardTitle>
              <CardDescription>
                Create a demo widget for client demonstrations and sales purposes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="demoMode"
                  checked={formData.isDemoMode}
                  onCheckedChange={(checked) => handleInputChange('isDemoMode', '', checked)}
                />
                <Label htmlFor="demoMode">Create as Demo Widget</Label>
              </div>
              {formData.isDemoMode && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="clientWebsiteUrl">
                      Client Website URL *
                    </Label>
                    <Input
                      id="clientWebsiteUrl"
                      type="url"
                      value={formData.demoSettings.clientWebsiteUrl}
                      onChange={(e) => handleInputChange('demoSettings', 'clientWebsiteUrl', e.target.value)}
                      placeholder="https://client-website.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientInfo">
                      Client Information
                    </Label>
                    <Input
                      id="clientInfo"
                      type="text"
                      value={formData.demoSettings.clientInfo}
                      onChange={(e) => handleInputChange('demoSettings', 'clientInfo', e.target.value)}
                      placeholder="Client name or company"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="maxInteractions">
                        Max Interactions
                      </Label>
                      <Input
                        id="maxInteractions"
                        type="number"
                        value={formData.demoSettings.usageLimits.maxInteractions}
                        onChange={(e) => handleInputChange('demoSettings', 'usageLimits', {
                          ...formData.demoSettings.usageLimits,
                          maxInteractions: parseInt(e.target.value)
                        })}
                        min="1"
                        max="1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxViews">
                        Max Views
                      </Label>
                      <Input
                        id="maxViews"
                        type="number"
                        value={formData.demoSettings.usageLimits.maxViews}
                        onChange={(e) => handleInputChange('demoSettings', 'usageLimits', {
                          ...formData.demoSettings.usageLimits,
                          maxViews: parseInt(e.target.value)
                        })}
                        min="1"
                        max="10000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">
                      Expiration Date (Optional)
                    </Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={formData.demoSettings.usageLimits.expiresAt ? new Date(formData.demoSettings.usageLimits.expiresAt).toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleInputChange('demoSettings', 'usageLimits', {
                        ...formData.demoSettings.usageLimits,
                        expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null
                      })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OpenAI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                OpenAI Configuration
              </CardTitle>
              <CardDescription>
                Configure the AI model and prompt settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promptId">
                  Prompt ID *
                </Label>
                <Input
                  id="promptId"
                  type="text"
                  required
                  value={formData.openai.promptId}
                  onChange={(e) => handleInputChange('openai', 'promptId', e.target.value)}
                  placeholder="prompt-1234567890"
                />
                <p className="text-sm text-muted-foreground">
                  Model og version konfigureres på OpenAI platformen
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Messages Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages & Behavior
              </CardTitle>
              <CardDescription>
                Configure welcome messages and chat behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">
                  Welcome Message
                </Label>
                <Textarea
                  id="welcomeMessage"
                  value={formData.messages.welcomeMessage}
                  onChange={(e) => handleInputChange('messages', 'welcomeMessage', e.target.value)}
                  rows={3}
                  placeholder="Hello! How can I help you today?"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inputPlaceholder">
                    Input Placeholder
                  </Label>
                  <Input
                    id="inputPlaceholder"
                    type="text"
                    value={formData.messages.inputPlaceholder}
                    onChange={(e) => handleInputChange('messages', 'inputPlaceholder', e.target.value)}
                    placeholder="Type your message here..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typingText">
                    Typing Indicator Text
                  </Label>
                  <Input
                    id="typingText"
                    type="text"
                    value={formData.messages.typingText}
                    onChange={(e) => handleInputChange('messages', 'typingText', e.target.value)}
                    placeholder="AI is thinking..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the visual appearance of your widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="themeColor">
                    Primary Color
                  </Label>
                  <Input
                    id="themeColor"
                    type="color"
                    value={formData.appearance.themeColor}
                    onChange={(e) => handleInputChange('appearance', 'themeColor', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">
                    Secondary Color
                  </Label>
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={formData.appearance.secondaryColor}
                    onChange={(e) => handleInputChange('appearance', 'secondaryColor', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="placement">
                    Placement
                  </Label>
                  <Select
                    value={formData.appearance.placement}
                    onValueChange={(value) => handleInputChange('appearance', 'placement', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select placement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="width">
                    Width (px)
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    value={formData.appearance.width}
                    onChange={(e) => handleInputChange('appearance', 'width', parseInt(e.target.value))}
                    placeholder="450"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">
                    Height (px)
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.appearance.height}
                    onChange={(e) => handleInputChange('appearance', 'height', parseInt(e.target.value))}
                    placeholder="600"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="useGradient"
                  checked={formData.appearance.useGradient}
                  onCheckedChange={(checked) => handleInputChange('appearance', 'useGradient', checked)}
                />
                <Label htmlFor="useGradient">Use gradient background</Label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Widget
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ModernLayout>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}
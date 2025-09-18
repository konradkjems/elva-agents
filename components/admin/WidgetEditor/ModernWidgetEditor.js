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
  Zap
} from 'lucide-react';

export default function ModernWidgetEditor({ widget, isNew = false }) {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    promptId: '',
    isActive: true,
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
      errorMessage: 'Sorry, something went wrong. Please try again.'
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
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (widget && !isNew) {
      setFormData({
        name: widget.name || '',
        description: widget.description || '',
        promptId: widget.promptId || '',
        isActive: widget.isActive !== false,
        appearance: {
          ...formData.appearance,
          ...widget.appearance
        },
        messages: {
          ...formData.messages,
          ...widget.messages
        },
        branding: {
          ...formData.branding,
          ...widget.branding
        },
        advanced: {
          ...formData.advanced,
          ...widget.advanced
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
        toast({
          title: `Widget ${isNew ? 'created' : 'updated'}`,
          description: `Your widget has been successfully ${isNew ? 'created' : 'updated'}.`,
        });
        
        if (isNew) {
          router.push(`/admin/widgets/${savedWidget._id}`);
        }
      } else {
        throw new Error(`Failed to ${isNew ? 'create' : 'update'} widget`);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: `There was a problem ${isNew ? 'creating' : 'updating'} the widget.`,
      });
    } finally {
      setIsSaving(false);
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
                <Badge variant={formData.isActive ? "default" : "secondary"}>
                  {formData.isActive ? 'Active' : 'Inactive'}
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
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('', 'isActive', checked)}
                />
                <Label htmlFor="isActive">Widget is active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Settings */}
        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="appearance" className="w-full">
              <div className="border-b">
                <TabsList className="grid w-full grid-cols-4 rounded-none h-auto">
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

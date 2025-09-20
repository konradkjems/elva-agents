import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ModernLayout from '../../../../components/admin/ModernLayout';
import LivePreview from '../../../../components/admin/WidgetEditor/LivePreview';
import SettingsPanel from '../../../../components/admin/WidgetEditor/SettingsPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Check,
  AlertTriangle,
  Copy,
  Share,
  Save,
  Eye,
  Settings as SettingsIcon
} from 'lucide-react';

export default function WidgetEditor() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [widget, setWidget] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', null
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWidget();
    } else if (router.isReady) {
      // If router is ready but no id, set loading to false
      setLoading(false);
    }
  }, [id, router.isReady]);

  useEffect(() => {
    // Track unsaved changes
    if (widget && JSON.stringify(widget) !== JSON.stringify(settings)) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [widget, settings]);

  const fetchWidget = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`/api/admin/widgets/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch widget');
      }
      const data = await response.json();
      setWidget(data);
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch widget:', error);
      toast({
        variant: "destructive",
        title: "Failed to load widget",
        description: "There was a problem loading the widget data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    
    console.log('Saving widget with settings:', settings);
    console.log('Branding imageSettings:', settings.branding?.imageSettings);
    
    try {
      const response = await fetch(`/api/admin/widgets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save widget');
      }
      
      const updatedWidget = await response.json();
      setWidget(updatedWidget);
      setSaveStatus('success');
      setHasUnsavedChanges(false);
      
      toast({
        title: "Widget saved successfully",
        description: "Your changes have been saved.",
      });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save widget:', error);
      setSaveStatus('error');
      toast({
        variant: "destructive",
        title: "Failed to save widget",
        description: "There was a problem saving your changes.",
      });
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyEmbedCode = async () => {
    const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/widget-embed/${settings._id || 'widget-id'}"></script>`;
    try {
      await navigator.clipboard.writeText(embedCode);
      toast({
        title: "Embed code copied",
        description: "The embed code has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy embed code to clipboard.",
      });
    }
  };

  if (loading) {
    return (
      <ModernLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          
           <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-12rem)]">
             <Card className="lg:col-span-3">
               <CardHeader>
                 <Skeleton className="h-6 w-32" />
                 <Skeleton className="h-4 w-48" />
               </CardHeader>
               <CardContent className="space-y-4">
                 <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-8 w-full" />
                 <Skeleton className="h-8 w-full" />
               </CardContent>
             </Card>
             
             <Card className="lg:col-span-2">
               <CardHeader>
                 <Skeleton className="h-6 w-32" />
                 <Skeleton className="h-4 w-48" />
               </CardHeader>
               <CardContent>
                 <Skeleton className="h-64 w-full" />
               </CardContent>
             </Card>
           </div>
        </div>
      </ModernLayout>
    );
  }

  if (!widget) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <CardTitle className="mb-2">Widget not found</CardTitle>
                <CardDescription className="mb-6">
                  The widget you're looking for doesn't exist or has been deleted.
                </CardDescription>
                <Button onClick={() => router.push('/admin')} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {settings.branding?.title || 'Widget Editor'}
              </h1>
              <p className="text-muted-foreground">
                Customize your widget's appearance and behavior
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Save Status Indicator */}
            {saveStatus && (
              <Badge variant={saveStatus === 'success' ? 'default' : 'destructive'}>
                {saveStatus === 'success' ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Saved
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Save failed
                  </>
                )}
              </Badge>
            )}
            
            {/* Unsaved Changes Indicator */}
            {hasUnsavedChanges && !saveStatus && (
              <Badge variant="secondary">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
            
            {/* Embed Code Button */}
            <Button variant="outline" onClick={handleCopyEmbedCode}>
              <Share className="w-4 h-4 mr-2" />
              Embed Code
            </Button>
            
            {/* Save Button */}
            <Button 
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

         {/* Main Content */}
         <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-12rem)]">
           {/* Settings Panel - Takes up 3 columns for more space */}
           <Card className="flex flex-col lg:col-span-3">
             <CardHeader className="flex-shrink-0">
               <CardTitle className="flex items-center gap-2">
                 <SettingsIcon className="h-5 w-5" />
                 Widget Settings
               </CardTitle>
               <CardDescription>
                 Configure your widget's appearance and behavior
               </CardDescription>
             </CardHeader>
             <CardContent className="flex-1 overflow-y-auto p-0">
               <SettingsPanel
                 settings={settings}
                 onChange={setSettings}
                 onSave={handleSave}
                 saving={saving}
               />
             </CardContent>
           </Card>
           
           {/* Preview Panel - Takes up 2 columns */}
           <Card className="flex flex-col lg:col-span-2">
             <CardHeader className="flex-shrink-0">
               <CardTitle className="flex items-center gap-2">
                 <Eye className="h-5 w-5" />
                 Live Preview
               </CardTitle>
               <CardDescription>
                 See your changes in real-time. Click the chat button to test interactions.
               </CardDescription>
             </CardHeader>
             <CardContent className="flex-1 overflow-y-auto">
               <LivePreview widget={widget} settings={settings} showMobilePreview={false} />
             </CardContent>
           </Card>
         </div>
      </div>
    </ModernLayout>
  );
}


export async function getServerSideProps() {
  return {
    props: {},
  }
}


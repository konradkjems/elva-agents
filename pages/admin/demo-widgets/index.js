import { useState, useEffect } from 'react';
import ModernLayout from '../../../components/admin/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  MessageCircle,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

export default function DemoWidgetsPage() {
  const { toast } = useToast();
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemo, setSelectedDemo] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [usageStats, setUsageStats] = useState({});

  useEffect(() => {
    fetchDemos();
  }, []);

  const fetchDemos = async () => {
    try {
      const response = await fetch('/api/admin/demo-widgets');
      if (response.ok) {
        const data = await response.json();
        setDemos(data);
        
        // Fetch usage stats for each demo
        const statsPromises = data.map(async (demo) => {
          try {
            const usageResponse = await fetch(`/api/admin/demo-widgets/${demo._id}/usage`);
            if (usageResponse.ok) {
              const usageData = await usageResponse.json();
              return { demoId: demo._id, usage: usageData };
            }
          } catch (error) {
            console.error(`Failed to fetch usage for ${demo._id}:`, error);
          }
          return { demoId: demo._id, usage: null };
        });
        
        const stats = await Promise.all(statsPromises);
        const statsMap = {};
        stats.forEach(stat => {
          if (stat.usage) {
            statsMap[stat.demoId] = stat.usage;
          }
        });
        setUsageStats(statsMap);
      }
    } catch (error) {
      console.error('Failed to fetch demos:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load demo widgets",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetUsage = async (demoId) => {
    try {
      const response = await fetch(`/api/admin/demo-widgets/${demoId}/usage`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Usage counters reset successfully",
        });
        fetchDemos(); // Refresh data
      } else {
        throw new Error('Failed to reset usage');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset usage counters",
      });
    }
  };

  const captureScreenshot = async (demo, isRetake = false) => {
    try {
      const response = await fetch('/api/admin/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: demo.demoSettings?.clientWebsiteUrl,
          demoId: demo._id
        })
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: isRetake ? "Screenshot retake started" : "Screenshot capture started",
        });
        // Refresh data after a short delay to see the updated screenshot
        setTimeout(() => fetchDemos(), 2000);
      } else {
        throw new Error('Failed to capture screenshot');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to capture screenshot",
      });
    }
  };

  const deleteDemo = async (demoId) => {
    if (!confirm('Are you sure you want to delete this demo? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/demo-widgets/${demoId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Demo widget deleted successfully",
        });
        fetchDemos(); // Refresh data
      } else {
        throw new Error('Failed to delete demo');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete demo widget",
      });
    }
  };

  const getStatusBadge = (demo, usage) => {
    if (!demo.demoSettings?.usageLimits || !usage) {
      return <Badge variant="secondary">Unknown</Badge>;
    }

    const isExpired = demo.demoSettings.usageLimits.expiresAt ? 
      new Date(demo.demoSettings.usageLimits.expiresAt) < new Date() : false;

    const isLimitReached = usage.isLimitReached;

    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    if (isLimitReached.views || isLimitReached.interactions) {
      return <Badge variant="destructive">Limit Reached</Badge>;
    }

    return <Badge variant="default">Active</Badge>;
  };

  if (loading) {
    return (
      <ModernLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Demo Widgets</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Demo Widgets</h1>
            <p className="text-muted-foreground">
              Manage demo widgets for client demonstrations and sales
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={fetchDemos} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Demo
            </Button>
          </div>
        </div>

        {/* Demo Widgets Grid */}
        {demos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Demo Widgets</h3>
              <p className="text-gray-600 mb-4">
                Create your first demo widget to showcase your AI chat capabilities to potential clients.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Demo Widget
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demos.map((demo) => {
              const usage = usageStats[demo._id];
              return (
                <Card key={demo._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{demo.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {demo.demoSettings?.clientInfo || 'Demo Widget'}
                        </CardDescription>
                      </div>
                      {getStatusBadge(demo, usage)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Usage Stats */}
                    {usage && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-600">
                            {usage.currentUsage?.views || 0} / {demo.demoSettings?.usageLimits?.maxViews || 0} views
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                          <span className="text-gray-600">
                            {usage.currentUsage?.interactions || 0} / {demo.demoSettings?.usageLimits?.maxInteractions || 0} interactions
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Client Website */}
                    {demo.demoSettings?.clientWebsiteUrl && (
                      <div className="text-sm">
                        <p className="text-gray-600 mb-1">Client Website:</p>
                        <a 
                          href={demo.demoSettings.clientWebsiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {demo.demoSettings.clientWebsiteUrl}
                        </a>
                      </div>
                    )}

                    {/* Expiration */}
                    {demo.demoSettings?.usageLimits?.expiresAt && (
                      <div className="text-sm">
                        <p className="text-gray-600 mb-1">Expires:</p>
                        <p className="text-gray-900">
                          {new Date(demo.demoSettings.usageLimits.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {/* Screenshot Status */}
                    {demo.demoSettings?.clientWebsiteUrl && (
                      <div className="text-sm">
                        <p className="text-gray-600 mb-1">Screenshot:</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${
                            demo.demoSettings?.screenshotUrl 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {demo.demoSettings?.screenshotUrl ? 'Captured' : 'Not captured'}
                          </span>
                          <div className="flex items-center gap-2">
                            {demo.demoSettings?.screenshotUrl ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => captureScreenshot(demo, true)}
                                className="text-xs"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Retake
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => captureScreenshot(demo)}
                                className="text-xs"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Capture
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(demo.demoSettings?.demoUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetUsage(demo._id)}
                          disabled={!usage}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reset
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteDemo(demo._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Demo Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Create Demo Widget</CardTitle>
                <CardDescription>
                  Create a demo widget for client demonstrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Demo Creation
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Use the main widget creation form to create demo widgets.
                  </p>
                  <Button onClick={() => {
                    setShowCreateForm(false);
                    window.location.href = '/admin/widgets/create';
                  }}>
                    Go to Widget Creator
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ModernLayout>
  );
}

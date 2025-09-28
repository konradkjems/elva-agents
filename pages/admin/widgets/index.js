import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import ModernLayout from '@/components/admin/ModernLayout';
import {
  MessageCircle,
  Search,
  Calendar,
  Star,
  Download,
  Plus,
  Settings,
  BarChart3,
  Edit,
  Trash2,
  Eye,
  Play,
  MoreVertical,
  Copy,
  Users,
  Globe,
  Zap
} from 'lucide-react';

// Create Demo Modal Component
function CreateDemoModal({ widget, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientWebsiteUrl: '',
    clientInfo: '',
    usageLimits: {
      maxInteractions: 50,
      maxViews: 100,
      expiresAt: ''
    }
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestData = {
        widgetId: widget._id,
        sourceWidget: widget, // Send the complete widget data
        ...formData
      };
      
      console.log('📝 Sending demo creation request:', requestData);
      console.log('📝 Widget object being used:', widget);
      console.log('📝 Widget ID being sent:', widget._id);
      console.log('📝 API endpoint: /api/admin/demos');
      
      const response = await fetch('/api/admin/demos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📝 Response status:', response.status, response.statusText);
      console.log('📝 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('📝 Error response body:', errorText);
        throw new Error(`Failed to create demo: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('📝 Success response:', responseData);
      onSuccess();
    } catch (error) {
      console.error('Error creating demo:', error);
      // Error handling will be done by parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Demo from Widget</DialogTitle>
          <DialogDescription>
            Create a demo for "{widget.name}" that can be shared with clients.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Demo Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter demo name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter demo description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientWebsiteUrl">Client Website URL</Label>
            <Input
              id="clientWebsiteUrl"
              type="url"
              value={formData.clientWebsiteUrl}
              onChange={(e) => setFormData({ ...formData, clientWebsiteUrl: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientInfo">Client Information</Label>
            <Textarea
              id="clientInfo"
              value={formData.clientInfo}
              onChange={(e) => setFormData({ ...formData, clientInfo: e.target.value })}
              placeholder="Additional client information"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxInteractions">Max Interactions</Label>
              <Input
                id="maxInteractions"
                type="number"
                value={formData.usageLimits.maxInteractions}
                onChange={(e) => setFormData({
                  ...formData,
                  usageLimits: { ...formData.usageLimits, maxInteractions: parseInt(e.target.value) }
                })}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxViews">Max Views</Label>
              <Input
                id="maxViews"
                type="number"
                value={formData.usageLimits.maxViews}
                onChange={(e) => setFormData({
                  ...formData,
                  usageLimits: { ...formData.usageLimits, maxViews: parseInt(e.target.value) }
                })}
                min="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={formData.usageLimits.expiresAt}
              onChange={(e) => setFormData({
                ...formData,
                usageLimits: { ...formData.usageLimits, expiresAt: e.target.value }
              })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Demo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function WidgetsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // State for conversations tab
  const [widgets, setWidgets] = useState([]);
  const [selectedWidget, setSelectedWidget] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // State for widget management tab
  const [managementWidgets, setManagementWidgets] = useState([]);
  const [managementLoading, setManagementLoading] = useState(false);
  const [showCreateDemoModal, setShowCreateDemoModal] = useState(false);
  const [selectedWidgetForDemo, setSelectedWidgetForDemo] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Load initial data
  useEffect(() => {
    fetchWidgets();
  }, []);

  // Load conversations when widget selected
  useEffect(() => {
    if (selectedWidget) {
      fetchConversations();
    }
  }, [selectedWidget, dateFilter]);

  // Load management widgets when component mounts
  useEffect(() => {
    fetchManagementWidgets();
    fetchAnalyticsData();
  }, []);

  const fetchWidgets = async () => {
    try {
      const response = await fetch('/api/admin/widgets');
      if (response.ok) {
        const data = await response.json();
        setWidgets(data);
        if (data.length > 0) {
          setSelectedWidget(data[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch widgets:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load widgets",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    if (!selectedWidget) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        widgetId: selectedWidget,
        period: dateFilter,
        search: searchTerm
      });
      
      const response = await fetch(`/api/admin/conversations/widget/${selectedWidget}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        // Select first conversation if none selected
        if (data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load conversations",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupConversationsByDate = (conversations) => {
    const groups = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    conversations.forEach(conv => {
      const convDate = new Date(conv.startTime);
      let groupKey;
      
      if (convDate.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (convDate.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = convDate.toLocaleDateString('da-DK', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(conv);
    });
    
    return groups;
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            className={`h-3 w-3 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    );
  };

  const selectedWidgetName = widgets.find(w => w._id === selectedWidget)?.name || 'Select Widget';

  // Widget Management Functions
  const fetchManagementWidgets = async () => {
    try {
      setManagementLoading(true);
      const response = await fetch('/api/admin/widgets');
      if (response.ok) {
        const data = await response.json();
        console.log('📝 Fetched widgets:', data.length, 'widgets');
        console.log('📝 All widgets:', data.map(w => ({ name: w.name, id: w._id, isDemoMode: w.isDemoMode })));
        // Filter out demo widgets (they should be managed separately)
        const regularWidgets = data.filter(widget => !widget.isDemoMode);
        console.log('📝 Regular widgets (non-demo):', regularWidgets.length, 'widgets');
        console.log('📝 Regular widgets:', regularWidgets.map(w => ({ name: w.name, id: w._id })));
        setManagementWidgets(regularWidgets);
      }
    } catch (error) {
      console.error('Failed to fetch widgets:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load widgets",
      });
    } finally {
      setManagementLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch('/api/analytics/metrics?period=30d');
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleCreateDemo = (widget) => {
    console.log('📝 Creating demo for widget:', widget);
    console.log('📝 Widget ID:', widget._id);
    console.log('📝 Widget name:', widget.name);
    console.log('📝 Widget isDemoMode:', widget.isDemoMode);
    console.log('📝 Widget from managementWidgets:', managementWidgets.find(w => w._id === widget._id));
    setSelectedWidgetForDemo(widget);
    setShowCreateDemoModal(true);
  };

  const handleDeleteWidget = async (widgetId) => {
    if (!confirm('Are you sure you want to delete this widget? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/widgets/${widgetId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Widget deleted successfully",
        });
        fetchManagementWidgets(); // Refresh data
      } else {
        throw new Error('Failed to delete widget');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete widget",
      });
    }
  };

  const getStatusBadge = (widget) => {
    switch (widget.status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Helper functions for modern widget cards
  const getStatusColor = (status) => {
    return status === 'active' ? "default" : "secondary";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleViewWidget = (widgetId) => {
    window.open(`/widget-preview/${widgetId}`, '_blank');
  };

  const handleDuplicateWidget = async (widget) => {
    try {
      const response = await fetch('/api/admin/widgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...widget,
          name: `${widget.name} (Copy)`,
          _id: undefined,
        }),
      });

      if (response.ok) {
        toast({
          title: "Widget duplicated",
          description: "The widget has been successfully duplicated.",
        });
        fetchManagementWidgets(); // Refresh the list
      } else {
        throw new Error('Failed to duplicate widget');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Duplication failed",
        description: "There was a problem duplicating the widget.",
      });
    }
  };

  // Get widget-specific analytics data
  const getWidgetAnalytics = (widget) => {
    console.log('📝 Getting analytics for widget:', widget.name, widget._id);
    console.log('📝 Widget stats:', widget.stats);
    
    // First try to get data from the widget's own stats if available
    if (widget.stats) {
      const analytics = {
        conversations: widget.stats.totalConversations || 0,
        users: widget.stats.uniqueUsers || 0,
        avgResponseTime: widget.stats.responseTime ? (widget.stats.responseTime / 1000).toFixed(1) : 0
      };
      console.log('📝 Using widget stats:', analytics);
      return analytics;
    }

    // Fallback to analytics data if available
    if (!analyticsData?.widgetMetrics) return {
      conversations: 0,
      users: 0,
      avgResponseTime: 0
    };

    const widgetMetrics = analyticsData.widgetMetrics.find(wm => wm.widgetId === widget._id);
    if (!widgetMetrics) return {
      conversations: 0,
      users: 0,
      avgResponseTime: 0
    };

    return {
      conversations: widgetMetrics.totalConversations || 0,
      users: widgetMetrics.uniqueUsers || 0,
      avgResponseTime: widgetMetrics.avgResponseTime ? (widgetMetrics.avgResponseTime / 1000).toFixed(1) : 0
    };
  };

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Widgets</h1>
            <p className="text-muted-foreground">
              Manage your widgets and view conversations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/analytics')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button
              onClick={() => router.push('/admin/widgets/create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Widget
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={router.query.tab === 'conversations' ? 'conversations' : 'management'} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="management">Widget Management</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
          </TabsList>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedWidget} onValueChange={setSelectedWidget}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select a widget" />
                </SelectTrigger>
                <SelectContent>
                  {widgets.map(widget => (
                    <SelectItem key={widget._id} value={widget._id}>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        {widget.name}
                        <Badge variant={widget.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                          {widget.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Main Content */}
            {selectedWidget ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
                {/* Conversation List */}
                <Card className="flex flex-col min-h-0">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      Conversations
                    </CardTitle>
                    <CardDescription>
                      {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} found
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto min-h-0">
                      {loading ? (
                        <div className="p-4 space-y-4">
                          {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No conversations found</p>
                          <p className="text-sm">Try adjusting your filters</p>
                        </div>
                      ) : (
                        Object.entries(groupConversationsByDate(conversations)).map(([date, convs]) => (
                          <div key={date}>
                            <div className="px-4 py-2 bg-muted/50 border-b">
                              <h4 className="text-sm font-medium text-muted-foreground">{date}</h4>
                            </div>
                            {convs.map(conversation => (
                              <div
                                key={conversation._id}
                                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                                  selectedConversation?._id === conversation._id ? 'bg-muted' : ''
                                }`}
                                onClick={() => setSelectedConversation(conversation)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-sm font-medium">
                                    #{conversation._id.slice(-6)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(conversation.startTime).toLocaleTimeString('da-DK', {
                                      hour: '2-digit',
                                      minute: '2-digit', hour12: false
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {conversation.messages?.[0]?.content || 'No messages'}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
                                  </span>
                                  {renderStars(conversation.satisfaction)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Chat View */}
                <Card className="lg:col-span-2 flex flex-col min-h-0">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle>
                      {selectedConversation ? `Conversation #${selectedConversation._id.slice(-6)}` : 'Select a conversation'}
                    </CardTitle>
                    {selectedConversation && (
                      <CardDescription>
                        Started {new Date(selectedConversation.startTime).toLocaleString('da-DK', { hour12: false })} • 
                        {selectedConversation.metadata?.country && ` ${selectedConversation.metadata.country} • `}
                        {selectedConversation.messageCount} messages
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0">
                    {selectedConversation ? (
                      <div className="space-y-4 flex-1 overflow-y-auto p-4 min-h-0">
                        {selectedConversation.messages?.map((message, index) => (
                          <div
                            key={index}
                            className={`flex ${message.type === 'user' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                message.type === 'user'
                                  ? 'bg-muted text-foreground'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                message.type === 'user' ? 'text-muted-foreground' : 'text-primary-foreground/70'
                              }`}>
                                {new Date(message.timestamp).toLocaleTimeString('da-DK', {
                                  hour: '2-digit',
                                  minute: '2-digit', hour12: false
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center flex-1 text-muted-foreground">
                        <div className="text-center">
                          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Select a conversation to view messages</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No widgets found</p>
                    <Button onClick={() => router.push('/admin/widgets/create')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create your first widget
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Widget Management Tab */}
          <TabsContent value="management" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Widget Management</h2>
                <p className="text-muted-foreground">
                  Manage your widgets and create demos
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={fetchManagementWidgets} variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={() => router.push('/admin/widgets/create')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Widget
                </Button>
              </div>
            </div>

            {/* Widgets Grid */}
            {managementLoading ? (
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
            ) : managementWidgets.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Widgets</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first widget to get started
                  </p>
                  <Button onClick={() => router.push('/admin/widgets/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Widget
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {managementWidgets.map((widget) => (
                  <Card key={widget._id} className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 border hover:border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                              {getInitials(widget.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg font-semibold truncate">
                              {widget.name}
                            </CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={getStatusColor(widget.status)}>
                                {widget.status === 'active' ? 'Active' : 'Inactive'}
                              </Badge>
                              {widget.domain && (
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Globe className="h-3 w-3 mr-1" />
                                  {widget.domain}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewWidget(widget._id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Preview Widget
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/widgets/${widget._id}`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Widget
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateWidget(widget)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteWidget(widget._id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {widget.description || 'No description provided'}
                      </p>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="text-lg font-semibold">
                            {getWidgetAnalytics(widget).conversations}
                          </div>
                          <div className="text-xs text-muted-foreground">Conversations</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Users className="h-4 w-4 text-green-500" />
                          </div>
                          <div className="text-lg font-semibold">
                            {getWidgetAnalytics(widget).users}
                          </div>
                          <div className="text-xs text-muted-foreground">Users</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Zap className="h-4 w-4 text-purple-500" />
                          </div>
                          <div className="text-lg font-semibold">
                            {getWidgetAnalytics(widget).avgResponseTime}s
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Response</div>
                        </div>
                      </div>

                      {/* Last Activity */}
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        Last updated {formatDate(widget.updatedAt || widget.createdAt)}
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      <div className="flex w-full space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => router.push(`/admin/analytics?widget=${widget._id}`)}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => router.push(`/admin/widgets/${widget._id}`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleCreateDemo(widget)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Demo
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Demo Modal */}
        {showCreateDemoModal && selectedWidgetForDemo && (
          <CreateDemoModal
            widget={selectedWidgetForDemo}
            onClose={() => {
              setShowCreateDemoModal(false);
              setSelectedWidgetForDemo(null);
            }}
            onSuccess={() => {
              setShowCreateDemoModal(false);
              setSelectedWidgetForDemo(null);
              toast({
                title: "Demo Created",
                description: "Demo has been created successfully!",
              });
            }}
          />
        )}
      </div>
    </ModernLayout>
  );
}

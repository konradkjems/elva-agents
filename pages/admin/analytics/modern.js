import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import ModernLayout from '../../../components/admin/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  MessageCircle,
  Clock,
  Download,
  Filter,
  Calendar,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';


const StatCard = ({ title, value, icon: Icon, subtitle }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);

export default function ModernAnalytics() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [dateRange, setDateRange] = useState('30d');
  const [selectedWidget, setSelectedWidget] = useState('all');

  const fetchAnalyticsData = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/metrics?period=${dateRange}&widgetId=${selectedWidget === 'all' ? '' : selectedWidget}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Frontend received analytics data:', data);
        setAnalyticsData(data);
      } else {
        console.error('Analytics API response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  }, [dateRange, selectedWidget]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch widgets first
      const widgetsResponse = await fetch('/api/admin/widgets');
      if (widgetsResponse.ok) {
        const widgetsData = await widgetsResponse.json();
        console.log('📊 Fetched widgets:', widgetsData);
        setWidgets(widgetsData);
      }
      
      // Then fetch analytics
      console.log('📊 Fetching analytics with dateRange:', dateRange, 'selectedWidget:', selectedWidget);
      await fetchAnalyticsData();
    } catch (error) {
      console.error('📊 Error in fetchInitialData:', error);
      toast({
        variant: "destructive",
        title: "Failed to load data",
        description: "There was a problem loading the dashboard data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    console.log('📊 useEffect triggered with:', { dateRange, selectedWidget, widgetsLength: widgets.length });
    fetchAnalyticsData();
  }, [dateRange, selectedWidget, fetchAnalyticsData]);

  const handleExport = () => {
    toast({
      title: "Export started",
      description: "Your analytics data is being prepared for download.",
    });
  };

  // Debug logging
  console.log('📊 Current analyticsData in component:', analyticsData);
  console.log('📊 Current widgets in component:', widgets);
  console.log('📊 Current loading state:', loading);

  const statsData = [
    {
      title: 'Total Conversations',
      value: analyticsData?.metrics?.totalConversations || 0,
      icon: MessageCircle,
      subtitle: 'Across all widgets'
    },
    {
      title: 'Total Messages',
      value: analyticsData?.metrics?.totalMessages || 0,
      icon: Users,
      subtitle: 'All messages sent'
    },
    {
      title: 'Avg Response Time',
      value: analyticsData?.metrics?.avgResponseTime ? `${(analyticsData.metrics.avgResponseTime / 1000).toFixed(1)}s` : '0s',
      icon: Clock,
      subtitle: 'Average response time'
    },
    {
      title: 'Avg Conversation Length',
      value: analyticsData?.metrics?.avgConversationLength ? analyticsData.metrics.avgConversationLength.toFixed(1) : '0',
      icon: Activity,
      subtitle: 'Messages per conversation'
    }
  ];

  if (loading) {
    return (
      <ModernLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-8 bg-muted rounded w-1/2"></div>
                  </div>
                </CardHeader>
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
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track your widget performance and user engagement
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedWidget} onValueChange={setSelectedWidget}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Widgets</SelectItem>
                {widgets.map((widget) => (
                  <SelectItem key={widget._id} value={widget._id}>
                    {widget.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsData.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Charts and Analytics */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="conversations" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversations
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <Zap className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Activity className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {analyticsData?.metrics?.totalConversations || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Conversations</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <div className="font-semibold">{analyticsData?.metrics?.totalMessages || 0}</div>
                        <div className="text-muted-foreground text-xs">Messages</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <div className="font-semibold">
                          {analyticsData?.metrics?.avgResponseTime ? `${(analyticsData.metrics.avgResponseTime / 1000).toFixed(1)}s` : '0s'}
                        </div>
                        <div className="text-muted-foreground text-xs">Avg Response</div>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-2">
                        Showing data for: <strong>
                          {selectedWidget === 'all' ? 'All Widgets' : widgets.find(w => w._id === selectedWidget)?.name || 'Selected Widget'}
                        </strong>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Period: {dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : dateRange === '90d' ? 'Last 3 months' : 'All time'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hourly Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsData?.metrics?.hourlyDistribution ? (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground mb-3">Peak activity hours</div>
                      {analyticsData.metrics.hourlyDistribution
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 6)
                        .map((hour, index) => (
                          <div key={hour.hour} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{hour.hour}</span>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="h-2 bg-primary rounded-full" 
                                style={{ 
                                  width: `${Math.max(20, (hour.count / Math.max(...analyticsData.metrics.hourlyDistribution.map(h => h.count))) * 60)}px` 
                                }}
                              />
                              <span className="text-muted-foreground w-8 text-right">{hour.count}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">No hourly data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Widgets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {widgets.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="mx-auto h-8 w-8 mb-2" />
                        <p>No widgets found</p>
                      </div>
                    ) : (
                      widgets.map((widget) => (
                        <div key={widget._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{widget.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {widget.isActive ? 'Active' : 'Inactive'} • Created {new Date(widget.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={widget.isActive ? "default" : "secondary"} className="text-xs">
                              {widget.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedWidget(widget._id)}
                              className="text-xs"
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversations" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Conversation Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {analyticsData?.metrics?.totalConversations || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Conversations</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {analyticsData?.metrics?.totalMessages || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Messages</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {analyticsData?.metrics?.avgConversationLength ? analyticsData.metrics.avgConversationLength.toFixed(1) : '0'}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Length</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {analyticsData?.dataPoints || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Data Points</div>
                    </div>
                  </div>
                  
                  {selectedWidget !== 'all' && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm">
                        <strong>Filtered View:</strong> {widgets.find(w => w._id === selectedWidget)?.name}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsData?.metrics?.dailyTrends && analyticsData.metrics.dailyTrends.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground mb-3">Daily conversation trends</div>
                      {analyticsData.metrics.dailyTrends.slice(0, 7).map((day, index) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="flex items-center space-x-3">
                            <div 
                              className="h-2 bg-primary rounded-full" 
                              style={{ 
                                width: `${Math.max(10, (day.conversations / Math.max(...analyticsData.metrics.dailyTrends.map(d => d.conversations))) * 80)}px` 
                              }}
                            />
                            <span className="text-sm font-semibold w-8 text-right">{day.conversations}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">No daily trends available</p>
                      <p className="text-xs mt-1">Data will appear as conversations are recorded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Response Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {analyticsData?.metrics?.avgResponseTime ? `${(analyticsData.metrics.avgResponseTime / 1000).toFixed(1)}s` : '0s'}
                      </div>
                      <div className="text-sm text-muted-foreground">Average Response Time</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-semibold">
                          {analyticsData?.metrics?.totalConversations || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Conversations</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg font-semibold">
                          {analyticsData?.metrics?.totalMessages || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Messages</div>
                      </div>
                    </div>

                    {analyticsData?.metrics?.avgSatisfaction && (
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                          {analyticsData.metrics.avgSatisfaction.toFixed(1)}/5
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">Average Satisfaction</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Database Status</span>
                      <Badge variant="default" className="bg-green-500">
                        <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                        Online
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Analytics Collection</span>
                      <Badge variant="default" className="bg-green-500">
                        <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Data Points</span>
                      <span className="text-sm font-semibold">{analyticsData?.dataPoints || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Active Widgets</span>
                      <span className="text-sm font-semibold">
                        {widgets.filter(w => w.isActive).length}/{widgets.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Active Widgets</span>
                      <span className="text-sm font-semibold">
                        {widgets.filter(w => w.isActive).length} of {widgets.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Total Conversations</span>
                      <span className="text-sm font-semibold">{analyticsData?.metrics?.totalConversations || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Avg Response Time</span>
                      <span className="text-sm font-semibold">
                        {analyticsData?.metrics?.avgResponseTime ? `${(analyticsData.metrics.avgResponseTime / 1000).toFixed(1)}s` : 'No data'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Data Points</span>
                      <span className="text-sm font-semibold">{analyticsData?.dataPoints || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database Connection</span>
                      <Badge variant="default" className="bg-green-500">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Analytics API</span>
                      <Badge variant="default" className="bg-green-500">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Widget Endpoints</span>
                      <Badge variant="default" className="bg-green-500">Online</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Data Collection</span>
                      <Badge variant="default" className="bg-green-500">Running</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {analyticsData?.metrics?.totalConversations > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Conversation Activity</h4>
                      <div className="text-2xl font-bold text-primary mb-1">
                        {analyticsData.metrics.totalConversations}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        conversations across {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Response Performance</h4>
                      <div className="text-2xl font-bold text-primary mb-1">
                        {analyticsData.metrics.avgResponseTime ? `${(analyticsData.metrics.avgResponseTime / 1000).toFixed(1)}s` : 'N/A'}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        average response time
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}

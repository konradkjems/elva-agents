import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import ModernLayout from '../../../components/admin/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import {
  Users,
  MessageCircle,
  Clock,
  Download,
  Filter,
  Calendar,
  BarChart3,
  Activity,
  Zap,
  Star,
  TrendingUp
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
  const [satisfactionData, setSatisfactionData] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [dateRange, setDateRange] = useState('30d');
  const [selectedWidget, setSelectedWidget] = useState('all');
  const [activeChart, setActiveChart] = useState('conversations');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Chart data preparation functions
  const prepareDailyTrendsChart = (dailyTrends) => {
    if (!dailyTrends || dailyTrends.length === 0) return [];
    
    return dailyTrends.map(day => {
      const conversations = Math.max(0, day.conversations || 0);
      const messages = Math.max(0, day.messages || 0);
      
      // Debug negative values
      if (day.conversations < 0 || day.messages < 0) {
        console.warn('🚨 Negative values detected in daily trends:', {
          date: day.date,
          originalConversations: day.conversations,
          originalMessages: day.messages,
          correctedConversations: conversations,
          correctedMessages: messages
        });
      }
      
      return {
        date: new Date(day.date).toLocaleDateString('da-DK', { 
          month: 'short', 
          day: 'numeric' 
        }),
        conversations,
        messages
      };
    });
  };

  const prepareHourlyChart = (hourlyDistribution) => {
    if (!hourlyDistribution || hourlyDistribution.length === 0) return [];
    
    return hourlyDistribution
      .sort((a, b) => {
        // Extract hour number from "HH:00" format and sort numerically
        const hourA = parseInt(a.hour.split(':')[0]);
        const hourB = parseInt(b.hour.split(':')[0]);
        return hourA - hourB;
      })
      .map(hour => ({
        hour: `${hour.hour}`,
        activity: hour.count
      }));
  };


  const fetchAnalyticsData = useCallback(async () => {
    try {
      let url = `/api/analytics/metrics?widgetId=${selectedWidget === 'all' ? '' : selectedWidget}`;
      
      if (dateRange === 'custom' && customDateRange?.from && customDateRange?.to) {
        url += `&period=custom&startDate=${customDateRange.from.toISOString()}&endDate=${customDateRange.to.toISOString()}`;
      } else {
        url += `&period=${dateRange}`;
      }
      
      const response = await fetch(url);
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
  }, [dateRange, selectedWidget, customDateRange]);

  const fetchSatisfactionData = useCallback(async () => {
    if (selectedWidget === 'all') {
      setSatisfactionData(null);
      return;
    }
    
    try {
      let url = `/api/satisfaction/analytics?widgetId=${selectedWidget}`;
      
      if (dateRange === 'custom' && customDateRange?.from && customDateRange?.to) {
        url += `&timeRange=custom&startDate=${customDateRange.from.toISOString()}&endDate=${customDateRange.to.toISOString()}`;
      } else {
        url += `&timeRange=${dateRange}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('⭐ Frontend received satisfaction data:', data);
        setSatisfactionData(data.data);
      } else {
        console.error('Satisfaction API response not ok:', response.status, response.statusText);
        setSatisfactionData(null);
      }
    } catch (error) {
      console.error('Failed to fetch satisfaction data:', error);
      setSatisfactionData(null);
    }
  }, [dateRange, selectedWidget, customDateRange]);

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
    fetchSatisfactionData();
  }, [dateRange, selectedWidget, fetchAnalyticsData, fetchSatisfactionData]);


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
      title: 'Avg Satisfaction',
      value: satisfactionData?.average ? `${satisfactionData.average.toFixed(1)} ⭐` : 'N/A',
      icon: Star,
      subtitle: satisfactionData?.total ? `${satisfactionData.total} ratings` : 'No ratings yet'
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
            <Select 
              value={dateRange} 
              onValueChange={(value) => {
                setDateRange(value);
                if (value === 'custom') {
                  setShowDatePicker(true);
                } else {
                  setShowDatePicker(false);
                  setCustomDateRange(null);
                }
              }}
            >
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="custom">Custom range...</SelectItem>
              </SelectContent>
            </Select>
            {showDatePicker && (
              <DateRangePicker
                dateRange={customDateRange}
                onDateRangeChange={(range) => {
                  setCustomDateRange(range);
                  if (range?.from && range?.to) {
                    setShowDatePicker(false);
                  }
                }}
              />
            )}
            <Select value={selectedWidget} onValueChange={setSelectedWidget}>
              <SelectTrigger className="w-48">
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
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="satisfaction" className="gap-2">
              <Star className="h-4 w-4" />
              Satisfaction
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Activity className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Widget Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Widget Performance Overview</CardTitle>
                <p className="text-sm text-muted-foreground">Compare performance across all your widgets</p>
              </CardHeader>
              <CardContent>
                {analyticsData?.widgetsWithAnalytics && analyticsData.widgetsWithAnalytics.length > 0 ? (
                  <div className="space-y-3">
                    {analyticsData?.widgetsWithAnalytics?.slice(0, 5).map((widget) => (
                      <div key={widget._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <div className="flex-1">
                          <div className="font-medium">{widget.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {widget.stats?.conversations || 0} conversations • {widget.stats?.messages || 0} messages
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-semibold">{widget.stats?.responseTime ? `${(widget.stats.responseTime / 1000).toFixed(1)}s` : '0s'}</div>
                            <div className="text-xs text-muted-foreground">Response</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{widget.stats?.totalMessages || 0}</div>
                            <div className="text-xs text-muted-foreground">Messages</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {analyticsData?.widgetsWithAnalytics && analyticsData.widgetsWithAnalytics.length > 5 && (
                      <div className="text-center text-sm text-muted-foreground pt-2">
                        Showing top 5 widgets • {analyticsData.widgetsWithAnalytics.length - 5} more available
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-sm">No widgets available</p>
                    <p className="text-xs mt-1">Create your first widget to see performance data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Trends - Interactive Line Chart */}
            <Card className="py-4 sm:py-0">
              <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
                  <CardTitle>Activity Trends</CardTitle>
                  <p className="text-sm text-muted-foreground">Recent conversation and message activity</p>
                </div>
                {analyticsData?.metrics?.dailyTrends && analyticsData.metrics.dailyTrends.length > 0 && (
                  <div className="flex">
                    {["conversations", "messages"].map((key) => {
                      const total = analyticsData.metrics.dailyTrends.reduce((acc, curr) => acc + (curr[key] || 0), 0);
                      const isActive = activeChart === key;
                      return (
                        <button
                          key={key}
                          data-active={isActive}
                          className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                          onClick={() => setActiveChart(key)}
                        >
                          <span className="text-muted-foreground text-xs">
                            {key === 'conversations' ? 'Conversations' : 'Messages'}
                          </span>
                          <span className="text-lg leading-none font-bold sm:text-3xl">
                            {total.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardHeader>
              <CardContent className="px-2 sm:p-6">
                {analyticsData?.metrics?.dailyTrends && analyticsData.metrics.dailyTrends.length > 0 ? (
                  <ChartContainer
                    config={{
                      conversations: {
                        label: "Conversations",
                        color: "hsl(var(--primary))",
                      },
                      messages: {
                        label: "Messages", 
                        color: "hsl(var(--destructive))",
                      },
                    }}
                    className="aspect-auto h-[250px] w-full"
                  >
                    <LineChart
                      accessibilityLayer
                      data={prepareDailyTrendsChart(analyticsData.metrics.dailyTrends)}
                      margin={{
                        left: 12,
                        right: 12,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={32}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 'auto']}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            className="w-[150px]"
                            nameKey="views"
                            labelFormatter={(value) => {
                              // Find the original date from the data
                              const dataPoint = analyticsData.metrics.dailyTrends.find(d => 
                                new Date(d.date).toLocaleDateString('da-DK', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                }) === value
                              );
                              if (dataPoint) {
                                return new Date(dataPoint.date).toLocaleDateString('da-DK', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                });
                              }
                              return value;
                            }}
                          />
                        }
                      />
                      <Line
                        dataKey={activeChart}
                        type="monotone"
                        stroke={`var(--color-${activeChart})`}
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          // Only show dot if value is greater than 0
                          if (payload && payload[activeChart] > 0) {
                            return <circle cx={cx} cy={cy} r={3} fill={`var(--color-${activeChart})`} />;
                          }
                          return null;
                        }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-sm">No trend data available</p>
                    <p className="text-xs mt-1">Data will appear as conversations are recorded</p>
                  </div>
                )}
              </CardContent>
              {analyticsData?.metrics?.dailyTrends && analyticsData.metrics.dailyTrends.length > 0 && (
                <CardFooter className="flex-col items-start gap-2 text-sm">
                  <div className="flex gap-2 leading-none font-medium">
                    {activeChart === 'conversations' ? 'Conversation' : 'Message'} activity trending up <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="text-muted-foreground leading-none">
                    Showing {activeChart === 'conversations' ? 'conversation' : 'message'} trends for the selected time range
                  </div>
                </CardFooter>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="conversations" className="space-y-4">
            {/* Daily Conversation Trends - Enhanced Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Conversation Trends</CardTitle>
                <p className="text-sm text-muted-foreground">Conversation and message activity over time</p>
              </CardHeader>
              <CardContent>
                {analyticsData?.metrics?.dailyTrends && analyticsData.metrics.dailyTrends.length > 0 ? (
                  <ChartContainer
                    config={{
                      conversations: {
                        label: "Conversations",
                        color: "hsl(var(--primary))",
                      },
                      messages: {
                        label: "Messages", 
                        color: "hsl(var(--destructive))",
                      },
                    }}
                    className="h-[350px]"
                  >
                    <LineChart
                      accessibilityLayer
                      data={prepareDailyTrendsChart(analyticsData.metrics.dailyTrends)}
                      margin={{
                        left: 12,
                        right: 12,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 'auto']}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Line
                        dataKey="conversations"
                        type="monotone"
                        stroke="var(--color-conversations)"
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          // Only show dot if value is greater than 0
                          if (payload && payload.conversations > 0) {
                            return <circle cx={cx} cy={cy} r={4} fill="var(--color-conversations)" />;
                          }
                          return null;
                        }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        dataKey="messages"
                        type="monotone"
                        stroke="var(--color-messages)"
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          // Only show dot if value is greater than 0
                          if (payload && payload.messages > 0) {
                            return <circle cx={cx} cy={cy} r={4} fill="var(--color-messages)" />;
                          }
                          return null;
                        }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-sm">No daily trends available</p>
                    <p className="text-xs mt-1">Data will appear as conversations are recorded</p>
                  </div>
                )}
              </CardContent>
              {analyticsData?.metrics?.dailyTrends && analyticsData.metrics.dailyTrends.length > 0 && (
                <CardFooter className="flex-col items-start gap-2 text-sm">
                  <div className="flex gap-2 leading-none font-medium">
                    Conversation activity trending up <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="text-muted-foreground leading-none">
                    Showing detailed conversation and message trends for the selected time range
                  </div>
                </CardFooter>
              )}
            </Card>

            {/* Conversation Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Total Conversations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {analyticsData?.metrics?.totalConversations || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    All conversations in selected period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Total Messages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {analyticsData?.metrics?.totalMessages || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Messages sent across all conversations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Unique Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {analyticsData?.metrics?.uniqueUsers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Individual users who started conversations
                  </p>
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
                         {widgets.filter(w => w.status === 'active').length}/{widgets.length}
                       </span>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </div>

           </TabsContent>

          <TabsContent value="satisfaction" className="space-y-4">
            {selectedWidget === 'all' ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Please select a specific widget to view satisfaction ratings
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : !satisfactionData || satisfactionData.total === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No satisfaction ratings yet for this widget
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Satisfaction Overview */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Average Rating
                      </CardTitle>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {satisfactionData.average.toFixed(1)} ⭐
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Out of 5 stars
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Ratings
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{satisfactionData.total}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ratings received
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Satisfaction Rate
                      </CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {satisfactionData.distribution ? 
                          Math.round(((satisfactionData.distribution[4] + satisfactionData.distribution[5]) / satisfactionData.total) * 100) : 0}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        4-5 star ratings
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Rating Distribution */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Rating Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = satisfactionData.distribution?.[rating] || 0;
                          const percentage = satisfactionData.total > 0 ? (count / satisfactionData.total) * 100 : 0;
                          const emoji = ['😡', '😞', '😐', '😊', '🤩'][rating - 1];
                          
                          return (
                            <div key={rating} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                  <span className="text-lg">{emoji}</span>
                                  <span className="font-medium">{rating} Star</span>
                                </span>
                                <span className="text-muted-foreground">
                                  {count} ({percentage.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-yellow-500 h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rating Trends */}
                  {satisfactionData.trends?.daily && satisfactionData.trends.daily.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Rating Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={{
                            average: {
                              label: "Average Rating",
                              color: "hsl(var(--chart-1))",
                            },
                          }}
                          className="h-[300px]"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={satisfactionData.trends.daily.map(day => ({
                              date: new Date(day.date).toLocaleDateString('da-DK', { month: 'short', day: 'numeric' }),
                              average: day.average
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis 
                                domain={[0, 5]}
                                tick={{ fontSize: 12 }}
                              />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Line 
                                type="monotone" 
                                dataKey="average" 
                                stroke="hsl(var(--chart-1))" 
                                strokeWidth={2}
                                dot={{ r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Recent Ratings with Feedback */}
                {satisfactionData.recentRatings && satisfactionData.recentRatings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Ratings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {satisfactionData.recentRatings.slice(0, 10).map((rating, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                            <div className="text-2xl">
                              {['😡', '😞', '😐', '😊', '🤩'][rating.rating - 1]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{rating.rating} stars</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(rating.submittedAt).toLocaleDateString('da-DK', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              {rating.feedback && (
                                <p className="text-sm text-muted-foreground">"{rating.feedback}"</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
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
                        {widgets.filter(w => w.status === 'active').length} of {widgets.length}
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

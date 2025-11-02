import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import ModernLayout from '../../components/admin/ModernLayout';
import ModernWidgetCard from '../../components/admin/ModernWidgetCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  MessageCircle,
  Users,
  Activity,
  Zap,
  Plus,
  ArrowUpRight,
  Calendar,
  Filter,
  Building2,
  Crown,
  Star,
  Info,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QuotaUsageCard from '../../components/admin/QuotaUsageCard';

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

export default function ModernAdminDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [widgets, setWidgets] = useState([]);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orgLoading, setOrgLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const { toast } = useToast();
  const isReadOnly = session?.user?.teamRole === 'member';

  useEffect(() => {
    if (session?.user?.currentOrganizationId) {
      fetchCurrentOrganization();
      fetchDashboardData();
    }
  }, [session]);

  useEffect(() => {
    fetchAnalyticsData();
    fetchDashboardData();
  }, [dateRange]);

  useEffect(() => {
    if (isCustomRange && customDateRange?.from && customDateRange?.to) {
      fetchAnalyticsData();
      fetchDashboardData();
    }
  }, [customDateRange, isCustomRange]);

  const fetchCurrentOrganization = async () => {
    try {
      const response = await fetch(`/api/organizations/${session.user.currentOrganizationId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentOrganization(data.organization);
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    } finally {
      setOrgLoading(false);
    }
  };

  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      let url = '/api/admin/analytics-overview';
      const params = new URLSearchParams();
      
      if (isCustomRange && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
        params.append('period', 'custom');
      } else {
        params.append('period', dateRange);
      }
      
      if (forceRefresh) {
        params.append('refresh', 'true');
      }
      
      const response = await fetch(`${url}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setWidgets(data.widgets || []);
      setAnalyticsOverview(data.overview || {});
      
      if (forceRefresh) {
        toast({
          title: "Data refreshed",
          description: "Dashboard data has been updated.",
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Failed to load dashboard",
        description: "There was a problem loading your dashboard data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async (forceRefresh = false) => {
    try {
      let url = `/api/analytics/metrics`;
      const params = new URLSearchParams();
      
      if (isCustomRange && customDateRange?.from && customDateRange?.to) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
        params.append('period', 'custom');
      } else {
        params.append('period', dateRange);
      }
      
      if (forceRefresh) {
        params.append('refresh', 'true');
      }
      
      const response = await fetch(`${url}?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Dashboard received analytics data:', data);
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchDashboardData(true),
      fetchAnalyticsData(true)
    ]);
  };

  const handleCreateWidget = () => {
    router.push('/admin/widgets/create');
  };

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    setIsCustomRange(false);
    setCustomDateRange(null);
  };

  const handleCustomDateRangeChange = (range) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      setIsCustomRange(true);
      setDateRange('custom');
    }
  };

  const getDateRangeLabel = () => {
    if (isCustomRange && customDateRange?.from && customDateRange?.to) {
      return `${format(customDateRange.from, 'MMM dd')} - ${format(customDateRange.to, 'MMM dd, yyyy')}`;
    }
    switch (dateRange) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 3 months';
      case 'all': return 'All time';
      default: return 'Custom range';
    }
  };

  const statsData = [
    {
      title: 'Total Widgets',
      value: widgets.length || 0,
      icon: MessageCircle,
      subtitle: `${analyticsOverview?.activeWidgets || 0} active`
    },
    {
      title: 'Total Conversations',
      value: analyticsOverview?.totalConversations || 0,
      icon: Users,
      subtitle: `${analyticsData?.metrics?.totalMessages || 0} messages`
    },
    {
      title: 'Avg Satisfaction', 
      value: analyticsOverview?.satisfaction?.average 
        ? `${analyticsOverview.satisfaction.average.toFixed(1)} ⭐` 
        : 'N/A',
      icon: Star,
      subtitle: analyticsOverview?.satisfaction?.total 
        ? `${analyticsOverview.satisfaction.total} ratings` 
        : 'No ratings yet'
    },
    {
      title: 'Avg Response Time',
      value: analyticsData?.metrics?.avgResponseTime ? `${(analyticsData.metrics.avgResponseTime / 1000).toFixed(1)}s` : '0s',
      icon: Zap,
      subtitle: 'Response performance'
    }
  ];

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              {session?.user?.role === 'platform_admin' && (
                <Badge variant="outline" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Platform Admin
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your AI chat widgets.
            </p>
            
            {/* Organization Context */}
            {!orgLoading && currentOrganization && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5">
                  <Building2 className="h-3 w-3" />
                  {currentOrganization.name}
                  <span className="mx-1">•</span>
                  <span className="capitalize">{currentOrganization.plan || 'free'}</span>
                </Badge>
                {currentOrganization.role && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {currentOrganization.role}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {getDateRangeLabel()}
                </Badge>
              </div>
            )}
            
            {orgLoading && (
              <div className="mt-3 flex items-center gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20" />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            
            {dateRange === 'custom' && (
              <DateRangePicker
                dateRange={customDateRange}
                onDateRangeChange={handleCustomDateRangeChange}
                placeholder="Select date range"
              />
            )}
            
            {!isReadOnly && (
              <Button onClick={handleCreateWidget} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Widget
              </Button>
            )}
          </div>
        </div>

        {/* Organization Management & Quota */}
        {!isReadOnly && currentOrganization && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Organization Info Card */}
            {currentOrganization.stats && (
              <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 dark:from-blue-900/20 dark:to-purple-900/20 dark:border-blue-700/40">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Organization Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Team Members</p>
                      <p className="text-2xl font-bold">{currentOrganization.stats.members || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Active users</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="text-lg font-bold">
                        {currentOrganization.plan 
                          ? currentOrganization.plan.charAt(0).toUpperCase() + currentOrganization.plan.slice(1)
                          : 'Free'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Current subscription</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conversation Quota Usage */}
            {currentOrganization.usageStats && (
              <QuotaUsageCard
                current={currentOrganization.usageStats.current || 0}
                limit={currentOrganization.usageStats.limit || 100}
                percentage={currentOrganization.usageStats.percentage || 0}
                daysRemaining={currentOrganization.usageStats.daysRemaining || 0}
                plan={currentOrganization.plan || 'free'}
                onUpgrade={() => router.push('/admin/organizations/settings')}
                onViewDetails={() => router.push('/admin/organizations/settings')}
              />
            )}
          </div>
        )}

        {/* Performance Metrics */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Performance Metrics</h2>
            <span className="text-sm text-muted-foreground">({getDateRangeLabel()})</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[60px]" />
                  <Skeleton className="h-3 w-[120px] mt-2" />
                </CardContent>
              </Card>
            ))
          ) : (
            statsData.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))
          )}
          </div>
        </div>

        {/* Recent Widgets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Widgets</h2>
            {widgets.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => router.push('/admin/widgets')}
                className="gap-2"
              >
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isReadOnly && widgets.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You have view-only access to these widgets. Contact an admin to make changes.
              </AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : widgets.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No widgets yet</h3>
                <p className="text-muted-foreground mb-6">
                  Get started by creating your first AI chat widget.
                </p>
                <Button onClick={handleCreateWidget} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Widget
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {widgets.slice(0, 6).map((widget) => (
                <ModernWidgetCard key={widget._id} widget={widget} isReadOnly={isReadOnly} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ModernLayout>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}

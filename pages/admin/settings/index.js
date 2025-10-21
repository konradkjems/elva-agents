/**
 * Platform Settings Page
 * 
 * For Platform Admins: Provides access to system configuration, audit logs, and organization management
 * For Organization Admins: Redirects to organization settings
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import ModernLayout from '../../../components/admin/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Loader2,
  AlertCircle,
  Building2,
  Users,
  BarChart3,
  Shield,
  FileText,
  Crown,
  CheckCircle2,
  Database,
  TrendingUp,
  Activity,
  Calendar
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    if (status === 'loading') return;

    // Redirect non-admin users to organization settings
    if (session?.user?.teamRole !== 'owner' && session?.user?.teamRole !== 'admin' && session?.user?.role !== 'platform_admin') {
      router.push('/admin');
      return;
    }

    // Redirect organization admins to organization settings
    if (session?.user?.role !== 'platform_admin') {
      router.push('/admin/organizations/settings');
      return;
    }

    // Platform admins can access this page
    fetchPlatformData();
  }, [status, session, router]);

  const fetchPlatformData = async () => {
    try {
      setLoading(true);

      // Fetch platform statistics
      const statsResponse = await fetch('/api/admin/platform-stats');
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setPlatformStats(stats);
      }

      // Fetch recent audit logs
      const logsResponse = await fetch('/api/admin/audit-logs?limit=10');
      if (logsResponse.ok) {
        const logs = await logsResponse.json();
        setAuditLogs(logs.logs || []);
      }
    } catch (error) {
      console.error('Error fetching platform data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load platform data",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModernLayout>
    );
  }

  // Only platform admins can access this page
  if (session?.user?.role !== 'platform_admin') {
    return null; // Will be redirected by useEffect
  }

  return (
    <ModernLayout>
      <Head>
        <title>Platform Settings - Elva Agents</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Crown className="h-4 w-4" />
                System configuration and platform management
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Database className="h-4 w-4" />
              System Info
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Platform Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
                <CardDescription>
                  Real-time statistics across all organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2 p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm">Organizations</span>
                    </div>
                    <p className="text-3xl font-bold">{platformStats?.totalOrganizations || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      {platformStats?.activeOrganizations || 0} active
                    </p>
                  </div>

                  <div className="space-y-2 p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Total Users</span>
                    </div>
                    <p className="text-3xl font-bold">{platformStats?.totalUsers || 0}</p>
                    <p className="text-xs text-muted-foreground">Platform-wide</p>
                  </div>

                  <div className="space-y-2 p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm">Total Widgets</span>
                    </div>
                    <p className="text-3xl font-bold">{platformStats?.totalWidgets || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      {platformStats?.activeWidgets || 0} active
                    </p>
                  </div>

                  <div className="space-y-2 p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Conversations</span>
                    </div>
                    <p className="text-3xl font-bold">{platformStats?.totalConversations || 0}</p>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common platform management tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    As a platform admin, you have full access to all organizations and system settings.
                    Use these permissions responsibly.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => router.push('/admin/audit')}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 mt-0.5" />
                      <div className="text-left">
                        <div className="font-medium">View Full Audit Logs</div>
                        <div className="text-xs text-muted-foreground">
                          Track all platform admin actions
                        </div>
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => router.push('/admin/organizations/settings')}
                  >
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 mt-0.5" />
                      <div className="text-left">
                        <div className="font-medium">Organization Settings</div>
                        <div className="text-xs text-muted-foreground">
                          Manage current organization
                        </div>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Audit Logs</CardTitle>
                    <CardDescription>
                      Latest platform admin actions and system events
                    </CardDescription>
                  </div>
                  <Button onClick={() => router.push('/admin/audit')}>
                    View All Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audit logs found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                        <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{log.action}</span>
                            <Badge variant="outline" className="text-xs">
                              {log.userEmail || 'System'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                          {log.details && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {log.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Info Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Current platform configuration and status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Environment</p>
                    <p className="text-lg font-mono">
                      {process.env.NODE_ENV || 'development'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Platform Version</p>
                    <p className="text-lg font-mono">1.0.0</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Database Status</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <p className="text-lg">Connected</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Quota System</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <p className="text-lg">Active</p>
                    </div>
                  </div>
                </div>

                <Alert className="mt-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> System settings are primarily managed through environment variables.
                    For security reasons, sensitive configuration cannot be modified through the UI.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Features Status */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Features</CardTitle>
                <CardDescription>
                  Current status of major platform capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FeatureStatus name="Multi-tenancy (Organizations)" enabled={true} />
                  <FeatureStatus name="Role-Based Access Control" enabled={true} />
                  <FeatureStatus name="Conversation Quota System" enabled={true} />
                  <FeatureStatus name="Team Management" enabled={true} />
                  <FeatureStatus name="Demo Widgets" enabled={true} />
                  <FeatureStatus name="Audit Logging" enabled={true} />
                  <FeatureStatus name="Support Requests" enabled={true} />
                  <FeatureStatus name="Analytics Dashboard" enabled={true} />
                  <FeatureStatus name="Satisfaction Surveys" enabled={true} />
                  <FeatureStatus name="Email Notifications" enabled={true} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  );
}

function FeatureStatus({ name, enabled }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <div className={`h-2 w-2 rounded-full ${enabled ? 'bg-green-600' : 'bg-gray-400'}`} />
      <span className="text-sm">{name}</span>
      <Badge variant={enabled ? "default" : "secondary"} className="ml-auto text-xs">
        {enabled ? "Active" : "Inactive"}
      </Badge>
    </div>
  );
}

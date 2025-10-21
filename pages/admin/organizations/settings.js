/**
 * Organization Settings Page
 * 
 * Allows organization owners/admins to manage organization settings
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import ModernLayout from '@/components/admin/ModernLayout';
import InviteMemberModal from '@/components/admin/InviteMemberModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Users,
  Crown,
  Settings as SettingsIcon,
  Info,
  UserPlus,
  Mail,
  Clock,
  RefreshCw,
  X,
  MoreVertical,
  UserCog,
  UserMinus,
  BarChart3,
  Calendar,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function OrganizationSettings() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [usageStats, setUsageStats] = useState(null);
  const [resettingQuota, setResettingQuota] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState(null);
  const [processingMember, setProcessingMember] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [resetQuotaDialogOpen, setResetQuotaDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    primaryColor: '#1E40AF',
    plan: 'free'
  });

  useEffect(() => {
    fetchOrganization();
  }, [session]);

  const fetchOrganization = async () => {
    if (!session?.user?.currentOrganizationId) {
      setError('No organization selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${session.user.currentOrganizationId}`);
      
      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
        
        setFormData({
          name: data.organization.name || '',
          slug: data.organization.slug || '',
          primaryColor: data.organization.primaryColor || '#1E40AF',
          plan: data.organization.plan || 'free'
        });
        
        // Fetch usage stats
        if (data.organization.usageStats) {
          setUsageStats(data.organization.usageStats);
        } else {
          fetchUsageStats();
        }
      } else {
        setError('Failed to load organization');
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError('An error occurred while loading organization');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    if (!session?.user?.currentOrganizationId) return;
    
    try {
      const response = await fetch(`/api/organizations/${session.user.currentOrganizationId}/usage`);
      if (response.ok) {
        const stats = await response.json();
        setUsageStats(stats);
      }
    } catch (err) {
      console.error('Error fetching usage stats:', err);
    }
  };

  const handleResetQuota = async () => {
    if (!session?.user?.currentOrganizationId || session.user.platformRole !== 'platform_admin') {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "Only platform admins can reset quotas.",
      });
      return;
    }
    
    setResettingQuota(true);
    try {
      const response = await fetch(
        `/api/admin/organizations/${session.user.currentOrganizationId}/reset-quota`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data.usage);
        toast({
          title: "Quota Reset",
          description: data.message || "Conversation quota has been reset successfully.",
        });
        setResetQuotaDialogOpen(false);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "An error occurred while resetting the quota.",
        });
      }
    } catch (err) {
      console.error('Error resetting quota:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while resetting the quota.",
      });
    } finally {
      setResettingQuota(false);
    }
  };

  const handleNameChange = (name) => {
    // Auto-generate slug from name (always update as user types)
    const autoSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    setFormData({ ...formData, name, slug: autoSlug });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await fetch(`/api/organizations/${session.user.currentOrganizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess('Organization settings saved successfully');
        toast({
          title: "Settings saved",
          description: "Your organization settings have been updated.",
        });
        await fetchOrganization();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('An error occurred while saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganization = async () => {
    try {
      const response = await fetch(`/api/organizations/${session.user.currentOrganizationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Organization deleted",
          description: "Your organization has been deleted successfully.",
        });
        router.push('/admin');
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Delete failed",
          description: data.error || 'Failed to delete organization',
        });
      }
    } catch (err) {
      console.error('Error deleting organization:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: 'An error occurred while deleting the organization',
      });
    }
  };

  const handleInvitationSuccess = () => {
    fetchOrganization(); // Refresh to get updated invitations
  };

  const handleResendInvitation = async (invitationId) => {
    setProcessingInvitation(invitationId);
    try {
      const response = await fetch(
        `/api/organizations/${session.user.currentOrganizationId}/invitations/${invitationId}/resend`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Invitation resent",
          description: "The invitation has been resent successfully.",
        });
        fetchOrganization();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to resend",
          description: data.error || 'Failed to resend invitation',
        });
      }
    } catch (err) {
      console.error('Error resending invitation:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    setProcessingInvitation(invitationId);
    try {
      const response = await fetch(
        `/api/organizations/${session.user.currentOrganizationId}/invitations/${invitationId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Invitation cancelled",
          description: "The invitation has been cancelled.",
        });
        fetchOrganization();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to cancel",
          description: data.error || 'Failed to cancel invitation',
        });
      }
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    setProcessingMember(memberId);
    try {
      const response = await fetch(
        `/api/organizations/${session.user.currentOrganizationId}/members/${memberId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Role updated",
          description: `Member role changed to ${newRole}.`,
        });
        fetchOrganization();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to update role",
          description: data.error || 'Failed to update member role',
        });
      }
    } catch (err) {
      console.error('Error updating member role:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setProcessingMember(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setProcessingMember(memberToRemove._id);
    try {
      const response = await fetch(
        `/api/organizations/${session.user.currentOrganizationId}/members/${memberToRemove._id}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Member removed",
          description: `${memberToRemove.user?.name} has been removed from the organization.`,
        });
        fetchOrganization();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to remove member",
          description: data.error || 'Failed to remove member',
        });
      }
    } catch (err) {
      console.error('Error removing member:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setProcessingMember(null);
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'member':
        return 'outline';
      default:
        return 'outline';
    }
  };
  
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member (view only)';
      default:
        return role;
    }
  };

  const getPlanDisplayName = (plan) => {
    switch (plan) {
      case 'free':
        return 'Gratis';
      case 'basic':
        return 'Basis';
      case 'growth':
        return 'Vækst';
      case 'pro':
        return 'Pro';
      default:
        return plan;
    }
  };

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModernLayout>
    );
  }

  if (error && !organization) {
    return (
      <ModernLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </ModernLayout>
    );
  }

  const canEdit = organization?.role === 'owner' || organization?.role === 'admin';
  const canDelete = organization?.role === 'owner';

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
              <p className="text-muted-foreground">
                Manage your organization details and team members
              </p>
            </div>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Team Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Usage
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>
                  Update your organization's basic information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  {/* Organization Name */}
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name *</Label>
                    <Input
                      id="org-name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      disabled={!canEdit || saving}
                      required
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-2">
                    <Label htmlFor="org-slug">Slug</Label>
                    <Input
                      id="org-slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      disabled={!canEdit || saving}
                      pattern="[a-z0-9-]+"
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-generated from name. Use only lowercase letters, numbers, and hyphens.
                    </p>
                  </div>

                  {/* Primary Color */}
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        disabled={!canEdit || saving}
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        disabled={!canEdit || saving}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Plan */}
                  <div className="space-y-2">
                    <Label htmlFor="org-plan">Plan</Label>
                    <Select
                      value={formData.plan}
                      onValueChange={(value) => setFormData({ ...formData, plan: value })}
                      disabled={!canEdit || saving}
                    >
                      <SelectTrigger id="org-plan">
                        <SelectValue>
                          {getPlanDisplayName(formData.plan)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">
                          <div className="flex flex-col">
                            <span>Gratis</span>
                            <span className="text-xs text-muted-foreground">30 dage gratis prøve</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="basic">Basis</SelectItem>
                        <SelectItem value="growth">Vækst</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {canEdit && (
                    <Button 
                      type="submit" 
                      disabled={saving}
                      className="gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Organization Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Stats</CardTitle>
                <CardDescription>
                  Overview of your organization's usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Team Members</p>
                    <p className="text-2xl font-bold">{organization?.stats?.members || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Widgets</p>
                    <p className="text-2xl font-bold">{organization?.stats?.widgets || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Conversations</p>
                    <p className="text-2xl font-bold">{organization?.stats?.conversations || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Pending Invites</p>
                    <p className="text-2xl font-bold">{organization?.stats?.pendingInvitations || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            {canDelete && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Deleting your organization will permanently remove all widgets, conversations, and team members. This action cannot be undone.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Organization
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Team Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage who has access to this organization
                    </CardDescription>
                  </div>
                  {(canEdit || canDelete) && (
                    <Button onClick={() => setInviteModalOpen(true)} className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Invite Member
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((member) => {
                    const isCurrentUser = member.user?.email === session?.user?.email;
                    const canManageMember = (canEdit || canDelete) && !isCurrentUser && member.role !== 'owner';
                    
                    return (
                      <div key={member._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.user?.image} alt={member.user?.name} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {getInitials(member.user?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{member.user?.name || 'Unknown User'}</p>
                              {member.role === 'owner' && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                              {isCurrentUser && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {getRoleDisplayName(member.role)}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {member.status}
                          </Badge>
                          
                          {canManageMember && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  disabled={processingMember === member._id}
                                >
                                  {processingMember === member._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreVertical className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Manage Member</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <UserCog className="mr-2 h-4 w-4" />
                                    Change Role
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem 
                                      onClick={() => handleChangeRole(member._id, 'member')}
                                      disabled={member.role === 'member'}
                                    >
                                      <div className="flex flex-col">
                                        <span>Member</span>
                                        <span className="text-xs text-muted-foreground">View only</span>
                                      </div>
                                      {member.role === 'member' && ' ✓'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleChangeRole(member._id, 'admin')}
                                      disabled={member.role === 'admin'}
                                    >
                                      Admin
                                      {member.role === 'admin' && ' ✓'}
                                    </DropdownMenuItem>
                                    {canDelete && (
                                      <DropdownMenuItem 
                                        onClick={() => handleChangeRole(member._id, 'owner')}
                                        disabled={member.role === 'owner'}
                                      >
                                        Owner
                                        {member.role === 'owner' && ' ✓'}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setMemberToRemove(member);
                                    setRemoveDialogOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  Remove from Organization
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {members.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No team members yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Pending Invitations
                  </CardTitle>
                  <CardDescription>
                    Manage invitations that haven't been accepted yet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {invitations.map((invitation) => (
                      <div key={invitation._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">{invitation.email}</p>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Badge variant="outline" className="capitalize">
                              {invitation.role}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {(canEdit || canDelete) && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendInvitation(invitation._id)}
                              disabled={processingInvitation === invitation._id}
                              className="gap-1"
                            >
                              {processingInvitation === invitation._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              Resend
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvitation(invitation._id)}
                              disabled={processingInvitation === invitation._id}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              {processingInvitation === invitation._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversation Usage</CardTitle>
                <CardDescription>
                  View your monthly conversation usage and quota status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {usageStats ? (
                  <>
                    {/* Usage Progress */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Usage</p>
                          <p className="text-3xl font-bold">{usageStats.current.toLocaleString('en-US')}</p>
                          <p className="text-sm text-muted-foreground mt-1">of {usageStats.limit.toLocaleString('en-US')} conversations</p>
                        </div>
                        <div className={`text-4xl font-bold ${
                          usageStats.percentage >= 100 ? 'text-red-600' :
                          usageStats.percentage >= 80 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {usageStats.percentage}%
                        </div>
                      </div>

                      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                            usageStats.percentage >= 100 ? 'bg-red-600' :
                            usageStats.percentage >= 80 ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(usageStats.percentage, 100)}%` }}
                        />
                      </div>

                      {usageStats.overage > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            You have exceeded your quota by {usageStats.overage.toLocaleString('en-US')} conversations.
                            {organization?.plan === 'free' 
                              ? ' Your widgets are disabled. Upgrade to continue.'
                              : ' This will be billed separately.'
                            }
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <Separator />

                    {/* Usage Details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Days Remaining
                        </p>
                        <p className="text-2xl font-bold mt-1">{usageStats.daysRemaining}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Status
                        </p>
                        <Badge variant={
                          usageStats.status === 'exceeded' ? 'destructive' :
                          usageStats.status === 'warning' ? 'warning' :
                          'secondary'
                        } className="mt-1 capitalize">
                          {usageStats.status === 'exceeded' ? 'Exceeded' :
                           usageStats.status === 'warning' ? 'Warning' :
                           'Ok'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Plan
                        </p>
                        <p className="text-lg font-bold mt-1 capitalize">{organization?.plan || 'free'}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Reset Dates */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Reset Information</p>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last reset:</span>
                          <span className="font-medium">
                            {new Date(usageStats.lastReset).toLocaleDateString('en-US')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next automatic reset:</span>
                          <span className="font-medium">
                            {new Date(usageStats.nextReset).toLocaleDateString('en-US')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Platform Admin Actions */}
                    {session?.user?.platformRole === 'platform_admin' && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              <Crown className="h-3 w-3" />
                              Platform Admin
                            </Badge>
                          </div>
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              As a platform admin, you can manually reset the quota for this organization.
                            </AlertDescription>
                          </Alert>
                          <Button 
                            variant="destructive" 
                            onClick={() => setResetQuotaDialogOpen(true)}
                            disabled={resettingQuota}
                            className="gap-2"
                          >
                            {resettingQuota ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Resetting...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4" />
                                Reset Quota
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading usage data...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Organization Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{organization?.name}</strong> and all associated data including widgets, conversations, and team members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.user?.name}</strong> from this organization? 
              They will lose access to all widgets and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Quota Dialog */}
      <AlertDialog open={resetQuotaDialogOpen} onOpenChange={setResetQuotaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              Reset Conversation Quota
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the quota for <strong>{organization?.name}</strong>? 
              This will reset the conversation counter to 0 and clear all notifications.
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  ⚠️ This action is only available to platform administrators and should be used with caution.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resettingQuota}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetQuota}
              disabled={resettingQuota}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resettingQuota ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Quota
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Member Modal */}
      <InviteMemberModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        organizationId={session?.user?.currentOrganizationId}
        onSuccess={handleInvitationSuccess}
      />
    </ModernLayout>
  );
}


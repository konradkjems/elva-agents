import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import ModernLayout from '@/components/admin/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import DataExport from '@/components/admin/DataExport';
import AccountDeletion from '@/components/admin/AccountDeletion';
import {
  User,
  Mail,
  Shield,
  Calendar,
  CheckCircle,
  Loader2,
  Edit,
  Save,
  X,
  Key,
  LogIn
} from 'lucide-react';

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    }
  }, [session]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/admin/profile');
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUserData(updatedUser);
        setEditing(false);
        
        // Update session
        await updateSession({
          ...session,
          user: {
            ...session.user,
            name: updatedUser.name,
            email: updatedUser.email,
          }
        });

        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password mismatch",
        description: "New password and confirmation do not match.",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        toast({
          title: "Password updated",
          description: "Your password has been changed successfully.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update password');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                  <AvatarImage src={session.user?.image} alt={session.user?.name} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getInitials(session.user?.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{userData?.name || session.user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{userData?.email || session.user?.email}</p>
                </div>

                <div className="flex gap-2">
                  <Badge variant={getRoleBadgeVariant(userData?.role || session.user?.role)}>
                    <Shield className="h-3 w-3 mr-1" />
                    {(userData?.role || session.user?.role || 'user').toUpperCase()}
                  </Badge>
                  {session.user?.provider === 'google' && (
                    <Badge variant="outline">
                      <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Account Info */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Joined {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <LogIn className="h-4 w-4 mr-2" />
                  <span>Last login {userData?.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>Status: {userData?.status || 'Active'}</span>
                </div>
              </div>

              {userData?.permissions && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Permissions</Label>
                    <div className="flex flex-wrap gap-2">
                      {userData.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Settings Tabs */}
          <Card className="lg:col-span-2">
            <Tabs defaultValue="general" className="w-full">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="general">
                    <User className="h-4 w-4 mr-2" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="security" disabled={session.user?.provider === 'google'}>
                    <Key className="h-4 w-4 mr-2" />
                    Security
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent>
                {/* General Tab */}
                <TabsContent value="general" className="space-y-4">
                  {session.user?.provider === 'google' && (
                    <Alert>
                      <AlertDescription>
                        Your account is managed by Google. Some settings may be limited.
                      </AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={!editing || loading}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={!editing || loading || session.user?.provider === 'google'}
                        className="h-11"
                      />
                      {session.user?.provider === 'google' && (
                        <p className="text-xs text-muted-foreground">
                          Email is managed by your Google account
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!editing ? (
                        <Button
                          type="button"
                          onClick={() => setEditing(true)}
                          className="w-full"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditing(false);
                              setFormData({
                                name: userData?.name || session.user?.name || '',
                                email: userData?.email || session.user?.email || '',
                              });
                            }}
                            disabled={loading}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </form>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Change Password</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Update your password to keep your account secure
                    </p>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        disabled={loading}
                        className="h-11"
                        placeholder="Enter current password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        disabled={loading}
                        className="h-11"
                        placeholder="Enter new password (min 8 characters)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        disabled={loading}
                        className="h-11"
                        placeholder="Confirm new password"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* GDPR Rights Section */}
        <div id="gdpr" className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Dine GDPR Rettigheder</h2>
            <p className="text-muted-foreground">
              Som bruger har du særlige rettigheder under EU's Databeskyttelsesforordning (GDPR)
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <DataExport />
            <AccountDeletion />
          </div>
        </div>
      </div>
    </ModernLayout>
  );
}


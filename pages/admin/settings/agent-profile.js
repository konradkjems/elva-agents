import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ModernLayout from '../../../components/admin/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { UserIcon, CameraIcon } from '@heroicons/react/24/outline';

export default function AgentProfileSettings() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [activeChats, setActiveChats] = useState([]);

  useEffect(() => {
    fetchAgentProfile();
  }, []);

  const fetchAgentProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/agent-profile');
      if (response.ok) {
        const data = await response.json();
        const profile = data.agentProfile || {};
        setDisplayName(profile.displayName || '');
        setTitle(profile.title || '');
        setAvatarUrl(profile.avatarUrl || null);
        setIsAvailable(profile.isAvailable || false);
        setActiveChats(profile.currentActiveChats || []);
      }
    } catch (error) {
      console.error('Failed to fetch agent profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load agent profile'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result;
      
      try {
        setUploading(true);
        const response = await fetch('/api/admin/agent-profile/upload-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image })
        });

        if (response.ok) {
          const data = await response.json();
          setAvatarUrl(data.avatarUrl);
          toast({
            title: 'Avatar uploaded',
            description: 'Your avatar has been updated successfully'
          });
        } else {
          const errorData = await response.json();
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: errorData.error || 'Failed to upload avatar'
          });
        }
      } catch (error) {
        console.error('Error uploading avatar:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to upload avatar'
        });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/agent-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          title: title.trim() || null,
          avatarUrl: avatarUrl || null,
          isAvailable
        })
      });

      if (response.ok) {
        toast({
          title: 'Profile saved',
          description: 'Your agent profile has been updated successfully'
        });
      } else {
        const errorData = await response.json();
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: errorData.error || 'Failed to save profile'
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save profile'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Profile</h1>
          <p className="text-muted-foreground">
            Configure your live chat agent profile
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              This information will be shown to users when you take over a live chat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div>
              <Label>Avatar</Label>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Label htmlFor="avatar-upload">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        <CameraIcon className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Avatar'}
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Konrad Kjems"
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                This name will be shown to users in the chat
              </p>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Title / Role</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., DdD Retail Germany Support"
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Your role or department (optional)
              </p>
            </div>

            {/* Availability */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isAvailable">Available for Live Chat</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, you will receive notifications for new live chat requests
                </p>
              </div>
              <Switch
                id="isAvailable"
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
              />
            </div>

            {/* Active Chats */}
            {activeChats.length > 0 && (
              <div>
                <Label>Active Chats</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  You currently have {activeChats.length} active live chat{activeChats.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}


/**
 * Invite Member Modal Component
 * 
 * Modal for inviting team members to an organization
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, UserPlus, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ROLE_INFO = {
  owner: {
    label: 'Owner',
    description: 'Full access to organization, including billing and deletion'
  },
  admin: {
    label: 'Admin',
    description: 'Can manage widgets, team members, and settings'
  },
  member: {
    label: 'Member',
    description: 'Can create and edit widgets'
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to widgets and analytics'
  }
};

export default function InviteMemberModal({ open, onOpenChange, organizationId, onSuccess }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!role) {
      setError('Please select a role');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send invitation');
        toast({
          variant: "destructive",
          title: "Failed to send invitation",
          description: data.error || "Please try again.",
        });
        return;
      }

      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${email}`,
      });

      // Reset form
      setEmail('');
      setRole('member');
      
      // Call success callback
      if (onSuccess) {
        onSuccess(data.invitation);
      }

      // Close modal
      onOpenChange(false);

    } catch (err) {
      console.error('Error sending invitation:', err);
      setError('An unexpected error occurred');
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen && !loading) {
      // Reset form when closing
      setEmail('');
      setRole('member');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization. They'll receive an email with a link to accept.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The invitation will be sent to this email address
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Member</span>
                    <span className="text-xs text-muted-foreground">View only access</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Admin</span>
                    <span className="text-xs text-muted-foreground">Can manage team and widgets</span>
                  </div>
                </SelectItem>
                <SelectItem value="owner">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Owner</span>
                    <span className="text-xs text-muted-foreground">Full organization access</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Role description */}
            {role && ROLE_INFO[role] && (
              <Alert className="mt-3">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{ROLE_INFO[role].label}:</strong> {ROLE_INFO[role].description}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


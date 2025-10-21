/**
 * Create Organization Modal
 * 
 * Modal for creating a new organization
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function CreateOrganizationModal({ open, onOpenChange, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'free'
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset form
        setFormData({ name: '', slug: '', plan: 'free' });
        
        // Call success callback
        if (onSuccess) {
          onSuccess(data.organization);
        }
        
        // Close modal
        onOpenChange(false);
      } else {
        setError(data.error || 'Failed to create organization');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Create organization error:', err);
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-xl">Create New Organization</DialogTitle>
          </div>
          <DialogDescription>
            Set up a new organization to manage your widgets and team members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="org-name">
                Organization Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="org-name"
                placeholder="Acme Corporation"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This will be visible to your team members
              </p>
            </div>

            {/* Organization Slug */}
            <div className="space-y-2">
              <Label htmlFor="org-slug">
                Slug
              </Label>
              <Input
                id="org-slug"
                placeholder="acme-corporation"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                disabled={loading}
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from name. Use only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            {/* Plan Selection */}
            <div className="space-y-2">
              <Label htmlFor="org-plan">Plan</Label>
              <Select
                value={formData.plan}
                onValueChange={(value) => setFormData({ ...formData, plan: value })}
                disabled={loading}
              >
                <SelectTrigger id="org-plan">
                  <SelectValue>
                    {getPlanDisplayName(formData.plan)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Gratis</span>
                      <span className="text-xs text-muted-foreground">30 dage gratis prøve</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="basic">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Basis</span>
                      <span className="text-xs text-muted-foreground">10 widgets • 5 medlemmer</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="growth">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Vækst</span>
                      <span className="text-xs text-muted-foreground">25 widgets • 15 medlemmer</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pro">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Pro</span>
                      <span className="text-xs text-muted-foreground">50 widgets • 30 medlemmer</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You can upgrade or downgrade your plan later
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.name}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Create Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Organization Switcher Component
 * 
 * Displays current organization and allows switching between organizations
 * Shows in the admin panel header
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Building2, 
  Check, 
  ChevronDown, 
  Plus, 
  Settings,
  Loader2,
  Crown,
  Users
} from 'lucide-react';

export default function OrganizationSwitcher({ onCreateClick }) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // Fetch user's organizations
  useEffect(() => {
    fetchOrganizations();
  }, [session]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
        
        // Set current organization
        const current = data.organizations?.find(
          org => org._id === session?.user?.currentOrganizationId
        ) || data.organizations?.[0];
        setCurrentOrg(current);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchOrganization = async (orgId) => {
    if (orgId === currentOrg?._id) return;

    try {
      setSwitching(true);
      const response = await fetch(`/api/organizations/${orgId}/switch`, {
        method: 'POST',
      });

      if (response.ok) {
        // Update session
        await update();
        
        // Refresh organizations
        await fetchOrganizations();
        
        // Refresh current page
        router.reload();
      } else {
        console.error('Failed to switch organization');
      }
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setSwitching(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'OR';
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
      case 'editor':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
      case 'editor':
      case 'viewer':
        return <Users className="h-3 w-3" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  if (!currentOrg) {
    return (
      <Button 
        variant="outline" 
        onClick={onCreateClick}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Create Organization</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 min-w-[200px] justify-between"
          disabled={switching}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentOrg.logo} alt={currentOrg.name} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {getInitials(currentOrg.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate font-medium text-sm">
              {currentOrg.name}
            </span>
          </div>
          {switching ? (
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[280px]">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Organizations</p>
            <p className="text-xs leading-none text-muted-foreground">
              Switch between your organizations
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {/* List of organizations */}
        <div className="max-h-[300px] overflow-y-auto">
          {organizations.map((org) => {
            const isActive = org._id === currentOrg?._id;
            
            return (
              <DropdownMenuItem
                key={org._id}
                onClick={() => handleSwitchOrganization(org._id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={org.logo} alt={org.name} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getInitials(org.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {org.name}
                    </span>
                    {isActive && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge 
                      variant={getRoleBadgeVariant(org.role)} 
                      className="text-xs px-1.5 py-0 h-4 gap-1"
                    >
                      {getRoleIcon(org.role)}
                      <span className="capitalize">{org.role}</span>
                    </Badge>
                    {org.plan && (
                      <span className="text-xs text-muted-foreground">
                        · {org.plan}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem onClick={onCreateClick} className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          Create Organization
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => router.push('/admin/organizations/settings')}
          className="gap-2 cursor-pointer"
        >
          <Settings className="h-4 w-4" />
          Organization Settings
        </DropdownMenuItem>

        {/* Platform Admin Indicator */}
        {session?.user?.role === 'platform_admin' && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <Badge variant="outline" className="w-full justify-center gap-1">
                <Crown className="h-3 w-3" />
                Platform Admin
              </Badge>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


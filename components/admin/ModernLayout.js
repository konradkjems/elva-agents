import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import ModernSidebar from './ModernSidebar';
import OrganizationSwitcher from './OrganizationSwitcher';
import CreateOrganizationModal from './CreateOrganizationModal';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Menu,
  Search,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Home,
  MessageCircle,
  BarChart3,
  Globe,
  FileText,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function ModernLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    pages: [],
    widgets: [],
    demos: [],
    conversations: []
  });
  const [searching, setSearching] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/admin/login' });
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: "There was a problem signing you out.",
      });
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Search functionality
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults({ pages: [], widgets: [], demos: [], conversations: [] });
      return;
    }

    const searchData = async () => {
      setSearching(true);
      try {
        // Search across different data sources
        const [widgetsRes, demosRes] = await Promise.all([
          fetch('/api/admin/widgets').catch(() => ({ ok: false })),
          fetch('/api/admin/demos').catch(() => ({ ok: false }))
        ]);

        const widgets = widgetsRes.ok ? await widgetsRes.json() : [];
        const demos = demosRes.ok ? await demosRes.json() : [];

        // Define searchable pages
        const pages = [
          { name: 'Dashboard', href: '/admin', icon: Home, description: 'Overview and statistics' },
          { name: 'Widgets', href: '/admin/widgets', icon: MessageCircle, description: 'Manage chat widgets' },
          { name: 'Demo Widgets', href: '/admin/demo-widgets', icon: Globe, description: 'Client demonstrations' },
          { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, description: 'Performance insights' },
          { name: 'Settings', href: '/admin/settings', icon: Settings, description: 'Platform configuration' },
          { name: 'Profile', href: '/admin/profile', icon: User, description: 'Your account settings' }
        ];

        const query = searchQuery.toLowerCase();

        // Filter results
        const filteredPages = pages.filter(page =>
          page.name.toLowerCase().includes(query) ||
          page.description.toLowerCase().includes(query)
        );

        const filteredWidgets = widgets.filter(widget =>
          widget.name?.toLowerCase().includes(query) ||
          widget.description?.toLowerCase().includes(query)
        ).slice(0, 5);

        const filteredDemos = demos.filter(demo =>
          demo.name?.toLowerCase().includes(query) ||
          demo.description?.toLowerCase().includes(query)
        ).slice(0, 5);

        setSearchResults({
          pages: filteredPages,
          widgets: filteredWidgets,
          demos: filteredDemos,
          conversations: []
        });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelect = (href) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(href);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/admin/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Command Palette Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput 
          placeholder="Type to search..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {searching ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {searchQuery.length < 2 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>Start typing to search across widgets, demos, and pages...</p>
                  <p className="text-xs mt-2">Try searching for widget names, descriptions, or page names</p>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="py-6 text-center text-sm">
                      <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No results found for "{searchQuery}"</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try different keywords
                      </p>
                    </div>
                  </CommandEmpty>

                  {searchResults.pages.length > 0 && (
                    <CommandGroup heading="Pages">
                      {searchResults.pages.map((page) => (
                        <CommandItem
                          key={page.href}
                          onSelect={() => handleSelect(page.href)}
                          className="cursor-pointer"
                        >
                          <page.icon className="mr-2 h-4 w-4" />
                          <div className="flex-1">
                            <div className="font-medium">{page.name}</div>
                            <div className="text-xs text-muted-foreground">{page.description}</div>
                          </div>
                          <ArrowRight className="h-4 w-4 opacity-50" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {searchResults.widgets.length > 0 && (
                    <>
                      {searchResults.pages.length > 0 && <CommandSeparator />}
                      <CommandGroup heading="Widgets">
                        {searchResults.widgets.map((widget) => (
                          <CommandItem
                            key={widget._id}
                            onSelect={() => handleSelect(`/admin/widgets/${widget._id}`)}
                            className="cursor-pointer"
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{widget.name}</span>
                                <Badge variant={widget.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                  {widget.status}
                                </Badge>
                              </div>
                              {widget.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {widget.description}
                                </div>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 opacity-50" />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}

                  {searchResults.demos.length > 0 && (
                    <>
                      {(searchResults.pages.length > 0 || searchResults.widgets.length > 0) && <CommandSeparator />}
                      <CommandGroup heading="Demo Widgets">
                        {searchResults.demos.map((demo) => (
                          <CommandItem
                            key={demo._id}
                            onSelect={() => handleSelect(`/demo/${demo._id}`)}
                            className="cursor-pointer"
                          >
                            <Globe className="mr-2 h-4 w-4" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{demo.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  Demo
                                </Badge>
                              </div>
                              {demo.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {demo.description}
                                </div>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 opacity-50" />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>

      <ModernSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="lg:pl-64">
        {/* Top Header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            {/* Search */}
            <div className="flex flex-1 items-center">
              <Button
                variant="outline"
                className="relative w-full max-w-lg justify-start text-sm text-muted-foreground h-9"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                <span>Search widgets, demos, pages...</span>
                <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
            
            <div className="flex items-center gap-x-4 lg:gap-x-6">

              {/* Organization Switcher */}
              <OrganizationSwitcher onCreateClick={() => setCreateOrgOpen(true)} />

              {/* Dark mode toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
              >
                {darkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user?.image} alt={session.user?.name} />
                      <AvatarFallback>
                        {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user?.name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/admin/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main className="py-4">
          <div className="mx-auto max-w-none px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onSuccess={async (org) => {
          toast({
            title: "Organization created!",
            description: `${org.name} has been created successfully.`,
          });
          
          // Switch to the new organization
          try {
            const response = await fetch(`/api/organizations/${org._id}/switch`, {
              method: 'POST',
            });
            
            if (response.ok) {
              // Reload the page to refresh with new organization context
              router.reload();
            } else {
              // Still reload to show the new org in the list
              router.reload();
            }
          } catch (error) {
            console.error('Error switching to new organization:', error);
            // Reload anyway to refresh the org list
            router.reload();
          }
        }}
      />
    </div>
  );
}

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
  DialogTitle,
  DialogDescription,
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
  Loader2,
  ClipboardList,
  Monitor
} from 'lucide-react';

export default function ModernLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState('system'); // 'light', 'dark', 'system'
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
    
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
    
    if (savedTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', systemTheme === 'dark');
    } else {
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (savedTheme === 'system') {
        document.documentElement.classList.toggle('dark', mediaQuery.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
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

  const setThemeMode = (newTheme) => {
    setTheme(newTheme);
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', systemTheme === 'dark');
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return Sun;
      case 'dark': return Moon;
      case 'system': return Monitor;
      default: return Monitor;
    }
  };

  // Search functionality
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults({ pages: [], widgets: [], demos: [], conversations: [] });
      setSearching(false);
      return;
    }

    // Clear previous results immediately when search query changes
    setSearchResults({ pages: [], widgets: [], demos: [], conversations: [] });

    const searchData = async () => {
      setSearching(true);
      console.log('🔍 Starting search for:', searchQuery);
      try {
        // Search across different data sources
        const [widgetsRes, demosRes] = await Promise.all([
          fetch('/api/admin/widgets').catch((error) => {
            console.error('❌ Widgets API error:', error);
            return { ok: false };
          }),
          fetch('/api/admin/demos').catch((error) => {
            console.error('❌ Demos API error:', error);
            return { ok: false };
          })
        ]);

        console.log('🔍 API responses:', {
          widgets: { ok: widgetsRes.ok, status: widgetsRes.status },
          demos: { ok: demosRes.ok, status: demosRes.status }
        });

        const widgets = widgetsRes.ok ? await widgetsRes.json() : [];
        const demos = demosRes.ok ? await demosRes.json() : [];
        
        console.log('🔍 Data received:', { widgets: widgets.length, demos: demos.length });

        // Define searchable pages (filter based on role)
        const pages = [
          { name: 'Dashboard', href: '/admin', icon: Home, description: 'Overview and statistics' },
          { name: 'Widgets', href: '/admin/widgets', icon: MessageCircle, description: 'Manage chat widgets' },
          { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, description: 'Performance insights' },
          { name: 'Support Requests', href: '/admin/support-requests', icon: ClipboardList, description: 'User support' },
          ...(session?.user?.teamRole !== 'member' ? [
            { name: 'Demo Widgets', href: '/admin/demo-widgets', icon: Globe, description: 'Client demonstrations' },
            { name: 'Settings', href: '/admin/settings', icon: Settings, description: 'Platform configuration' }
          ] : []),
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

        const searchResults = {
          pages: filteredPages,
          widgets: filteredWidgets,
          demos: filteredDemos,
          conversations: []
        };

        console.log('🔍 Final search results:', {
          query,
          pages: filteredPages.length,
          widgets: filteredWidgets.length,
          demos: filteredDemos.length,
          totalResults: filteredPages.length + filteredWidgets.length + filteredDemos.length
        });

        // Force a re-render by using a functional update
        setSearchResults(prevResults => ({
          ...prevResults,
          pages: filteredPages,
          widgets: filteredWidgets,
          demos: filteredDemos,
          conversations: []
        }));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Debug: Log when searchResults change
  useEffect(() => {
    console.log('🔍 Search results state changed:', searchResults);
    console.log('🔍 Search results breakdown:', {
      pages: searchResults.pages?.length || 0,
      widgets: searchResults.widgets?.length || 0,
      demos: searchResults.demos?.length || 0,
      conversations: searchResults.conversations?.length || 0
    });
  }, [searchResults]);

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
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search across widgets, demos, and pages in the admin panel
          </DialogDescription>
          <Command className="rounded-lg border shadow-md">
            <CommandInput 
              placeholder="Type to search..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList key={`search-${searchQuery}-${searchResults.pages.length}-${searchResults.widgets.length}-${searchResults.demos.length}`}>
           {/* Debug: Always show search results info */}
           {searchQuery.length >= 2 && (
             <>
               {/* WORKING: Search results with proper styling */}
               {(searchResults.pages.length > 0 || searchResults.widgets.length > 0 || searchResults.demos.length > 0) && (
                 <div className="p-2">
                   {searchResults.pages.length > 0 && (
                     <div className="mb-3">
                       <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Pages</div>
                       {searchResults.pages.map((page, index) => (
                         <div 
                           key={page.href || index} 
                           className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                           onClick={() => handleSelect(page.href)}
                         >
                           <div className="flex items-center gap-2">
                             <page.icon className="h-4 w-4 text-muted-foreground" />
                             <div>
                               <div className="font-medium text-sm">{page.name}</div>
                               <div className="text-xs text-muted-foreground">{page.description}</div>
                             </div>
                           </div>
                           <ArrowRight className="h-4 w-4 text-muted-foreground" />
                         </div>
                       ))}
                     </div>
                   )}
                   
                   {searchResults.widgets.length > 0 && (
                     <div className="mb-3">
                       <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Widgets</div>
                       {searchResults.widgets.map((widget, index) => (
                         <div 
                           key={widget._id || index} 
                           className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                           onClick={() => handleSelect(`/admin/widgets/${widget._id}`)}
                         >
                           <div className="flex items-center gap-2">
                             <MessageCircle className="h-4 w-4 text-muted-foreground" />
                             <div>
                               <div className="font-medium text-sm">{widget.name}</div>
                               {widget.description && (
                                 <div className="text-xs text-muted-foreground">{widget.description}</div>
                               )}
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <Badge variant={widget.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                               {widget.status}
                             </Badge>
                             <ArrowRight className="h-4 w-4 text-muted-foreground" />
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                   
                   {searchResults.demos.length > 0 && (
                     <div>
                       <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Demo Widgets</div>
                       {searchResults.demos.map((demo, index) => (
                         <div 
                           key={demo._id || index} 
                           className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                           onClick={() => handleSelect(`/demo/${demo._id}`)}
                         >
                           <div className="flex items-center gap-2">
                             <Globe className="h-4 w-4 text-muted-foreground" />
                             <div>
                               <div className="font-medium text-sm">{demo.name}</div>
                               {demo.description && (
                                 <div className="text-xs text-muted-foreground">{demo.description}</div>
                               )}
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-xs">Demo</Badge>
                             <ArrowRight className="h-4 w-4 text-muted-foreground" />
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               )}
             </>
           )}
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
                   {/* Always show results if we have them */}
                   {(searchResults.pages.length > 0 || searchResults.widgets.length > 0 || searchResults.demos.length > 0) ? (
                     <>
                       {searchResults.pages.length > 0 && (
                         <CommandGroup heading="Pages">
                           {console.log('🔍 Rendering pages:', searchResults.pages)}
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
                             {console.log('🔍 Rendering widgets:', searchResults.widgets)}
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
                             {console.log('🔍 Rendering demos:', searchResults.demos)}
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
                   ) : (
                     <CommandEmpty>
                       <div className="py-6 text-center text-sm">
                         <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                         <p>No results found for "{searchQuery}"</p>
                         <p className="text-xs text-muted-foreground mt-1">
                           Try different keywords
                         </p>
                       </div>
                     </CommandEmpty>
                   )}
                 </>
               )}
             </>
           )}
           </CommandList>
         </Command>
       </DialogContent>
     </Dialog>

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
                  
                  {/* Theme Selector */}
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center space-x-1">
                      {['light', 'dark', 'system'].map((themeOption) => {
                        const Icon = themeOption === 'light' ? Sun : themeOption === 'dark' ? Moon : Monitor;
                        return (
                          <Button
                            key={themeOption}
                            variant={theme === themeOption ? 'default' : 'ghost'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setThemeMode(themeOption)}
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  
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

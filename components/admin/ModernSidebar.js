import { Fragment } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Home,
  MessageCircle,
  BarChart3,
  Settings,
  X,
  Globe,
  User,
  LogOut,
  ClipboardList
} from 'lucide-react';

const getNavigationForRole = (session) => {
  const teamRole = session?.user?.teamRole;
  const isPlatformAdmin = session?.user?.role === 'platform_admin';
  
  const allUsersNav = [
    { 
      name: 'Dashboard', 
      href: '/admin', 
      icon: Home,
      description: 'Overview and quick stats'
    },
    { 
      name: 'Widgets', 
      href: '/admin/widgets', 
      icon: MessageCircle,
      description: teamRole === 'member' ? 'View chat widgets' : 'Manage chat widgets',
      badge: teamRole === 'member' ? undefined : null
    },
    { 
      name: 'Analytics', 
      href: '/admin/analytics', 
      icon: BarChart3,
      description: 'Performance insights'
    },
    { 
      name: 'Support Requests', 
      href: '/admin/support-requests', 
      icon: ClipboardList,
      description: 'Review user requests'
    }
  ];
  
  const adminOnlyNav = [
    { 
      name: 'Demo Widgets', 
      href: '/admin/demo-widgets', 
      icon: Globe,
      description: 'Client demonstrations',
      badge: 'Demo'
    },
    { 
      name: 'Settings', 
      href: '/admin/settings', 
      icon: Settings,
      description: 'Platform configuration'
    }
  ];
  
  if (teamRole === 'member' && !isPlatformAdmin) {
    return allUsersNav;
  }
  
  return [...allUsersNav, ...adminOnlyNav];
};

export default function ModernSidebar({ open, setOpen }) {
  const router = useRouter();
  const { data: session } = useSession();
  const navigation = getNavigationForRole(session);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo and Brand */}
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center">
            <a href="https://elva-solutions.com" target="_blank" rel="noopener noreferrer">
              <img 
                src="/images/Elva Logo Icon 2.svg" 
                alt="Elva Solutions" 
                className="h-10 w-10"
              />
            </a>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Elva-Agents</h1>
            <p className="text-xs text-muted-foreground">AI Chat Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = router.pathname === item.href || 
              (item.href !== '/admin' && router.pathname.startsWith(item.href));
            
            return (
              <Button
                key={item.name}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-3 text-left",
                  isActive && "bg-secondary text-secondary-foreground"
                )}
                onClick={() => {
                  router.push(item.href);
                  setOpen?.(false);
                }}
              >
                <item.icon className="mr-3 h-5 w-5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-3 hover:bg-secondary"
            >
              <Avatar className="h-9 w-9 mr-3">
                <AvatarImage src={session?.user?.image} alt={session?.user?.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                  {getInitials(session?.user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session?.user?.email}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => router.push('/admin/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setOpen(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <span className="sr-only">Close sidebar</span>
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </Transition.Child>
                
                <div className="flex grow flex-col overflow-y-auto bg-card border-r">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col overflow-y-auto bg-card border-r">
          <SidebarContent />
        </div>
      </div>
    </>
  );
}

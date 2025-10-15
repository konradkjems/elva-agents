import { useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  MoreVertical,
  Edit,
  Copy,
  Trash,
  Eye,
  BarChart3,
  MessageCircle,
  Users,
  Calendar,
  Globe,
  Zap
} from 'lucide-react';

export default function ModernWidgetCard({ widget }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleEdit = () => {
    router.push(`/admin/widgets/${widget._id}`);
  };

  const handleView = () => {
    window.open(`/widget-preview/${widget._id}`, '_blank');
  };

  const handleDuplicate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/widgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...widget,
          name: `${widget.name} (Copy)`,
          _id: undefined,
        }),
      });

      if (response.ok) {
        toast({
          title: "Widget duplicated",
          description: "The widget has been successfully duplicated.",
        });
        router.reload();
      } else {
        throw new Error('Failed to duplicate widget');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Duplication failed",
        description: "There was a problem duplicating the widget.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this widget?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/widgets/${widget._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Widget deleted",
          description: "The widget has been successfully deleted.",
        });
        router.reload();
      } else {
        throw new Error('Failed to delete widget');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: "There was a problem deleting the widget.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? "default" : "secondary";
  };

  const getStatusClassName = (status) => {
    if (status === 'active') {
      return "bg-green-100 text-green-800 hover:bg-green-200";
    }
    return "bg-gray-100 text-gray-800 hover:bg-gray-200";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 border hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {getInitials(widget.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-semibold truncate">
                {widget.name}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={getStatusClassName(widget.status)}
                >
                  {widget.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
                {widget.domain && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Globe className="h-3 w-3 mr-1" />
                    {widget.domain}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isLoading}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleView}>
                <Eye className="mr-2 h-4 w-4" />
                Preview Widget
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Widget
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate} disabled={isLoading}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {widget.description || 'No description provided'}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <MessageCircle className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-lg font-semibold">
              {widget.stats?.totalConversations || 0}
            </div>
            <div className="text-xs text-muted-foreground">Conversations</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-lg font-semibold">
              {widget.stats?.uniqueUsers || 0}
            </div>
            <div className="text-xs text-muted-foreground">Users</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Zap className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-lg font-semibold">
              {widget.stats?.responseTime || 0}ms
            </div>
            <div className="text-xs text-muted-foreground">Avg Response</div>
          </div>
        </div>

        {/* Last Activity */}
        <div className="flex items-center text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          Last updated {formatDate(widget.updatedAt || widget.createdAt)}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex w-full space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => router.push(`/admin/analytics?widget=${widget._id}`)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={handleEdit}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardFooter>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </Card>
  );
}

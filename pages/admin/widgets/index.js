import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import ModernLayout from '@/components/admin/ModernLayout';
import {
  MessageCircle,
  Search,
  Calendar,
  Star,
  Download,
  Plus,
  Settings,
  BarChart3
} from 'lucide-react';

export default function WidgetsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [widgets, setWidgets] = useState([]);
  const [selectedWidget, setSelectedWidget] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Load initial data
  useEffect(() => {
    fetchWidgets();
  }, []);

  // Load conversations when widget selected
  useEffect(() => {
    if (selectedWidget) {
      fetchConversations();
    }
  }, [selectedWidget, dateFilter]);

  const fetchWidgets = async () => {
    try {
      const response = await fetch('/api/admin/widgets');
      if (response.ok) {
        const data = await response.json();
        setWidgets(data);
        if (data.length > 0) {
          setSelectedWidget(data[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch widgets:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load widgets",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    if (!selectedWidget) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        widgetId: selectedWidget,
        period: dateFilter,
        search: searchTerm
      });
      
      const response = await fetch(`/api/admin/conversations/widget/${selectedWidget}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        // Select first conversation if none selected
        if (data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load conversations",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupConversationsByDate = (conversations) => {
    const groups = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    conversations.forEach(conv => {
      const convDate = new Date(conv.startTime);
      let groupKey;
      
      if (convDate.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (convDate.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = convDate.toLocaleDateString('da-DK', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(conv);
    });
    
    return groups;
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            className={`h-3 w-3 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    );
  };

  const selectedWidgetName = widgets.find(w => w._id === selectedWidget)?.name || 'Select Widget';

  if (loading && widgets.length === 0) {
    return (
      <ModernLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Widgets</h1>
            <p className="text-muted-foreground">
              View and manage conversations for your chat widgets
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/analytics')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button
              onClick={() => router.push('/admin/widgets/create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Widget
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedWidget} onValueChange={setSelectedWidget}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a widget" />
            </SelectTrigger>
            <SelectContent>
              {widgets.map(widget => (
                <SelectItem key={widget._id} value={widget._id}>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {widget.name}
                    <Badge variant={widget.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                      {widget.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Main Content */}
        {selectedWidget ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
            {/* Conversation List */}
            <Card className="flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Conversations
                </CardTitle>
                <CardDescription>
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto min-h-0">
                  {loading ? (
                    <div className="p-4 space-y-4">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No conversations found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  ) : (
                    Object.entries(groupConversationsByDate(conversations)).map(([date, convs]) => (
                      <div key={date}>
                        <div className="px-4 py-2 bg-muted/50 border-b">
                          <h4 className="text-sm font-medium text-muted-foreground">{date}</h4>
                        </div>
                        {convs.map(conversation => (
                          <div
                            key={conversation._id}
                            className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                              selectedConversation?._id === conversation._id ? 'bg-muted' : ''
                            }`}
                            onClick={() => setSelectedConversation(conversation)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-medium">
                                #{conversation._id.slice(-6)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(conversation.startTime).toLocaleTimeString('da-DK', {
                                  hour: '2-digit',
                                  minute: '2-digit', hour12: false
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {conversation.messages?.[0]?.content || 'No messages'}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
                              </span>
                              {renderStars(conversation.satisfaction)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat View */}
            <Card className="lg:col-span-2 flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0">
                <CardTitle>
                  {selectedConversation ? `Conversation #${selectedConversation._id.slice(-6)}` : 'Select a conversation'}
                </CardTitle>
                {selectedConversation && (
                  <CardDescription>
                    Started {new Date(selectedConversation.startTime).toLocaleString('da-DK', { hour12: false })} • 
                    {selectedConversation.metadata?.country && ` ${selectedConversation.metadata.country} • `}
                    {selectedConversation.messageCount} messages
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                {selectedConversation ? (
                  <div className="space-y-4 flex-1 overflow-y-auto p-4 min-h-0">
                    {selectedConversation.messages?.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.type === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.type === 'user'
                              ? 'bg-muted text-foreground'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.type === 'user' ? 'text-muted-foreground' : 'text-primary-foreground/70'
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString('da-DK', {
                              hour: '2-digit',
                              minute: '2-digit', hour12: false
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center flex-1 text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a conversation to view messages</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No widgets found</p>
                <Button onClick={() => router.push('/admin/widgets/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first widget
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ModernLayout>
  );
}

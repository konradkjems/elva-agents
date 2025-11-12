import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ModernLayout from '../../../components/admin/ModernLayout';
import LiveChatInterface from '../../../components/admin/LiveChatInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
};

const statusIcons = {
  pending: ClockIcon,
  in_review: EyeIcon,
  completed: CheckCircleIcon,
  rejected: XCircleIcon
};

export default function ManualReviews() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('support-requests');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [conversationKey, setConversationKey] = useState(0);
  const [supportEmail, setSupportEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  
  // Live chat queue state
  const [liveChatQueue, setLiveChatQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [queuePollingInterval, setQueuePollingInterval] = useState(null);

  useEffect(() => {
    fetchReviews();
    fetchSupportEmail();
    
    // Set active tab from URL query
    if (router.query.tab === 'live-chat') {
      setActiveTab('live-chat');
    }
  }, [statusFilter, router.query.tab]);

  // Live chat queue - use longer interval to reduce refresh frequency
  useEffect(() => {
    if (activeTab === 'live-chat') {
      fetchLiveChatQueue();
      const interval = setInterval(() => {
        fetchLiveChatQueue();
      }, 10000); // Poll every 10 seconds (less frequent)
      setQueuePollingInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      if (queuePollingInterval) {
        clearInterval(queuePollingInterval);
        setQueuePollingInterval(null);
      }
    }
  }, [activeTab]);

  const fetchLiveChatQueue = async () => {
    try {
      setQueueLoading(true);
      const response = await fetch('/api/live-chat/queue');
      if (response.ok) {
        const data = await response.json();
        setLiveChatQueue(data.queue || []);
      }
    } catch (error) {
      console.error('Failed to fetch live chat queue:', error);
    } finally {
      setQueueLoading(false);
    }
  };

  const acceptLiveChat = async (conversationId) => {
    try {
      const response = await fetch('/api/live-chat/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedChat({ conversationId, agentInfo: data.agentInfo });
        toast({
          title: 'Chat accepted',
          description: 'You are now connected to the user'
        });
        fetchLiveChatQueue(); // Refresh queue
      } else {
        const errorData = await response.json();
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorData.error || 'Failed to accept chat'
        });
      }
    } catch (error) {
      console.error('Error accepting live chat:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept chat'
      });
    }
  };

  const formatWaitTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  // Reset notes when selecting a new review
  useEffect(() => {
    if (selectedReview) {
      console.log('🔄 Selected review changed:', {
        reviewId: selectedReview._id,
        conversationId: selectedReview.conversation?._id,
        messageCount: selectedReview.conversation?.messages?.length || 0,
        messages: selectedReview.conversation?.messages
      });
      setNotes('');
      setConversationKey(prev => prev + 1); // Force re-render
    }
  }, [selectedReview]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/support-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch support requests');
      }
      const data = await response.json();
      
      // Filter by status if not 'all'
      let filteredReviews = data.reviews || [];
      if (statusFilter !== 'all') {
        filteredReviews = filteredReviews.filter(review => review.status === statusFilter);
      }
      
      console.log('📊 Fetched reviews:', filteredReviews.map(r => ({
        id: r._id,
        conversationId: r.conversation?._id,
        messageCount: r.conversation?.messages?.length || 0,
        hasMessages: !!r.conversation?.messages
      })));
      
      setReviews(filteredReviews);
    } catch (error) {
      console.error('Failed to fetch support requests:', error);
      toast({
        variant: "destructive",
        title: "Failed to load reviews",
        description: "There was a problem loading support requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportEmail = async () => {
    try {
      const response = await fetch('/api/admin/organization/settings');
      if (response.ok) {
        const data = await response.json();
        setSupportEmail(data.settings?.supportEmail || '');
      }
    } catch (error) {
      console.error('Failed to fetch support email:', error);
    }
  };

  const saveSupportEmail = async () => {
    try {
      setSavingEmail(true);
      const response = await fetch('/api/admin/organization/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supportEmail: supportEmail.trim()
        })
      });

      if (response.ok) {
        toast({
          title: "Support email saved",
          description: "Manual review notifications will be sent to this email address.",
        });
      } else {
        throw new Error('Failed to save support email');
      }
    } catch (error) {
      console.error('Failed to save support email:', error);
      toast({
        variant: "destructive",
        title: "Failed to save email",
        description: "There was a problem saving the support email address.",
      });
    } finally {
      setSavingEmail(false);
    }
  };

  const updateReviewStatus = async (reviewId, newStatus) => {
    try {
      setUpdating(true);
      const response = await fetch('/api/admin/manual-reviews', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          status: newStatus,
          notes: notes.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update review status');
      }

      toast({
        title: "Status Updated",
        description: `Review status updated to ${newStatus.replace('_', ' ')}.`,
      });

      // Refresh reviews
      await fetchReviews();
      setSelectedReview(null);
      setNotes('');
    } catch (error) {
      console.error('Failed to update review status:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update review status. Please try again.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusCount = (status) => {
    return reviews.filter(review => review.status === status).length;
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support Requests</h1>
            <p className="text-muted-foreground">
              Review and manage support requests and live chat
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="support-email" className="text-sm font-medium">
                Support Email:
              </Label>
              <Input
                id="support-email"
                type="email"
                placeholder="support@example.com"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-64"
              />
              <Button 
                onClick={saveSupportEmail} 
                disabled={savingEmail}
                size="sm"
              >
                {savingEmail ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <Button onClick={fetchReviews} variant="outline">
              <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="support-requests">
              Support Requests
              {reviews.length > 0 && (
                <Badge className="ml-2">{reviews.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="live-chat">
              Live Chat Queue
              {liveChatQueue.length > 0 && (
                <Badge className="ml-2 bg-red-500">{liveChatQueue.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="support-requests" className="space-y-6">
            {/* Status Overview */}
            <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <ClockIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getStatusCount('pending')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
              <EyeIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getStatusCount('in_review')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getStatusCount('completed')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getStatusCount('rejected')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Reviews List */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Reviews List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Review Requests</CardTitle>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No support requests found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => {
                      const StatusIcon = statusIcons[review.status];
                      return (
                        <div
                          key={review._id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedReview?._id === review._id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          }`}
                          onClick={() => setSelectedReview(review)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-sm">
                                  {review.contactInfo.name || review.contactInfo.email}
                                </h3>
                                <Badge className={statusColors[review.status]}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {review.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {review.message && review.message.length > 100 
                                  ? `${review.message.substring(0, 100)}...`
                                  : review.message || 'Ingen besked'
                                }
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <ChatBubbleLeftRightIcon className="h-3 w-3" />
                                  {review.conversation?.messageCount || 0} messages
                                </span>
                                <span>{formatDate(review.submittedAt)}</span>
                                {review.organization && (
                                  <span>Org: {review.organization.name}</span>
                                )}
                                {review.widget && (
                                  <span>Widget: {review.widget.name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Review Details */}
          <div>
            {selectedReview ? (
              <Card key={selectedReview._id}>
                <CardHeader>
                  <CardTitle>Review Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Information */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Kontaktinformation</h4>
                    <div className="space-y-2 text-sm">
                      {selectedReview.contactInfo.name && (
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedReview.contactInfo.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <EnvelopeIcon className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={`mailto:${selectedReview.contactInfo.email}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {selectedReview.contactInfo.email}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  {selectedReview.message && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Besked fra bruger</h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {selectedReview.message}
                      </p>
                    </div>
                  )}

                  {/* Conversation Messages */}
                  <div key={`${selectedReview._id}-${conversationKey}`}>
                    <h4 className="font-medium text-sm mb-3">Samtale ({selectedReview.conversation?.messageCount || 0} beskeder)</h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      {(() => {
                        console.log('🎯 Rendering conversation messages for review:', selectedReview._id, {
                          hasConversation: !!selectedReview.conversation,
                          messageCount: selectedReview.conversation?.messages?.length || 0,
                          messages: selectedReview.conversation?.messages
                        });
                        return null;
                      })()}
                      {selectedReview.conversation?.messages && selectedReview.conversation.messages.length > 0 ? (
                        selectedReview.conversation.messages.map((msg, index) => (
                          <div
                            key={`${selectedReview._id}-${conversationKey}-${msg.id || index}`}
                            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                msg.type === 'user'
                                  ? 'bg-blue-600 text-white dark:bg-blue-700'
                                  : 'bg-white border border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-xs opacity-75">
                                  {msg.type === 'user' ? 'Bruger' : 'AI Assistant'}
                                </span>
                                <span className="text-xs opacity-60">
                                  {new Date(msg.timestamp).toLocaleTimeString('da-DK', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Ingen beskeder i samtalen
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      <p>Startet: {formatDate(selectedReview.conversation?.createdAt)}</p>
                      {selectedReview.organization && (
                        <p>Organization: {selectedReview.organization.name}</p>
                      )}
                      {selectedReview.widget && (
                        <p>Widget: {selectedReview.widget.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Status Update */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Update Status</h4>
                    <Textarea
                      placeholder="Add notes (optional)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mb-3"
                    />
                    <div className="flex gap-2">
                      {selectedReview.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReviewStatus(selectedReview._id, 'in_review')}
                            disabled={updating}
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            Start Review
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReviewStatus(selectedReview._id, 'rejected')}
                            disabled={updating}
                          >
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {selectedReview.status === 'in_review' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateReviewStatus(selectedReview._id, 'completed')}
                            disabled={updating}
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReviewStatus(selectedReview._id, 'rejected')}
                            disabled={updating}
                          >
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {(selectedReview.status === 'completed' || selectedReview.status === 'rejected') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReviewStatus(selectedReview._id, 'pending')}
                          disabled={updating}
                        >
                          <ClockIcon className="h-4 w-4 mr-1" />
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a review to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
          </TabsContent>

          <TabsContent value="live-chat" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3 h-[calc(100vh-300px)]">
              {/* Queue List */}
              <div className="lg:col-span-1">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Waiting Queue</CardTitle>
                      <Button onClick={fetchLiveChatQueue} variant="outline" size="sm">
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {queueLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : liveChatQueue.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No pending live chat requests
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {liveChatQueue.map((item) => (
                          <div
                            key={item.conversationId}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedChat?.conversationId === item.conversationId
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => {
                              if (item.conversationId !== selectedChat?.conversationId) {
                                // Check if already accepted
                                fetch(`/api/live-chat/poll?conversationId=${item.conversationId}`)
                                  .then(res => res.json())
                                  .then(data => {
                                    if (data.status === 'active') {
                                      setSelectedChat({ conversationId: item.conversationId, agentInfo: data.agentInfo });
                                    } else {
                                      acceptLiveChat(item.conversationId);
                                    }
                                  });
                              }
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-sm">{item.widgetName}</h3>
                                  <Badge className="bg-red-500">
                                    Waiting
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {item.organizationName}
                                </p>
                                {item.handoffReason && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    "{item.handoffReason.substring(0, 60)}..."
                                  </p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <ClockIcon className="h-3 w-3" />
                                    {formatWaitTime(item.waitTimeSeconds)}
                                  </span>
                                  <span>{item.messageCount} messages</span>
                                </div>
                              </div>
                            </div>
                            {selectedChat?.conversationId !== item.conversationId && (
                              <Button
                                size="sm"
                                className="w-full mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acceptLiveChat(item.conversationId);
                                }}
                              >
                                Accept Chat
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Chat Interface */}
              <div className="lg:col-span-2">
                {selectedChat ? (
                  <LiveChatInterface
                    conversationId={selectedChat.conversationId}
                    onEndChat={() => {
                      setSelectedChat(null);
                      fetchLiveChatQueue();
                    }}
                  />
                ) : (
                  <Card className="h-full">
                    <CardContent className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a chat from the queue to start</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  );
}

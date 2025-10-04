import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ModernLayout from '../../../components/admin/ModernLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
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
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/manual-reviews');
      if (!response.ok) {
        throw new Error('Failed to fetch manual reviews');
      }
      const data = await response.json();
      
      // Filter by status if not 'all'
      let filteredReviews = data.reviews || [];
      if (statusFilter !== 'all') {
        filteredReviews = filteredReviews.filter(review => review.status === statusFilter);
      }
      
      setReviews(filteredReviews);
    } catch (error) {
      console.error('Failed to fetch manual reviews:', error);
      toast({
        variant: "destructive",
        title: "Failed to load reviews",
        description: "There was a problem loading manual review requests.",
      });
    } finally {
      setLoading(false);
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
            <h1 className="text-3xl font-bold tracking-tight">Manual Reviews</h1>
            <p className="text-muted-foreground">
              Review and manage manual review requests from users
            </p>
          </div>
          <Button onClick={fetchReviews} variant="outline">
            <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <ClockIcon className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getStatusCount('pending')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
              <EyeIcon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getStatusCount('in_review')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getStatusCount('completed')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircleIcon className="h-4 w-4 text-red-600" />
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
                    No manual review requests found.
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
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedReview(review)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-sm">
                                  {review.contactInfo.name}
                                </h3>
                                <Badge className={statusColors[review.status]}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {review.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {review.message.length > 100 
                                  ? `${review.message.substring(0, 100)}...`
                                  : review.message
                                }
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <ChatBubbleLeftRightIcon className="h-3 w-3" />
                                  {review.conversation?.messageCount || 0} messages
                                </span>
                                <span>{formatDate(review.submittedAt)}</span>
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
              <Card>
                <CardHeader>
                  <CardTitle>Review Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Information */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedReview.contactInfo.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <EnvelopeIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedReview.contactInfo.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedReview.contactInfo.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Message</h4>
                    <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                      {selectedReview.message}
                    </p>
                  </div>

                  {/* Conversation Info */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Conversation</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>Messages: {selectedReview.conversation?.messageCount || 0}</p>
                      <p>Started: {formatDate(selectedReview.conversation?.createdAt)}</p>
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
      </div>
    </ModernLayout>
  );
}

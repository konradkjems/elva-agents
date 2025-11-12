import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function LiveChatInterface({ conversationId, onEndChat }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [agentInfo, setAgentInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const processedMessageIds = useRef(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;

    // Initial load
    fetchInitialMessages();

    // Set up SSE connection
    const eventSource = new EventSource(`/api/live-chat/stream?conversationId=${conversationId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('SSE connected');
        } else if (data.type === 'status') {
          setConversation(prev => ({ ...prev, status: data.status }));
          if (data.agentInfo) {
            setAgentInfo(data.agentInfo);
          }
        } else if (data.type === 'message') {
          // Avoid duplicate messages
          if (!processedMessageIds.current.has(data.message.id)) {
            processedMessageIds.current.add(data.message.id);
            setMessages(prev => [...prev, data.message]);
          }
        } else if (data.type === 'error') {
          console.error('SSE error:', data.error);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // EventSource will automatically reconnect
    };

    return () => {
      eventSource.close();
      processedMessageIds.current.clear();
    };
  }, [conversationId]);

  const fetchInitialMessages = async () => {
    try {
      const response = await fetch(`/api/live-chat/poll?conversationId=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setConversation(data);
        if (data.agentInfo) {
          setAgentInfo(data.agentInfo);
        }
        if (data.newMessages && data.newMessages.length > 0) {
          const initialMessages = data.newMessages;
          setMessages(initialMessages);
          // Mark all initial messages as processed
          initialMessages.forEach(msg => {
            if (msg.id) processedMessageIds.current.add(msg.id);
          });
        }
      }
    } catch (error) {
      console.error('Error fetching initial messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !conversationId) return;

    setSending(true);
    try {
      const response = await fetch('/api/live-chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: newMessage.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        lastMessageIdRef.current = data.message.id;
      } else {
        const errorData = await response.json();
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorData.error || 'Failed to send message'
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message'
      });
    } finally {
      setSending(false);
    }
  };

  const endChat = async () => {
    if (!conversationId) return;

    try {
      const response = await fetch('/api/live-chat/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      });

      if (response.ok) {
        toast({
          title: 'Chat ended',
          description: 'Live chat has been ended successfully'
        });
        if (onEndChat) onEndChat();
      } else {
        const errorData = await response.json();
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorData.error || 'Failed to end chat'
        });
      }
    } catch (error) {
      console.error('Error ending chat:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to end chat'
      });
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Live Chat</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={endChat}
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            End Chat
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg, index) => {
              const isAgent = msg.type === 'agent' || msg.role === 'agent';
              const isUser = msg.type === 'user' || msg.role === 'user';
              
              return (
                <div
                  key={msg.id || index}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : isAgent
                        ? 'bg-green-100 text-green-900 border border-green-300'
                        : 'bg-gray-100 text-gray-900 border border-gray-300'
                    }`}
                  >
                    {isAgent && msg.agentInfo && (
                      <div className="text-xs font-semibold mb-1 opacity-75">
                        {msg.agentInfo.displayName}
                        {msg.agentInfo.title && ` - ${msg.agentInfo.title}`}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className="text-xs opacity-60 mt-1">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className="min-h-[60px] resize-none"
              disabled={sending}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


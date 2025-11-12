import { ObjectId } from 'mongodb';
import clientPromise from '../../../lib/mongodb';

// Store active connections - Map<conversationId, Set<res>>
const activeConnections = new Map();
let lastMessageIds = new Map(); // Track last message ID per conversation
let lastStatusMap = new Map(); // Track last status per connection
let heartbeatMap = new Map(); // Track heartbeat timestamps

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, lastMessageId } = req.query;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

    // Store connection
    if (!activeConnections.has(conversationId)) {
      activeConnections.set(conversationId, new Set());
    }
    activeConnections.get(conversationId).add(res);

    // Store last message ID if provided
    if (lastMessageId) {
      lastMessageIds.set(`${conversationId}-${res}`, lastMessageId);
    }

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', conversationId })}\n\n`);

    // Send initial state
    const client = await clientPromise;
    const db = client.db('elva-agents');
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(conversationId)
    });

    if (conversation) {
      const initialStatus = {
        type: 'status',
        conversationId,
        status: conversation.liveChat?.status || 'ai',
        agentInfo: conversation.liveChat?.agentInfo || null
      };
      res.write(`data: ${JSON.stringify(initialStatus)}\n\n`);
    }

    // Set up interval to check for updates (less frequent than before)
    const checkInterval = setInterval(async () => {
      try {
        // Check if connection is still alive
        if (res.closed || res.destroyed) {
          clearInterval(checkInterval);
          return;
        }

        const conversation = await db.collection('conversations').findOne({
          _id: new ObjectId(conversationId)
        });

        if (!conversation) {
          res.write(`data: ${JSON.stringify({ type: 'error', error: 'Conversation not found' })}\n\n`);
          clearInterval(checkInterval);
          cleanupConnection(conversationId, res);
          return;
        }

        // Check for status changes
        const currentStatus = conversation.liveChat?.status || 'ai';
        const storedStatusKey = `${conversationId}-status-${res}`;
        const lastStatus = lastStatusMap.get(storedStatusKey);
        
        if (lastStatus !== currentStatus) {
          lastStatusMap.set(storedStatusKey, currentStatus);
          const statusUpdate = {
            type: 'status',
            conversationId,
            status: currentStatus,
            agentInfo: conversation.liveChat?.agentInfo || null
          };
          res.write(`data: ${JSON.stringify(statusUpdate)}\n\n`);
        }

        // Check for new messages
        const messages = conversation.messages || [];
        if (messages.length > 0) {
          const storedLastId = lastMessageIds.get(`${conversationId}-${res}`);
          const lastMessage = messages[messages.length - 1];
          
          if (!storedLastId || lastMessage.id !== storedLastId) {
            lastMessageIds.set(`${conversationId}-${res}`, lastMessage.id);
            
            // Send only new messages
            let messagesToSend = messages;
            if (storedLastId) {
              const lastIndex = messages.findIndex(m => m.id === storedLastId);
              if (lastIndex >= 0) {
                messagesToSend = messages.slice(lastIndex + 1);
              }
            }
            
            messagesToSend.forEach(msg => {
              const messageUpdate = {
                type: 'message',
                conversationId,
                message: msg
              };
              res.write(`data: ${JSON.stringify(messageUpdate)}\n\n`);
            });
          }
        }

        // Send heartbeat every 30 seconds
        const heartbeatKey = `${conversationId}-heartbeat-${res}`;
        const lastHeartbeat = heartbeatMap.get(heartbeatKey) || 0;
        if (Date.now() - lastHeartbeat > 30000) {
          res.write(`: heartbeat\n\n`);
          heartbeatMap.set(heartbeatKey, Date.now());
        }

      } catch (error) {
        console.error('Error in SSE stream:', error);
        if (!res.closed && !res.destroyed) {
          res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        }
      }
    }, 2000); // Check every 2 seconds (less frequent)

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(checkInterval);
      cleanupConnection(conversationId, res);
    });

  } catch (error) {
    console.error('Error setting up SSE stream:', error);
    if (!res.closed && !res.destroyed) {
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

function cleanupConnection(conversationId, res) {
  const connections = activeConnections.get(conversationId);
  if (connections) {
    connections.delete(res);
    if (connections.size === 0) {
      activeConnections.delete(conversationId);
    }
  }
  lastMessageIds.delete(`${conversationId}-${res}`);
  lastStatusMap.delete(`${conversationId}-status-${res}`);
  heartbeatMap.delete(`${conversationId}-heartbeat-${res}`);
}

// Helper function to broadcast to all connections for a conversation
export function broadcastToConversation(conversationId, data) {
  const connections = activeConnections.get(conversationId);
  if (connections) {
    connections.forEach(res => {
      if (!res.closed && !res.destroyed) {
        try {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (error) {
          console.error('Error broadcasting to connection:', error);
          cleanupConnection(conversationId, res);
        }
      } else {
        cleanupConnection(conversationId, res);
      }
    });
  }
}


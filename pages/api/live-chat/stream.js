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
  
  console.log('📡 SSE endpoint called:', req.url);

  try {
    const { conversationId, lastMessageId } = req.query;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    // Normalize conversationId to string
    const convId = conversationId.toString();
    console.log('SSE connection established for conversation:', convId);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

    // Store connection
    if (!activeConnections.has(convId)) {
      activeConnections.set(convId, new Set());
      console.log(`Created new connection set for conversation ${convId}`);
    }
    activeConnections.get(convId).add(res);
    console.log(`✅ Connection stored. Total connections for conversation ${convId}: ${activeConnections.get(convId).size}`);
    console.log(`📊 All active conversation IDs:`, Array.from(activeConnections.keys()));

    // Store last message ID if provided
    if (lastMessageId) {
      lastMessageIds.set(`${convId}-${res}`, lastMessageId);
    }

    // Send initial connection message
    console.log('Sending initial connected message');
    res.write(`data: ${JSON.stringify({ type: 'connected', conversationId: convId })}\n\n`);

    // Send initial state
    const client = await clientPromise;
    const db = client.db('elva-agents');
    const conversation = await db.collection('conversations').findOne({
      _id: new ObjectId(convId)
    });

    if (conversation) {
      const initialStatus = {
        type: 'status',
        conversationId: convId,
        status: conversation.liveChat?.status || 'ai',
        agentInfo: conversation.liveChat?.agentInfo || null
      };
      console.log('Sending initial status:', initialStatus);
      res.write(`data: ${JSON.stringify(initialStatus)}\n\n`);
      
      // Also send existing messages
      const messages = conversation.messages || [];
      console.log(`Conversation has ${messages.length} messages`);
      if (messages.length > 0) {
        // Send last 10 messages
        const recentMessages = messages.slice(-10);
        recentMessages.forEach(msg => {
          console.log('Sending existing message:', msg.id, msg.type);
          res.write(`data: ${JSON.stringify({ type: 'message', conversationId: convId, message: msg })}\n\n`);
        });
      }
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
          _id: new ObjectId(convId)
        });

        if (!conversation) {
          res.write(`data: ${JSON.stringify({ type: 'error', error: 'Conversation not found' })}\n\n`);
          clearInterval(checkInterval);
          cleanupConnection(convId, res);
          return;
        }

        // Check for status changes
        const currentStatus = conversation.liveChat?.status || 'ai';
        const storedStatusKey = `${convId}-status-${res}`;
        const lastStatus = lastStatusMap.get(storedStatusKey);
        
        if (lastStatus !== currentStatus) {
          lastStatusMap.set(storedStatusKey, currentStatus);
          const statusUpdate = {
            type: 'status',
            conversationId: convId,
            status: currentStatus,
            agentInfo: conversation.liveChat?.agentInfo || null
          };
          res.write(`data: ${JSON.stringify(statusUpdate)}\n\n`);
        }

        // Check for new messages
        const messages = conversation.messages || [];
        if (messages.length > 0) {
          const storedLastId = lastMessageIds.get(`${convId}-${res}`);
          const lastMessage = messages[messages.length - 1];
          
          if (!storedLastId || lastMessage.id !== storedLastId) {
            lastMessageIds.set(`${convId}-${res}`, lastMessage.id);
            
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
                conversationId: convId,
                message: msg
              };
              console.log('Sending new message via SSE:', msg.id, msg.type);
              res.write(`data: ${JSON.stringify(messageUpdate)}\n\n`);
            });
          }
        }

        // Send heartbeat every 30 seconds
        const heartbeatKey = `${convId}-heartbeat-${res}`;
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
      cleanupConnection(convId, res);
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
  const convId = conversationId.toString();
  const connections = activeConnections.get(convId);
  if (connections) {
    connections.delete(res);
    if (connections.size === 0) {
      activeConnections.delete(convId);
    }
  }
  lastMessageIds.delete(`${convId}-${res}`);
  lastStatusMap.delete(`${convId}-status-${res}`);
  heartbeatMap.delete(`${convId}-heartbeat-${res}`);
}

// Helper function to broadcast to all connections for a conversation
export function broadcastToConversation(conversationId, data) {
  // Normalize conversationId to string
  const convId = conversationId.toString();
  console.log('broadcastToConversation called with conversationId:', convId);
  console.log('Active connections keys:', Array.from(activeConnections.keys()));
  
  const connections = activeConnections.get(convId);
  if (connections) {
    console.log(`Found ${connections.size} active connections for conversation ${convId}`);
    connections.forEach(res => {
      if (!res.closed && !res.destroyed) {
        try {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          console.log('Successfully broadcasted message to connection');
        } catch (error) {
          console.error('Error broadcasting to connection:', error);
          cleanupConnection(convId, res);
        }
      } else {
        console.log('Connection closed/destroyed, cleaning up');
        cleanupConnection(convId, res);
      }
    });
  } else {
    console.log(`No active connections found for conversation ${convId}`);
  }
}


# Chat Integration Guide for Frontend

This document provides a complete guide for integrating the real-time chat feature into your frontend application.

## Overview

The chat system enables real-time messaging between users who have interacted through the dating app's join request feature. It includes:
- Real-time WebSocket communication via Socket.IO
- 5-message limit for requesters before receiving a response
- Support for text, image, and system messages
- Typing indicators and read receipts
- REST API fallback for message history

## Base URL

```
WebSocket: ws://localhost:3000/chat
REST API:  http://localhost:3000/chat
```

## Authentication

All socket connections and REST API calls require JWT authentication.

### Socket.IO Authentication

Connect to the socket with your JWT token:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'your-jwt-token-here'
  },
  // Alternative: send token in Authorization header
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token-here'
  }
});
```

### REST API Authentication

Include the JWT token in the Authorization header:

```typescript
fetch('http://localhost:3000/chat/conversations', {
  headers: {
    'Authorization': 'Bearer your-jwt-token-here',
    'Content-Type': 'application/json'
  }
});
```

## WebSocket Events

### Client → Server Events

#### Join Conversation
```typescript
socket.emit('join:conversation', {
  conversationId: 'conversation_id_here'
});
```

**Response Events:**
- `joined` - Successfully joined the conversation
- `error` - Failed to join (with error message)

#### Send Message
```typescript
socket.emit('message:send', {
  conversationId: 'conversation_id_here',
  type: 'text', // 'text' | 'image' | 'system'
  content: 'Hello!',
  metadata: {} // Optional, for system messages
});
```

**Response Events:**
- `message:sent` - Message saved successfully (returns the message object)
- `error` - Failed to send message (e.g., message limit exceeded)

**Message Types:**
- `text`: Regular text messages
- `image`: Image messages (content should be image URL)
- `system`: System/bot messages (requires metadata)

#### Typing Indicator - Start
```typescript
socket.emit('typing:start', {
  conversationId: 'conversation_id_here'
});
```

#### Typing Indicator - Stop
```typescript
socket.emit('typing:stop', {
  conversationId: 'conversation_id_here'
});
```

#### Mark Message as Read
```typescript
socket.emit('message:read', {
  messageId: 'message_id_here'
});
```

#### Leave Conversation
```typescript
socket.emit('leave:conversation', {
  conversationId: 'conversation_id_here'
});
```

### Server → Client Events

#### New Message Received
```typescript
socket.on('message:new', (message) => {
  console.log('New message:', message);
  // {
  //   id: string,
  //   conversationId: string,
  //   sender: { id: string, fullname: string, avatarUrl: string } | null,
  //   type: 'text' | 'image' | 'system',
  //   content: string,
  //   metadata: {},
  //   readBy: string[],
  //   createdAt: string,
  //   updatedAt: string
  // }
});
```

#### Message Sent Confirmation
```typescript
socket.on('message:sent', (message) => {
  console.log('Message sent:', message);
  // Same format as message:new
});
```

#### Typing Indicator
```typescript
socket.on('typing:start', (data) => {
  console.log('User typing:', data);
  // { conversationId: string, userId: string }
});

socket.on('typing:stop', (data) => {
  console.log('User stopped typing:', data);
  // { conversationId: string, userId: string }
});
```

#### Joined Conversation
```typescript
socket.on('joined', (data) => {
  console.log('Joined conversation:', data);
  // { conversationId: string }
});
```

#### Left Conversation
```typescript
socket.on('left', (data) => {
  console.log('Left conversation:', data);
  // { conversationId: string }
});
```

#### Error
```typescript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // { message: string, type?: string }
});
```

## REST API Endpoints

### Get User's Conversations

```typescript
GET /chat/conversations

Response:
[
  {
    id: string,
    participants: [
      {
        id: string,
        fullname: string,
        avatarUrl?: string
      }
    ],
    createdAt: string,
    updatedAt: string
  }
]
```

### Get Conversation Messages

```typescript
GET /chat/conversations/:conversationId/messages?page=1&limit=50

Query Parameters:
- page: number (default: 1)
- limit: number (default: 50, max: 100)

Response:
{
  messages: [
    {
      id: string,
      conversationId: string,
      sender: { id: string, fullname: string, avatarUrl?: string } | null,
      type: 'text' | 'image' | 'system',
      content: string,
      metadata: {},
      readBy: string[],
      createdAt: string,
      updatedAt: string
    }
  ],
  total: number,
  page: number,
  totalPages: number
}
```

### Send Message (REST Fallback)

```typescript
POST /chat/conversations/:conversationId/messages

Body:
{
  type: 'text' | 'image' | 'system',
  content: string,
  metadata?: {}
}

Response:
{
  id: string,
  conversationId: string,
  sender: { id: string, fullname: string, avatarUrl?: string } | null,
  type: string,
  content: string,
  metadata: {},
  readBy: string[],
  createdAt: string,
  updatedAt: string
}
```

### Send System Message (Bot)

```typescript
POST /chat/system-messages

Body:
{
  conversationId: string,
  content: string,
  metadata?: {
    type: string, // e.g., 'reminder'
    ...other properties
  }
}

Response: Message object (same as above)
```

## Message Limit Feature

When a user (User A) sends a join request to another user's date (User B), User A is limited to sending **5 messages** until User B sends their first message. After User B responds, the limit is permanently lifted.

**Error Response when limit is exceeded:**
```typescript
{
  message: "You have reached the maximum number of messages. Please wait for a response.",
  type: "BadRequestException"
}
```

## Conversation Flow

### 1. Creating a Conversation

Conversations are automatically created when a user sends a join request to another user's date. You don't need to manually create conversations.

### 2. Loading Conversations

```typescript
// Get all user's conversations
const response = await fetch('http://localhost:3000/chat/conversations', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const conversations = await response.json();
```

### 3. Loading Message History

```typescript
// Get messages for a conversation
const conversationId = 'conversation_id_here';
const response = await fetch(
  `http://localhost:3000/chat/conversations/${conversationId}/messages?page=1&limit=50`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const { messages, total, page, totalPages } = await response.json();
```

### 4. Real-time Messaging

```typescript
// Join the conversation room
socket.emit('join:conversation', { conversationId });

// Listen for new messages
socket.on('message:new', (message) => {
  // Add message to your UI
  addMessageToUI(message);
});

// Send a message
socket.emit('message:send', {
  conversationId,
  type: 'text',
  content: userInput
});

// Listen for sent confirmation
socket.on('message:sent', (message) => {
  // Update message status in UI
  updateMessageStatus(message);
});
```

## Complete Integration Example

```typescript
import { io, Socket } from 'socket.io-client';

class ChatService {
  private socket: Socket | null = null;
  
  connect(token: string) {
    this.socket = io('http://localhost:3000/chat', {
      auth: { token }
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });
    
    this.socket.on('message:new', (message) => {
      // Handle new message
    });
    
    this.socket.on('message:sent', (message) => {
      // Handle message sent confirmation
    });
    
    this.socket.on('error', (error) => {
      // Handle errors
      console.error('Chat error:', error);
    });
  }
  
  joinConversation(conversationId: string) {
    this.socket?.emit('join:conversation', { conversationId });
  }
  
  sendMessage(conversationId: string, content: string, type: 'text' | 'image' = 'text') {
    this.socket?.emit('message:send', {
      conversationId,
      type,
      content
    });
  }
  
  startTyping(conversationId: string) {
    this.socket?.emit('typing:start', { conversationId });
  }
  
  stopTyping(conversationId: string) {
    this.socket?.emit('typing:stop', { conversationId });
  }
  
  disconnect() {
    this.socket?.disconnect();
  }
}

// Usage
const chatService = new ChatService();
chatService.connect(userToken);
chatService.joinConversation(conversationId);
chatService.sendMessage(conversationId, 'Hello!');
```

## Image Messages

To send an image message:

1. First upload the image using the existing `/images/upload` endpoint
2. Send a message with the returned image URL

```typescript
// Step 1: Upload image
const formData = new FormData();
formData.append('file', imageFile);

const uploadResponse = await fetch('http://localhost:3000/images/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
const { path: imageUrl } = await uploadResponse.json();

// Step 2: Send message with image URL
socket.emit('message:send', {
  conversationId,
  type: 'image',
  content: imageUrl // e.g., '/images/filename.jpg'
});
```

## System Messages

System messages are special messages sent by "bots" or automated systems. They can include:
- Reminders about upcoming dates
- Status updates
- Other automated notifications

Example system message:

```typescript
// Send reminder system message
socket.emit('message:send', {
  conversationId,
  type: 'system',
  content: "Hi there, don't forget we have a date at 20/11 - 20:15",
  metadata: {
    type: 'reminder'
  }
});
```

## Error Handling

Common errors you may encounter:

1. **Authentication Error**: Token missing or invalid
2. **Message Limit Exceeded**: User has sent 5 messages and needs a response
3. **Conversation Not Found**: Invalid conversation ID
4. **Forbidden**: User is not a participant in the conversation

All socket errors are emitted via the `error` event with the following format:
```typescript
{
  message: string,  // Human-readable error message
  type?: string     // Error type/class name
}
```

## Best Practices

1. **Always handle errors**: Listen for the `error` event on your socket connection
2. **Reconnect handling**: Implement reconnection logic for dropped connections
3. **Typing indicators**: Use debouncing (wait 1-2 seconds after user stops typing before sending `typing:stop`)
4. **Message pagination**: Load older messages as users scroll up
5. **Read receipts**: Mark messages as read when they're visible in the UI
6. **Conversation management**: Leave conversations when switching to a different one
7. **Image optimization**: Compress images before uploading

## Testing

Test your integration with the following scenarios:

1. Send a message and verify it appears in real-time
2. Send 6 messages as a requester and verify the limit is enforced
3. Have another user respond and verify the limit is lifted
4. Test typing indicators appear when typing
5. Verify read receipts work correctly
6. Test image message sending
7. Test error handling (invalid token, conversation not found, etc.)

## Support

For questions or issues, please contact the backend team or refer to the Swagger documentation at:
```
http://localhost:3000/api
```


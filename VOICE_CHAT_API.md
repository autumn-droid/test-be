# Voice Chat API Documentation

## Overview

This document describes how to implement voice message functionality in the frontend. Voice messages allow users to record and send audio files in conversations. The implementation follows a two-step process: first upload the voice file, then send a message with the voice file reference.

## Table of Contents

- [Supported Formats](#supported-formats)
- [API Endpoints](#api-endpoints)
- [Implementation Flow](#implementation-flow)
- [Request/Response Examples](#requestresponse-examples)
- [WebSocket Events](#websocket-events)
- [Error Handling](#error-handling)
- [Frontend Implementation Guide](#frontend-implementation-guide)

## Supported Formats

### Audio Formats
- **MP3** (`audio/mpeg`)
- **M4A/AAC** (`audio/mp4`, `audio/x-m4a`, `audio/aac`)
- **WAV** (`audio/wav`)
- **OGG/Opus** (`audio/ogg`)

### File Size Limit
- Maximum file size: **20 MB**

## API Endpoints

### Base URL
All endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

### 1. Upload Voice File

**Endpoint:** `POST /voice/upload`

**Content-Type:** `multipart/form-data`

**Request:**
- Form field name: `file`
- File: Audio file (MP3, M4A, WAV, OGG)

**Response (201 Created):**
```json
{
  "filename": "1729612345678-abc12345-voice.mp3",
  "path": "/voice/1729612345678-abc12345-voice.mp3",
  "size": 1234567,
  "mimetype": "audio/mpeg",
  "uploadedAt": "2024-10-20T10:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid file format or size exceeded
- `401 Unauthorized` - Missing or invalid JWT token

### 2. Get Voice File

**Endpoint:** `GET /voice/:filename`

**Response (200 OK):**
- Returns the audio file as binary data
- Content-Type: `audio/*`

**Error Responses:**
- `404 Not Found` - Voice file not found
- `401 Unauthorized` - Missing or invalid JWT token

### 3. Delete Voice File

**Endpoint:** `DELETE /voice/:filename`

**Response (200 OK):**
```json
{
  "message": "Voice file deleted successfully"
}
```

**Error Responses:**
- `404 Not Found` - Voice file not found
- `401 Unauthorized` - Missing or invalid JWT token

### 4. Send Voice Message

**Endpoint:** `POST /chat/conversations/:conversationId/messages`

**Request Body:**
```json
{
  "type": "voice",
  "content": "Optional caption or transcription",
  "metadata": {
    "voiceUrl": "/voice/1729612345678-abc12345-voice.mp3"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "message-id-123",
  "conversationId": "conversation-id-456",
  "sender": {
    "id": "user-id-789",
    "fullname": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg"
  },
  "type": "voice",
  "content": "Optional caption or transcription",
  "metadata": {
    "voiceUrl": "/voice/1729612345678-abc12345-voice.mp3"
  },
  "readBy": [],
  "createdAt": "2024-10-20T10:30:00.000Z",
  "updatedAt": "2024-10-20T10:30:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Message limit exceeded or validation error
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Not a participant of the conversation
- `404 Not Found` - Conversation not found

## Implementation Flow

### Step-by-Step Process

1. **Record Voice** (Frontend)
   - User records audio using browser MediaRecorder API or similar
   - Convert to supported format (MP3, M4A, WAV, or OGG)
   - Validate file size (max 20MB)

2. **Upload Voice File**
   - Create FormData with the audio file
   - POST to `/voice/upload`
   - Receive voice file metadata including `path`

3. **Send Voice Message**
   - POST to `/chat/conversations/:conversationId/messages`
   - Set `type: "voice"`
   - Include `voiceUrl` in `metadata` from upload response
   - Optionally include `content` for caption/transcription

4. **Handle WebSocket Broadcast**
   - Listen for `message:new` event on WebSocket
   - Update UI with new voice message

## Request/Response Examples

### JavaScript/TypeScript Example

```typescript
// 1. Upload voice file
async function uploadVoiceFile(audioBlob: Blob): Promise<UploadVoiceResponse> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'voice-recording.mp3');

  const response = await fetch(`${API_BASE_URL}/voice/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload voice file');
  }

  return response.json();
}

// 2. Send voice message
async function sendVoiceMessage(
  conversationId: string,
  voiceUrl: string,
  caption?: string
): Promise<MessageResponse> {
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        type: 'voice',
        content: caption || '',
        metadata: {
          voiceUrl: voiceUrl,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to send voice message');
  }

  return response.json();
}

// 3. Complete flow
async function sendVoiceMessageFlow(
  conversationId: string,
  audioBlob: Blob,
  caption?: string
): Promise<MessageResponse> {
  try {
    // Upload voice file
    const uploadResult = await uploadVoiceFile(audioBlob);
    
    // Send message with voice URL
    const message = await sendVoiceMessage(
      conversationId,
      uploadResult.path,
      caption
    );
    
    return message;
  } catch (error) {
    console.error('Error sending voice message:', error);
    throw error;
  }
}
```

### React Example

```tsx
import { useState } from 'react';

function VoiceMessageRecorder({ conversationId }: { conversationId: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm', // or 'audio/mp4', 'audio/wav', etc.
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        // Convert to MP3 if needed (you may need a library like lamejs)
        // For now, assuming the browser supports the format
        
        // Upload and send
        await sendVoiceMessageFlow(conversationId, audioBlob);
        
        setAudioChunks([]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <div>
      {!isRecording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop & Send</button>
      )}
    </div>
  );
}
```

### WebSocket Example

```typescript
// Connect to WebSocket
const socket = io(`${WS_BASE_URL}/chat`, {
  auth: {
    token: getAuthToken(),
  },
});

// Join conversation room
socket.emit('join:conversation', { conversationId: 'conversation-id' });

// Listen for new messages (including voice messages)
socket.on('message:new', (message: MessageResponse) => {
  if (message.type === 'voice') {
    const voiceUrl = message.metadata?.voiceUrl;
    // Update UI with voice message
    displayVoiceMessage(message, voiceUrl);
  }
});

// Function to display voice message
function displayVoiceMessage(message: MessageResponse, voiceUrl: string) {
  const audioUrl = `${API_BASE_URL}${voiceUrl}`;
  
  // Create audio player
  const audioElement = document.createElement('audio');
  audioElement.src = audioUrl;
  audioElement.controls = true;
  
  // Add to message list
  // ... your UI update logic
}
```

## WebSocket Events

### Client → Server Events

#### Join Conversation
```typescript
socket.emit('join:conversation', {
  conversationId: 'conversation-id'
});
```

#### Send Message (Alternative to REST API)
```typescript
socket.emit('message:send', {
  conversationId: 'conversation-id',
  type: 'voice',
  content: 'Optional caption',
  metadata: {
    voiceUrl: '/voice/1729612345678-abc12345-voice.mp3'
  }
});
```

### Server → Client Events

#### New Message
```typescript
socket.on('message:new', (message: MessageResponse) => {
  // Handle new message (text, image, voice, or system)
  if (message.type === 'voice') {
    // Handle voice message
  }
});
```

#### Message Sent Confirmation
```typescript
socket.on('message:sent', (message: MessageResponse) => {
  // Confirmation that your message was sent
});
```

#### Error
```typescript
socket.on('error', (error: { message: string; type?: string }) => {
  // Handle error
  console.error('WebSocket error:', error);
});
```

## Error Handling

### Common Error Scenarios

1. **File Size Exceeded**
   ```json
   {
     "statusCode": 400,
     "message": "File size exceeds limit. Maximum allowed size is 20MB",
     "error": "Bad Request"
   }
   ```

2. **Invalid File Format**
   ```json
   {
     "statusCode": 400,
     "message": "Invalid file type. Only MP3, M4A, WAV, and OGG audio files are allowed.",
     "error": "Bad Request"
   }
   ```

3. **Message Limit Exceeded**
   ```json
   {
     "statusCode": 400,
     "message": "You have reached the maximum number of messages. Please wait for a response.",
     "error": "Bad Request"
   }
   ```

4. **Unauthorized**
   ```json
   {
     "statusCode": 401,
     "message": "Unauthorized",
     "error": "Unauthorized"
   }
   ```

### Error Handling Example

```typescript
async function uploadVoiceFileWithErrorHandling(audioBlob: Blob) {
  try {
    // Validate file size before upload
    if (audioBlob.size > 20 * 1024 * 1024) {
      throw new Error('File size exceeds 20MB limit');
    }

    const result = await uploadVoiceFile(audioBlob);
    return result;
  } catch (error) {
    if (error.response?.status === 400) {
      // Handle validation errors
      console.error('Validation error:', error.response.data.message);
    } else if (error.response?.status === 401) {
      // Handle authentication errors
      console.error('Authentication error - please login again');
      // Redirect to login
    } else {
      // Handle other errors
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

## Frontend Implementation Guide

### 1. Recording Audio

#### Using MediaRecorder API

```typescript
class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Try to use MP3 or M4A if supported, fallback to WebM
    const options = {
      mimeType: 'audio/webm;codecs=opus', // or 'audio/mp4', 'audio/wav'
    };
    
    this.mediaRecorder = new MediaRecorder(stream, options);
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error('No active recording');
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        });
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }
}
```

### 2. File Format Conversion

If your browser doesn't support the desired format, you may need to convert:

```typescript
// Example using a library (you'll need to install one)
// For MP3: lamejs, mp3-encoder
// For M4A: ffmpeg.wasm

async function convertToMP3(audioBlob: Blob): Promise<Blob> {
  // Implementation depends on your chosen library
  // This is a placeholder
  return audioBlob;
}
```

### 3. UI Components

#### Voice Message Player Component

```tsx
interface VoiceMessageProps {
  message: MessageResponse;
  apiBaseUrl: string;
}

function VoiceMessage({ message, apiBaseUrl }: VoiceMessageProps) {
  const voiceUrl = message.metadata?.voiceUrl;
  const audioUrl = voiceUrl ? `${apiBaseUrl}${voiceUrl}` : null;

  if (!audioUrl) {
    return <div>Voice message unavailable</div>;
  }

  return (
    <div className="voice-message">
      {message.content && (
        <p className="voice-caption">{message.content}</p>
      )}
      <audio controls src={audioUrl}>
        Your browser does not support the audio element.
      </audio>
      <span className="voice-duration">
        {/* You may want to store duration in metadata during upload */}
      </span>
    </div>
  );
}
```

### 4. Complete Integration Example

```typescript
class VoiceChatService {
  constructor(
    private apiBaseUrl: string,
    private getAuthToken: () => string
  ) {}

  async sendVoiceMessage(
    conversationId: string,
    audioBlob: Blob,
    caption?: string
  ): Promise<MessageResponse> {
    // Step 1: Upload voice file
    const formData = new FormData();
    formData.append('file', audioBlob);

    const uploadResponse = await fetch(`${this.apiBaseUrl}/voice/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.message || 'Failed to upload voice file');
    }

    const uploadResult = await uploadResponse.json();

    // Step 2: Send message
    const messageResponse = await fetch(
      `${this.apiBaseUrl}/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          type: 'voice',
          content: caption || '',
          metadata: {
            voiceUrl: uploadResult.path,
          },
        }),
      }
    );

    if (!messageResponse.ok) {
      const error = await messageResponse.json();
      throw new Error(error.message || 'Failed to send voice message');
    }

    return messageResponse.json();
  }

  getVoiceFileUrl(voicePath: string): string {
    return `${this.apiBaseUrl}${voicePath}`;
  }
}
```

## Best Practices

1. **File Size Validation**: Always validate file size on the frontend before uploading to provide immediate feedback to users.

2. **Progress Indicators**: Show upload progress for large voice files.

3. **Error Recovery**: Implement retry logic for failed uploads.

4. **Audio Preview**: Allow users to preview their recording before sending.

5. **Format Detection**: Check browser support for audio formats and convert if necessary.

6. **Caching**: Cache downloaded voice files to avoid re-downloading.

7. **Permissions**: Request microphone permissions gracefully with clear messaging.

8. **Duration Limits**: Consider implementing client-side duration limits for better UX.

## Testing

### Test Cases

1. Upload valid voice file (MP3, M4A, WAV, OGG)
2. Upload file exceeding 20MB limit
3. Upload invalid file format
4. Send voice message with caption
5. Send voice message without caption
6. Receive voice message via WebSocket
7. Play voice message audio
8. Handle network errors during upload
9. Handle authentication errors

## Support

For issues or questions, please refer to the main API documentation or contact the backend team.


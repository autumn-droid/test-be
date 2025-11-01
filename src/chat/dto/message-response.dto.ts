export class MessageResponseDto {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    fullname: string;
    avatarUrl?: string;
  } | null;
  type: 'text' | 'image' | 'system';
  content: string;
  metadata: Record<string, any>;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}


export class ConversationResponseDto {
  id: string;
  participants: Array<{
    id: string;
    fullname: string;
    avatarUrl?: string;
  }>;
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
  };
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}


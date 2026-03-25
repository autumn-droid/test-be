export class MessageLimitResponseDto {
  hasLimit: boolean;
  isRequester: boolean;
  messageCount: number;
  remainingMessages: number | null; // null means unlimited
  limitLifted: boolean;
  canSendMessage: boolean;
}


import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageLimitDocument = MessageLimit & Document;

@Schema({ timestamps: true })
export class MessageLimit {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, unique: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0, max: 5 })
  messageCount: number;

  @Prop({ required: true, default: false })
  limitLifted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageLimitSchema = SchemaFactory.createForClass(MessageLimit);


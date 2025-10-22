import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JoinRequestDocument = JoinRequest & Document;

@Schema({ timestamps: true })
export class JoinRequest {
  @Prop({ type: Types.ObjectId, ref: 'DateEntity', required: true })
  dateId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @Prop({ required: true })
  message: string;

  @Prop({ 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  })
  status: 'pending' | 'accepted' | 'rejected';

  createdAt?: Date;
  updatedAt?: Date;
}

export const JoinRequestSchema = SchemaFactory.createForClass(JoinRequest);

// Create compound indexes for better query performance
JoinRequestSchema.index({ dateId: 1, requesterId: 1 }, { unique: true });
JoinRequestSchema.index({ dateId: 1, status: 1 });
JoinRequestSchema.index({ requesterId: 1 });
JoinRequestSchema.index({ createdAt: -1 });

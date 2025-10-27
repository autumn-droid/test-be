import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DateDocument = DateEntity & Document;

@Schema({ timestamps: true })
export class Location {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ required: true })
  visitTime: Date;

  @Prop({ type: [String], default: [] })
  imageUrls: string[];
}

@Schema({ timestamps: true })
export class DateEntity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true })
  startDateTime: Date;

  @Prop({ required: true })
  greetingNote: string;

  @Prop({ type: [Location], required: true })
  locations: Location[];

  @Prop({ type: Types.ObjectId, ref: 'JoinRequest', default: null })
  acceptedRequestId: Types.ObjectId | null;

  @Prop({ 
    type: String, 
    enum: ['open', 'matched'], 
    default: 'open' 
  })
  status: 'open' | 'matched';

  @Prop({ 
    type: {
      amount: { type: Number, required: true },
      currency: { type: String, required: true, enum: ['VND', 'USD', 'EUR', 'JPY', 'GBP', 'CNY'] }
    },
    required: true 
  })
  budgetAmount: {
    amount: number;
    currency: string;
  };

  @Prop({ 
    required: true, 
    min: 0, 
    max: 100 
  })
  costSplitPercentage: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DateSchema = SchemaFactory.createForClass(DateEntity);

// Create indexes for better query performance
DateSchema.index({ ownerId: 1 });
DateSchema.index({ startDateTime: 1 });
DateSchema.index({ status: 1 });
DateSchema.index({ createdAt: -1 });

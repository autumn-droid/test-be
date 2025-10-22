import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  nationCode: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, minlength: 6 })
  fullname: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create compound unique index on nationCode + phoneNumber
UserSchema.index({ nationCode: 1, phoneNumber: 1 }, { unique: true });

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const { nationCode, phoneNumber, password, fullname } = createUserDto;

    // Check if user with this phone number already exists
    const existingUser = await this.userModel.findOne({
      nationCode,
      phoneNumber,
    });

    if (existingUser) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new this.userModel({
      nationCode,
      phoneNumber,
      password: hashedPassword,
      fullname,
    });

    return user.save();
  }

  async findByPhoneNumber(nationCode: string, phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ nationCode, phoneNumber });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update only provided fields
    if (updateData.fullname !== undefined) {
      user.fullname = updateData.fullname;
    }

    return user.save();
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old avatar if exists
    if (user.avatarUrl) {
      await this.deleteOldAvatar(user.avatarUrl);
    }

    // Update avatar URL
    user.avatarUrl = avatarUrl;
    return user.save();
  }

  private async deleteOldAvatar(avatarUrl: string): Promise<void> {
    try {
      // Extract filename from URL path (e.g., "/images/filename.jpg" -> "filename.jpg")
      const filename = avatarUrl.split('/').pop();
      if (filename) {
        const filePath = path.join(process.cwd(), 'storage', 'images', filename);
        await fs.unlink(filePath);
      }
    } catch (error) {
      // Ignore errors when deleting old avatar (file might not exist)
      console.warn(`Failed to delete old avatar: ${error.message}`);
    }
  }
}

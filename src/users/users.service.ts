import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

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
}

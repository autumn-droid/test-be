import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(createUserDto);
    const payload = { sub: (user._id as any).toString(), nationCode: user.nationCode, phoneNumber: user.phoneNumber };
    const accessToken = this.jwtService.sign(payload);

    const userResponse: UserResponseDto = {
      _id: (user._id as any).toString(),
      nationCode: user.nationCode,
      phoneNumber: user.phoneNumber,
      fullname: user.fullname,
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
    };

    return {
      user: userResponse,
      accessToken,
    };
  }

  async login(loginUserDto: LoginUserDto): Promise<AuthResponseDto> {
    const { nationCode, phoneNumber, password } = loginUserDto;

    const user = await this.usersService.findByPhoneNumber(nationCode, phoneNumber);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: (user._id as any).toString(), nationCode: user.nationCode, phoneNumber: user.phoneNumber };
    const accessToken = this.jwtService.sign(payload);

    const userResponse: UserResponseDto = {
      _id: (user._id as any).toString(),
      nationCode: user.nationCode,
      phoneNumber: user.phoneNumber,
      fullname: user.fullname,
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
    };

    return {
      user: userResponse,
      accessToken,
    };
  }

  async validateUser(nationCode: string, phoneNumber: string, password: string): Promise<any> {
    const user = await this.usersService.findByPhoneNumber(nationCode, phoneNumber);
    if (user && await this.usersService.validatePassword(password, user.password)) {
      const { password: _, ...result } = user.toObject();
      return result;
    }
    return null;
  }
}

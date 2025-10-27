import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  private generateTokens(user: any): { accessToken: string; refreshToken: string; expiredToken: number; expiredRefreshToken: number } {
    const payload = { sub: (user._id as any).toString(), nationCode: user.nationCode, phoneNumber: user.phoneNumber };
    
    // Generate access token (15 minutes)
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    
    // Generate refresh token (7 days) - using different secret
    const refreshToken = this.jwtService.sign(payload, { 
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
    });

    // Calculate expiration timestamps
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = now + (15 * 60); // 15 minutes from now
    const expiredRefreshToken = now + (7 * 24 * 60 * 60); // 7 days from now

    return {
      accessToken,
      refreshToken,
      expiredToken,
      expiredRefreshToken,
    };
  }

  async register(createUserDto: CreateUserDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(createUserDto);
    const tokens = this.generateTokens(user);

    const userResponse: UserResponseDto = {
      _id: (user._id as any).toString(),
      nationCode: user.nationCode,
      phoneNumber: user.phoneNumber,
      fullname: user.fullname,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
    };

    return {
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiredToken: tokens.expiredToken,
      expiredRefreshToken: tokens.expiredRefreshToken,
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

    const tokens = this.generateTokens(user);

    const userResponse: UserResponseDto = {
      _id: (user._id as any).toString(),
      nationCode: user.nationCode,
      phoneNumber: user.phoneNumber,
      fullname: user.fullname,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
    };

    return {
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiredToken: tokens.expiredToken,
      expiredRefreshToken: tokens.expiredRefreshToken,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
      });

      // Get user from database
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      const userResponse: UserResponseDto = {
        _id: (user._id as any).toString(),
        nationCode: user.nationCode,
        phoneNumber: user.phoneNumber,
        fullname: user.fullname,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date(),
      };

      return {
        user: userResponse,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiredToken: tokens.expiredToken,
        expiredRefreshToken: tokens.expiredRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
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

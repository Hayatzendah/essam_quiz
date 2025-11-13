import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  private signAccessToken(payload: any) {
    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    } as any);
  }

  private signRefreshToken(payload: any) {
    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    } as any);
  }

  private async generateTokens(user: { _id: string; email: string; role: string }) {
    const payload = { sub: user._id, email: user.email, role: user.role };
    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.signRefreshToken(payload);
    return { accessToken, refreshToken };
  }

  private async setRefreshHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.users.updateById(userId, { refreshTokenHash: hash });
  }

  async register(dto: { email: string; password: string; role?: 'student' | 'teacher' | 'admin'; state?: string }) {
    const user = await this.users.createUser(dto);
    return { message: 'registered', user };
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.users.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    // Extract user ID - handle both _id (Mongoose) and id (plain object)
    const userId = user._id ? (typeof user._id === 'string' ? user._id : user._id.toString()) : user.id;
    if (!userId) throw new UnauthorizedException('User ID not found');
    
    const tokens = await this.generateTokens({
      _id: userId,
      email: user.email,
      role: user.role || 'student',
    });
    
    // تخزين هاش الريفرش
    await this.setRefreshHash(userId, tokens.refreshToken);
    
    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      // 1) تحقق من توقيع التوكن
      const decoded = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });

      // 2) هات المستخدم ومعاه refreshTokenHash
      const user = await this.users.findByIdWithRefreshHash(decoded.sub);
      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 3) قارن بالـ bcrypt
      const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!ok) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 4) ROTATION: طلّع توكنات جديدة وخزّن هاش الريفرش الجديد
      // Extract user ID - handle both _id (Mongoose) and id (plain object)
      const userDoc = user as UserDocument;
      const userId = userDoc._id ? (typeof userDoc._id === 'string' ? userDoc._id : userDoc._id.toString()) : (userDoc as any).id;
      if (!userId) {
        throw new UnauthorizedException('User ID not found');
      }

      const tokens = await this.generateTokens({
        _id: userId,
        email: user.email,
        role: user.role || 'student',
      });
      
      await this.setRefreshHash(userId, tokens.refreshToken);
      
      return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    // ابطال الريفرش
    await this.users.updateById(userId, { refreshTokenHash: null });
    return { message: 'logged out' };
  }

  // Debug methods للتحقق من البيانات في MongoDB
  async debugUsers() {
    return this.users.debugAllUsers();
  }

  async debugUser(email: string) {
    return this.users.debugUserByEmail(email);
  }

  async checkUser(email: string) {
    return this.users.checkUserByEmail(email);
  }
}


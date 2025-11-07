import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

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

  async register(dto: { email: string; password: string; role?: 'student' | 'teacher' | 'admin' }) {
    const user = await this.users.createUser(dto);
    return { message: 'registered', user };
  }

  async login(dto: { email: string; password: string }) {
    // للتحقق: اطبعي معلومات المستخدم
    const userWithPassword = await this.users.findByEmail(dto.email, true);
    console.log('[login] User found:', !!userWithPassword);
    console.log('[login] Password starts with:', userWithPassword?.password?.slice(0, 4));
    
    const user = await this.users.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    // Extract user ID - handle both _id (Mongoose) and id (plain object)
    const userId = user._id ? (typeof user._id === 'string' ? user._id : user._id.toString()) : user.id;
    if (!userId) throw new UnauthorizedException('User ID not found');
    
    const payload = { sub: userId, role: user.role || 'student' };
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(payload),
    ]);
    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
      const payload = { sub: decoded.sub, role: decoded.role };
      const accessToken = await this.signAccessToken(payload);
      const newRefreshToken = await this.signRefreshToken(payload); // خيار: تحديدي
      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(/* userId, deviceId … لو بتخزني ريفرش في DB */) {
    // لو بتخزني refresh tokens في DB: علّميه invalid هنا.
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


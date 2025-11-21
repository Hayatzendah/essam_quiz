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
    // التحقق من أن المعلمين يستخدمون الإيميل والباسورد الثابتين فقط
    const teacherEmail = process.env.TEACHER_EMAIL!;
    const teacherPassword = process.env.TEACHER_PASSWORD!;
    
    if (dto.role === 'teacher') {
      if (dto.email.toLowerCase() !== teacherEmail.toLowerCase()) {
        throw new UnauthorizedException('Teachers must use the designated teacher email: ' + teacherEmail);
      }
      if (dto.password !== teacherPassword) {
        throw new UnauthorizedException('Teachers must use the designated teacher password');
      }
    }
    
    const user = await this.users.createUser(dto);
    return { message: 'registered', user };
  }

  async login(dto: { email: string; password: string }) {
    const teacherEmail = process.env.TEACHER_EMAIL!;
    const teacherPassword = process.env.TEACHER_PASSWORD!;
    
    let user: any;
    
    // إذا كان الإيميل هو إيميل المعلم، نتحقق من الباسورد الثابت أولاً
    if (dto.email.toLowerCase() === teacherEmail.toLowerCase()) {
      // التحقق من الباسورد
      if (dto.password !== teacherPassword) {
        console.log('[Teacher Login] Password mismatch');
        console.log('[Teacher Login] Expected password length:', teacherPassword?.length || 0);
        console.log('[Teacher Login] Received password length:', dto.password?.length || 0);
        throw new UnauthorizedException('Invalid credentials');
      }
      // إذا كان الباسورد صحيح، نبحث عن المستخدم مباشرة (بدون التحقق من الباسورد في الداتابيس)
      let foundUser = await this.users.findByEmail(dto.email);
      
      // إذا المستخدم مش موجود، ننشئه تلقائياً كمعلم
      if (!foundUser) {
        console.log('[Teacher Login] User not found, creating teacher account automatically');
        const newUser = await this.users.createUser({
          email: teacherEmail,
          password: teacherPassword, // سيتم hash تلقائياً
          role: 'teacher',
        });
        foundUser = await this.users.findByEmail(teacherEmail);
      }
      
      // التأكد من أن role = 'teacher'
      if (foundUser && foundUser.role !== 'teacher') {
        console.log('[Teacher Login] User role is not teacher:', foundUser.role);
        // تحديث role إلى teacher
        const userId = foundUser._id ? (typeof foundUser._id === 'string' ? foundUser._id : foundUser._id.toString()) : (foundUser as any).id;
        if (userId) {
          await this.users.updateById(userId, { role: 'teacher' });
          foundUser.role = 'teacher';
        }
      }
      
      if (!foundUser) {
        throw new UnauthorizedException('Failed to create or find teacher account');
      }
      
      // إزالة الباسورد من النتيجة
      const plain = foundUser.toObject ? foundUser.toObject() : foundUser;
      const { password: _, ...userWithoutPassword } = plain;
      user = userWithoutPassword;
    } else {
      // للطلاب والمستخدمين الآخرين، نستخدم التحقق العادي
      user = await this.users.validateUser(dto.email, dto.password);
      if (!user) throw new UnauthorizedException('Invalid credentials');
    }
    
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
    
    // إرجاع response بالشكل المطلوب
    return {
      accessToken: tokens.accessToken,
      user: {
        id: userId,
        name: user.name || '',
        email: user.email,
        role: user.role || 'student',
      },
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

  async getMe(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    
    return {
      id: user._id ? (typeof user._id === 'string' ? user._id : user._id.toString()) : (user as any).id,
      name: user.name || '',
      email: user.email,
      role: user.role || 'student',
    };
  }
}


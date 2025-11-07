import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findByEmail(email: string, withPassword = false) {
    const normalizedEmail = email.toLowerCase().trim();
    const q = this.userModel.findOne({ email: normalizedEmail });
    if (withPassword) q.select('+password');
    return q.exec();
  }

  async findById(id: string) {
    return this.userModel.findById(id).lean();
  }

  async createUser(dto: { email: string; password: string; role?: 'student' | 'teacher' | 'admin' }) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const exists = await this.userModel.exists({ email: normalizedEmail });
    if (exists) throw new ConflictException('Email already in use');

    // لا نحتاج hash هنا - الـ pre-save hook في الـ schema سيقوم بذلك تلقائيًا
    const user = await this.userModel.create({
      email: normalizedEmail,
      password: dto.password, // الـ pre-save hook سيقوم بـ hash تلقائيًا
      role: dto.role ?? 'student',
    });

    const plain = user.toObject();
    const { password, ...result } = plain;
    return result;
  }

  async validateUser(email: string, password: string) {
    const user = await this.findByEmail(email, true); // هات الباسورد
    if (!user) {
      console.log(`[validateUser] User not found: ${email}`);
      return null;
    }

    console.log(`[validateUser] User found: ${user.email}`);
    console.log(`[validateUser] Password in DB starts with: ${user.password?.slice(0, 7)}`);
    console.log(`[validateUser] Password length: ${user.password?.length}`);
    console.log(`[validateUser] Comparing password...`);

    const ok = await bcrypt.compare(password, user.password);
    console.log(`[validateUser] Password match: ${ok}`);
    
    if (!ok) return null;

    // إزالة الـ password من النتيجة
    const plain = user.toObject();
    const { password: _, ...result } = plain;
    return result;
  }

  // Debug methods للتحقق من البيانات في MongoDB
  async debugAllUsers() {
    const users = await this.userModel.find({}).select('+password').lean();
    return {
      count: users.length,
      users: users.map((u: any) => ({
        _id: u._id,
        email: u.email,
        role: u.role,
        passwordHash: u.password ? `${u.password.substring(0, 20)}...` : 'null',
        passwordLength: u.password ? u.password.length : 0,
        createdAt: (u as any).createdAt,
        updatedAt: (u as any).updatedAt,
      })),
    };
  }

  async debugUserByEmail(email: string) {
    const user = await this.userModel.findOne({ email }).select('+password').lean();
    if (!user) return { found: false, message: 'User not found' };

    const userAny = user as any;
    return {
      found: true,
      user: {
        _id: userAny._id,
        email: userAny.email,
        role: userAny.role,
        passwordHash: userAny.password ? `${userAny.password.substring(0, 30)}...` : 'null',
        passwordLength: userAny.password ? userAny.password.length : 0,
        passwordStartsWith: userAny.password ? userAny.password.substring(0, 10) : 'null',
        createdAt: userAny.createdAt,
        updatedAt: userAny.updatedAt,
      },
    };
  }

  async checkUserByEmail(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email: normalizedEmail }).select('+password');
    if (!user) return { found: false, email: normalizedEmail, message: 'User not found' };

    return {
      found: true,
      email: normalizedEmail,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0,
        passwordStartsWith: user.password ? user.password.substring(0, 15) : 'null',
        isValidBcrypt: user.password ? user.password.startsWith('$2b$') : false,
      },
    };
  }
}


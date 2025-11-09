import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { disconnect } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let createdUserId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://127.0.0.1:27017/test_users', {
          dbName: 'test_users',
        }),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await disconnect();
  });

  // Test 1: إنشاء مستخدم (create) - التأكد من حفظ المستخدم بشكل صحيح وتشفير كلمة مروره
  it('should create a user and hash password (not returned)', async () => {
    const user = await service.createUser({
      email: 'test@example.com',
      password: 'secret123',
    });
    expect(user).toHaveProperty('_id');
    expect((user as any).password).toBeUndefined();
    createdUserId = (user as any)._id.toString();
    
    // التحقق من أن كلمة المرور مشفرة في قاعدة البيانات
    const userWithPassword = await service.findByEmail('test@example.com', true);
    expect(userWithPassword?.password).toBeDefined();
    expect(userWithPassword?.password).not.toBe('secret123');
    expect(userWithPassword?.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
  });

  // Test 2: البحث عن مستخدم (findByEmail) - إدخال مستخدم تجريبي ثم التأكد من إرجاعه
  it('should find by email', async () => {
    const found = await service.findByEmail('test@example.com');
    expect(found?.email).toBe('test@example.com');
    expect(found?.password).toBeUndefined(); // Password should not be returned by default
  });

  // Test 3: البحث عن مستخدم بالمعرف (findById)
  it('should find by id', async () => {
    const found = await service.findById(createdUserId);
    expect(found).toHaveProperty('_id');
    expect(found.email).toBe('test@example.com');
    expect((found as any).password).toBeUndefined();
  });

  // Test 4: التعامل مع حالات خطأ - محاولة إنشاء مستخدم بنفس البريد مرتين
  it('should not allow duplicate email', async () => {
    await expect(
      service.createUser({
        email: 'test@example.com',
        password: 'secret123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  // Test 5: التعامل مع حالات خطأ - البحث عن مستخدم غير موجود
  it('should throw NotFoundException when user not found by id', async () => {
    const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist
    await expect(service.findById(fakeId)).rejects.toThrow(NotFoundException);
  });

  // Test 6: التعامل مع حالات خطأ - ID غير صحيح
  it('should throw NotFoundException for invalid id format', async () => {
    await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
  });

  // Test 7: تغيير دور المستخدم (updateRole)
  it('should update user role', async () => {
    const updated = await service.updateRole(createdUserId, 'teacher');
    expect(updated.role).toBe('teacher');
  });

  // Test 8: التعامل مع حالات خطأ - محاولة تغيير دور مستخدم غير موجود
  it('should throw NotFoundException when updating role of non-existent user', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    await expect(service.updateRole(fakeId, 'teacher')).rejects.toThrow(NotFoundException);
  });

  // Test 9: التعامل مع حالات خطأ - role غير صحيح
  it('should throw NotFoundException for invalid role', async () => {
    await expect(
      service.updateRole(createdUserId, 'invalid-role' as any),
    ).rejects.toThrow(NotFoundException);
  });
});


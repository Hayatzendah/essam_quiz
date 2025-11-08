import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { disconnect } from 'mongoose';

describe('UsersService', () => {
  let service: UsersService;

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

  it('should create a user and hash password (not returned)', async () => {
    const user = await service.createUser({
      email: 'test@example.com',
      password: 'secret123',
    });
    expect(user).toHaveProperty('_id');
    expect((user as any).password).toBeUndefined();
  });

  it('should find by email', async () => {
    const found = await service.findByEmail('test@example.com');
    expect(found?.email).toBe('test@example.com');
  });

  it('should not allow duplicate email', async () => {
    await expect(
      service.createUser({
        email: 'test@example.com',
        password: 'secret123',
      }),
    ).rejects.toThrow();
  });
});


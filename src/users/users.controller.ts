import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  Logger,
  HttpException,
  HttpStatus,
  Delete,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { readFileSync } from 'fs';
import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MediaService } from '../modules/media/media.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService,
  ) {}

  // GET /users/me  => المريض/المعلم/الطالب يشوف ملفه
  @Get('me')
  async me(@Req() req: any) {
    try {
      // JwtStrategy يرجع { userId, role } في req.user
      const userId = req.user?.userId || req.user?.sub;
      if (!userId) {
        throw new HttpException('User ID not found in token', HttpStatus.UNAUTHORIZED);
      }
      return await this.usersService.findById(userId);
    } catch (error) {
      this.logger.error(`Error in GET /users/me: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to get user data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // PATCH /users/me/profile-picture  => رفع صورة بروفايل
  @Patch('me/profile-picture')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/images/profile-pictures',
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new HttpException('يُسمح فقط بملفات الصور (jpg, png, gif, webp)', HttpStatus.BAD_REQUEST), false);
        }
      },
    }),
  )
  async uploadProfilePicture(@Req() req: any, @UploadedFile() file: any) {
    try {
      const userId = req.user?.userId || req.user?.sub;
      if (!userId) {
        throw new HttpException('User ID not found in token', HttpStatus.UNAUTHORIZED);
      }
      if (!file) {
        throw new HttpException('لم يتم رفع أي ملف', HttpStatus.BAD_REQUEST);
      }

      let profilePictureUrl: string;

      // محاولة رفع إلى S3/Cloudinary أولاً، وإلا استخدام المسار المحلي
      try {
        const buffer = readFileSync(file.path);
        const ext = extname(file.originalname).replace('.', '');
        const uploaded = await this.mediaService.uploadBuffer({
          buffer,
          mime: file.mimetype,
          ext,
          prefix: 'images/profile-pictures',
        });
        profilePictureUrl = uploaded.url;
      } catch {
        // fallback: استخدام المسار المحلي
        const baseUrl = process.env.APP_URL || process.env.PUBLIC_BASE_URL || '';
        profilePictureUrl = `${baseUrl}/uploads/images/profile-pictures/${file.filename}`;
      }

      await this.usersService.updateById(userId, { profilePicture: profilePictureUrl } as any);

      return { profilePicture: profilePictureUrl };
    } catch (error) {
      this.logger.error(`Error in PATCH /users/me/profile-picture: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `فشل رفع صورة البروفايل: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // PATCH /users/me/state  => تحديث الولاية فقط (اختصار)
  // ⚠️ مهم: يجب أن يكون قبل @Patch('me') لأن NestJS يطابق routes بالترتيب
  @Patch('me/state')
  async updateState(@Req() req: any, @Body() body: { state: string }) {
    try {
      const userId = req.user?.userId || req.user?.sub;
      if (!userId) {
        throw new HttpException('User ID not found in token', HttpStatus.UNAUTHORIZED);
      }
      this.logger.log(`Updating state for user ${userId} to ${body.state}`);
      const result = await this.usersService.updateById(userId, { state: body.state });
      this.logger.log(`Successfully updated state for user ${userId}`);
      const obj = result?.toObject ? result.toObject() : result;
      delete (obj as any).password;
      return obj;
    } catch (error) {
      this.logger.error(`Error in PATCH /users/me/state: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update state: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // PATCH /users/me  => المستخدم يعدّل ملفه الشخصي (الاسم، الولاية)
  @Patch('me')
  async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
    try {
      const userId = req.user?.userId || req.user?.sub;
      if (!userId) {
        throw new HttpException('User ID not found in token', HttpStatus.UNAUTHORIZED);
      }
      this.logger.log(`Updating profile for user ${userId}`);
      const result = await this.usersService.updateById(userId, body);
      this.logger.log(`Successfully updated profile for user ${userId}`);
      const obj = result?.toObject ? result.toObject() : result;
      delete (obj as any).password;
      return obj;
    } catch (error) {
      this.logger.error(`Error in PATCH /users/me: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update profile: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // PATCH /users/role/:id  => للأدمن فقط عشان يغير الدور
  @Patch('role/:id')
  @Roles('admin')
  async changeRole(@Param('id') id: string, @Body() body: UpdateRoleDto) {
    try {
      this.logger.log(`Attempting to update role for user ${id} to ${body.role}`);
      const result = await this.usersService.updateRole(id, body.role);
      this.logger.log(`Successfully updated role for user ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in PATCH /users/role/${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update user role: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // GET /users/teachers => جلب جميع المعلمين (للأدمن)
  @Get('teachers')
  @Roles('admin')
  async getAllTeachers() {
    try {
      return await this.usersService.findAllTeachers();
    } catch (error) {
      this.logger.error(`Error in GET /users/teachers: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get teachers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // DELETE /users/:id => حذف مستخدم (للأدمن)
  @Delete(':id')
  @Roles('admin')
  async deleteUser(@Param('id') id: string) {
    try {
      this.logger.log(`Attempting to delete user ${id}`);
      const result = await this.usersService.deleteById(id);
      this.logger.log(`Successfully deleted user ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in DELETE /users/${id}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // DELETE /users/email/:email => حذف مستخدم بالإيميل (للأدمن)
  @Delete('email/:email')
  @Roles('admin')
  async deleteUserByEmail(@Param('email') email: string) {
    try {
      this.logger.log(`Attempting to delete user with email ${email}`);
      const result = await this.usersService.deleteByEmail(email);
      this.logger.log(`Successfully deleted user with email ${email}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in DELETE /users/email/${email}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete user: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // POST /users/cleanup/old-teachers => تحويل المعلمين القديمين إلى طلاب (للأدمن)
  @Post('cleanup/old-teachers')
  @Roles('admin')
  async convertOldTeachersToStudents() {
    try {
      const teacherEmail = process.env.TEACHER_EMAIL || 'teacher@deutsch-tests.com';
      this.logger.log(`Converting old teachers (not ${teacherEmail}) to students`);
      const result = await this.usersService.convertOldTeachersToStudents(teacherEmail);
      this.logger.log(`Successfully converted ${result.modifiedCount} teachers to students`);
      return result;
    } catch (error) {
      this.logger.error(`Error in POST /users/cleanup/old-teachers: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to convert old teachers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // DELETE /users/cleanup/old-teachers => حذف المعلمين القديمين (للأدمن)
  @Delete('cleanup/old-teachers')
  @Roles('admin')
  async deleteOldTeachers() {
    try {
      const teacherEmail = process.env.TEACHER_EMAIL || 'teacher@deutsch-tests.com';
      this.logger.log(`Deleting old teachers (not ${teacherEmail})`);
      const result = await this.usersService.deleteOldTeachers(teacherEmail);
      this.logger.log(`Successfully deleted ${result.deletedCount} old teachers`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error in DELETE /users/cleanup/old-teachers: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to delete old teachers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

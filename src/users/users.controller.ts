import { Controller, Get, Patch, Param, Body, UseGuards, Req, Logger, HttpException, HttpStatus, Delete, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

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
      this.logger.error(`Error in DELETE /users/cleanup/old-teachers: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to delete old teachers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}


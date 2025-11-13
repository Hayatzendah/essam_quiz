import { Controller, Get, Patch, Param, Body, UseGuards, Req, Logger, HttpException, HttpStatus } from '@nestjs/common';
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
}


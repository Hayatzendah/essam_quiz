import { Controller, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me  => المريض/المعلم/الطالب يشوف ملفه
  @Get('me')
  async me(@Req() req: any) {
    // JwtStrategy يرجع { userId, role } في req.user
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    return this.usersService.findById(userId);
  }

  // PATCH /users/role/:id  => للأدمن فقط عشان يغير الدور
  @Patch('role/:id')
  @Roles('admin')
  async changeRole(@Param('id') id: string, @Body() body: UpdateRoleDto) {
    return this.usersService.updateRole(id, body.role);
  }
}


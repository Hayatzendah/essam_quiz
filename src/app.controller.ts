import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';

@Controller()
export class AppController {
  @Get()
  root() {
    return { ok: true, service: 'quiz-backend' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @Get('protected')
  test() {
    return { ok: true, message: 'This is a protected route' };
  }
}

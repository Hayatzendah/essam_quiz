import { Controller, Get, UseGuards, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';

@Controller()
export class AppController {
  @Get()
  root() {
    return { ok: true, service: 'quiz-backend' };
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  robots(@Res() res: Response) {
    const robotsContent = `User-agent: *
Disallow: /api/
Disallow: /docs/
Allow: /api/exams/public
Allow: /api/exams/*/public
`;
    return res.send(robotsContent);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  @Get('protected')
  test() {
    return { ok: true, message: 'This is a protected route' };
  }
}

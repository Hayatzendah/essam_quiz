import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'), // أو من الكوكيز/الهيدر حسب اختيارك
      secretOrKey: process.env.JWT_REFRESH_SECRET!,
      ignoreExpiration: false,
    });
  }
  async validate(payload: any) {
    return { userId: payload.sub, role: payload.role };
  }
}





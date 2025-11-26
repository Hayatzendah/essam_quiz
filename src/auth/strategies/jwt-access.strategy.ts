import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtAccessStrategy.name);

  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;

    // Debug logging - will help identify if secret is loaded correctly
    if (!secret) {
      console.error(
        '[JwtAccessStrategy] CRITICAL: JWT_ACCESS_SECRET is not defined in environment variables!',
      );
    } else {
      console.log(
        '[JwtAccessStrategy] JWT_ACCESS_SECRET is loaded (length:',
        secret.length,
        'chars)',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret!,
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    this.logger.debug(
      `JWT payload validated - sub: ${payload.sub}, role: ${payload.role}, email: ${payload.email}`,
    );
    // بيرجع جوّه request.user
    return { userId: payload.sub, role: payload.role };
  }
}


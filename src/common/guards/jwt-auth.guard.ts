import { AuthGuard } from '@nestjs/passport';
import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers?.authorization;
      this.logger.debug(`Authorization header: ${authHeader ? 'present' : 'missing'}`);

      if (!authHeader) {
        this.logger.warn('No authorization header found');
        throw new UnauthorizedException('Authorization header is missing');
      }

      const result = await super.canActivate(context);
      return result as boolean;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Error in JwtAuthGuard.canActivate: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw new UnauthorizedException('Authentication failed');
    }
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err) {
      this.logger.error(`JWT authentication error: ${err?.message || 'Unknown error'}`, err?.stack);
      throw new UnauthorizedException(`Authentication failed: ${err?.message || 'Unknown error'}`);
    }

    if (!user) {
      const errorMessage = info?.message || 'Invalid token';
      this.logger.warn(`Authentication failed: ${errorMessage}`);
      throw new UnauthorizedException(`Authentication failed: ${errorMessage}`);
    }

    this.logger.debug(`Authentication successful for user: ${JSON.stringify(user)}`);
    return user;
  }
}

import { AuthGuard } from '@nestjs/passport';
import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    try {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers?.authorization;
      this.logger.debug(`Authorization header: ${authHeader ? 'present' : 'missing'}`);
      
      if (!authHeader) {
        this.logger.warn('No authorization header found');
        throw new UnauthorizedException('Authorization header is missing');
      }

      return super.canActivate(context);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error in JwtAuthGuard.canActivate: ${error.message}`, error.stack);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err) {
      this.logger.error(`JWT authentication error: ${err.message}`, err.stack);
      throw new UnauthorizedException(`Authentication failed: ${err.message}`);
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






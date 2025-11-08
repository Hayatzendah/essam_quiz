import { AuthGuard } from '@nestjs/passport';
import { Injectable, ExecutionContext, Logger } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    this.logger.debug(`Authorization header: ${authHeader ? 'present' : 'missing'}`);
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      this.logger.warn(`Authentication failed: ${err?.message || info?.message || 'Unknown error'}`);
    } else {
      this.logger.debug(`Authentication successful for user: ${JSON.stringify(user)}`);
    }
    return super.handleRequest(err, user, info, context);
  }
}






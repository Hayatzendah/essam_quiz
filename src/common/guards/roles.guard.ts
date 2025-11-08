import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    try {
      const required = this.reflector.getAllAndOverride<Array<'student' | 'teacher' | 'admin'>>(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      
      // If no roles are required, allow access
      if (!required || required.length === 0) {
        return true;
      }

      const req = ctx.switchToHttp().getRequest();
      const user = req.user;

      // If user is not authenticated or doesn't have a role
      if (!user?.role) {
        this.logger.warn(`Access denied: User not authenticated or missing role`);
        throw new ForbiddenException('Access denied: User role is required');
      }

      // Check if user's role is in the required roles
      if (!required.includes(user.role)) {
        this.logger.warn(`Access denied: User role '${user.role}' is not in required roles: ${required.join(', ')}`);
        throw new ForbiddenException(`Access denied: Required role(s): ${required.join(', ')}`);
      }

      return true;
    } catch (error) {
      // Re-throw ForbiddenException
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // Handle unexpected errors
      this.logger.error(`Error in RolesGuard: ${error.message}`, error.stack);
      throw new ForbiddenException('Access denied: Error checking user role');
    }
  }
}






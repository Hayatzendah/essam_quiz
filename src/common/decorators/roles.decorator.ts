import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Array<'student' | 'teacher' | 'admin'>) =>
  SetMetadata(ROLES_KEY, roles);





import { IsEnum, IsNotEmpty } from 'class-validator';
import type { UserRole } from '../../common/enums';

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsEnum(['student', 'teacher', 'admin'])
  role: UserRole;
}

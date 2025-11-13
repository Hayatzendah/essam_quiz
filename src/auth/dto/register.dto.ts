import { IsEmail, IsOptional, IsString, MinLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'teacher@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssw0rd!', description: 'User password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'teacher', enum: ['student', 'teacher', 'admin'], description: 'User role (default: student)' })
  @IsOptional()
  @IsIn(['student', 'teacher', 'admin'])
  role?: 'student' | 'teacher' | 'admin';

  @ApiPropertyOptional({ 
    example: 'Bayern', 
    description: 'German state (Bundesland) - required for students',
    enum: [
      'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 
      'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 
      'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 
      'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'
    ]
  })
  @IsOptional()
  @IsString()
  state?: string; // الولاية الألمانية (Bundesland)
}






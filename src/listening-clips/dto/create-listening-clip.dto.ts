import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LevelEnum, SkillEnum } from '../schemas/listening-clip.schema';
import { ProviderEnum } from '../../common/enums/provider.enum';
import { normalizeProvider } from '../../common/utils/provider-normalizer.util';

export class CreateListeningClipDto {
  @Transform(({ value }) => normalizeProvider(value))
  @IsEnum(ProviderEnum)
  @IsNotEmpty()
  provider: ProviderEnum;

  @IsEnum(LevelEnum)
  @IsNotEmpty()
  level: LevelEnum;

  @IsEnum(SkillEnum)
  @IsOptional()
  skill?: SkillEnum;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  teil: number;

  @IsOptional()
  @IsString()
  title?: string;

  // ده هنملّيه في الكنترولر بعد الرفع، مش من الفورم مباشرة
  @IsOptional()
  @IsString()
  audioUrl?: string;
}


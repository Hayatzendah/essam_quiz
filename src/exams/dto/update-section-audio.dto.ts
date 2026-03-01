import { IsMongoId, IsNotEmpty } from 'class-validator';

export class UpdateSectionAudioDto {
  @IsMongoId()
  @IsNotEmpty()
  listeningAudioId: string;
}


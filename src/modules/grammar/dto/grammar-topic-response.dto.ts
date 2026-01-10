import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { ContentBlockDto } from './content-block.dto';

export class GrammarTopicResponseDto {
  @ApiProperty({ type: String, description: 'Grammar topic ID' })
  @Expose()
  @Transform(({ obj }) => obj._id?.toString() || obj.id?.toString())
  _id: string;

  @ApiProperty({ type: String, description: 'Grammar topic title' })
  @Expose()
  title: string;

  @ApiProperty({ type: String, description: 'Grammar topic slug' })
  @Expose()
  slug: string;

  @ApiProperty({ type: String, description: 'Grammar topic level (A1, A2, B1, B2, C1)' })
  @Expose()
  level: string;

  @ApiProperty({ type: String, required: false, nullable: true, description: 'Short description' })
  @Expose()
  shortDescription?: string | null;

  @ApiProperty({ type: [String], required: false, description: 'Tags associated with the topic' })
  @Expose()
  tags?: string[];

  @ApiProperty({ type: String, required: false, nullable: true, description: 'HTML content (legacy)' })
  @Expose()
  contentHtml?: string | null;

  @ApiProperty({ type: [ContentBlockDto], required: false, description: 'Content blocks array (new flexible structure)' })
  @Expose()
  contentBlocks?: ContentBlockDto[];

  @ApiProperty({ type: String, required: false, nullable: true, description: 'Associated exam ID' })
  @Expose()
  @Transform(({ obj }) => {
    if (obj.examId) {
      return typeof obj.examId === 'object' && obj.examId.toString
        ? obj.examId.toString()
        : obj.examId;
    }
    return null;
  })
  examId?: string | null;

  @ApiProperty({ type: String, required: false, nullable: true, description: 'Section title in the exam' })
  @Expose()
  sectionTitle?: string | null;

  @ApiProperty({ type: Date, required: false, nullable: true })
  @Expose()
  createdAt?: Date | null;

  @ApiProperty({ type: Date, required: false, nullable: true })
  @Expose()
  updatedAt?: Date | null;
}




import { Controller, Get } from '@nestjs/common';

@Controller('questions')
export class QuestionsController {
  @Get()
  findAll() {
    return { up: true, note: 'questions endpoint is working' };
  }
}







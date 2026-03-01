import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MSG } from '../constants/messages';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | object = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    // استخراج تفاصيل إضافية من error object
    const errorDetails = typeof error === 'object' ? error : { message: error };
    const errorCode = (errorDetails as any)?.code || status;
    const errorMessage = Array.isArray(message) ? message.join(', ') : message;
    const validationErrors = (errorDetails as any)?.errors || (errorDetails as any)?.details || null;

    const errorResponse = {
      status: 'error',
      code: errorCode,
      message: errorMessage,
      error: errorDetails,
      ...(validationErrors && { errors: validationErrors }),
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${errorMessage}`,
    );
    if (validationErrors) {
      this.logger.error(`Validation errors: ${JSON.stringify(validationErrors)}`);
    }

    response.status(status).json(errorResponse);
  }
}

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const started = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const took = Date.now() - started;
          this.logger.log(`[${method}] ${url} -> ${took}ms`);
        },
        error: (error) => {
          const took = Date.now() - started;
          this.logger.error(
            `[${method}] ${url} -> ${took}ms - Error: ${error?.message || 'Unknown'}`,
          );
        },
      }),
    );
  }
}

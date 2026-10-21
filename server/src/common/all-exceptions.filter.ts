import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

/** Consistent error body; never leaks stack traces or upstream payloads. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly log = new Logger('Exceptions');
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();
      const payload = typeof body === 'string' ? { message: body } : (body as Record<string, unknown>);
      return res.status(status).json({ statusCode: status, ...payload });
    }
    this.log.error(exception instanceof Error ? exception.message : 'Unknown error');
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: 'Internal server error' });
  }
}

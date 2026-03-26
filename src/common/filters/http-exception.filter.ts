import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../dto/api-response.dto';

const HTTP_STATUS_TO_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  500: 'INTERNAL_SERVER_ERROR',
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorCode = HTTP_STATUS_TO_CODE[status] ?? 'INTERNAL_SERVER_ERROR';
    const details = this.extractDetails(exception);

    const errorBody: ApiErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        details,
      },
      message: typeof details === 'string' ? details : exception.message,
    };

    this.logger.warn(
      `HTTP ${status} ${request.method} ${request.url} → ${errorCode}: ${JSON.stringify(details)}`,
    );

    response.status(status).json(errorBody);
  }

  private extractDetails(exception: HttpException): string | string[] {
    const raw = exception.getResponse();

    if (
      typeof raw === 'object' &&
      raw !== null &&
      Array.isArray((raw as Record<string, unknown>)['message'])
    ) {
      return (raw as Record<string, unknown>)['message'] as string[];
    }

    if (typeof raw === 'string') {
      return raw;
    }

    if (
      typeof raw === 'object' &&
      raw !== null &&
      typeof (raw as Record<string, unknown>)['message'] === 'string'
    ) {
      return (raw as Record<string, unknown>)['message'] as string;
    }

    return exception.message;
  }
}

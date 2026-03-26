import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiSuccessResponse,
  ApiPaginatedResponse,
} from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse | ApiPaginatedResponse> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    return next.handle().pipe(map((data) => this.transformResponse(data)));
  }

  private transformResponse(
    data: unknown,
  ): ApiSuccessResponse | ApiPaginatedResponse {
    if (data === undefined || data === null) {
      return { success: true, data: null, message: 'Success' };
    }

    if (this.isPaginatedResponse(data)) {
      return this.buildPaginatedResponse(data as Record<string, unknown>);
    }

    return { success: true, data, message: 'Success' };
  }

  private isPaginatedResponse(data: unknown): boolean {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return false;
    }
    const obj = data as Record<string, unknown>;
    return (
      typeof obj['total'] === 'number' && typeof obj['totalPages'] === 'number'
    );
  }

  private buildPaginatedResponse(
    obj: Record<string, unknown>,
  ): ApiPaginatedResponse {
    const arrayKey = Object.keys(obj).find((key) => Array.isArray(obj[key]));
    const dataArray = arrayKey ? (obj[arrayKey] as unknown[]) : [];

    return {
      success: true,
      data: dataArray,
      meta: {
        total: obj['total'] as number,
        page: obj['page'] as number,
        totalPages: obj['totalPages'] as number,
      },
      message: 'Success',
    };
  }
}

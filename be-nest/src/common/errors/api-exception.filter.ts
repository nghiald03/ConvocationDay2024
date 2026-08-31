import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiError } from './api-error.js';

interface ErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const { status, envelope } = this.mapError(error);
    if (status >= 500) {
      this.logger.error('Unhandled request error', error instanceof Error ? error.stack : String(error), {
        method: request.method,
        path: request.originalUrl,
      });
    }
    response.status(status).json(envelope);
  }

  private mapError(error: unknown): { status: number; envelope: ErrorEnvelope } {
    if (error instanceof ApiError) {
      const envelope: ErrorEnvelope = { code: error.code, message: error.message };
      if (error.details !== undefined) envelope.details = error.details;
      return { status: error.status, envelope };
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body: unknown = error.getResponse();
      if (typeof body === 'object' && body !== null) {
        const value = body as Record<string, unknown>;
        const rawMessage = value.message;
        const hasApplicationMessage = typeof value.code === 'string' && typeof rawMessage === 'string';
        const message = hasApplicationMessage ? rawMessage : this.defaultMessage(status);
        return {
          status,
          envelope: {
            code: typeof value.code === 'string' ? value.code : this.defaultCode(status),
            message,
            ...(value.details !== undefined ? { details: value.details } : {}),
          },
        };
      }
      return { status, envelope: { code: this.defaultCode(status), message: this.defaultMessage(status) } };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      envelope: { code: 'server/internal-error', message: 'Đã xảy ra lỗi không mong muốn.' },
    };
  }

  private defaultCode(status: number): string {
    return status === 400
      ? 'request/invalid'
      : status === 401
        ? 'auth/unauthorized'
        : status === 403
          ? 'auth/forbidden'
          : status === 404
            ? 'resource/not-found'
            : `http/${status}`;
  }

  private defaultMessage(status: number): string {
    return status === 400
      ? 'Yêu cầu không hợp lệ.'
      : status === 401
        ? 'Bạn cần đăng nhập để tiếp tục.'
        : status === 403
          ? 'Bạn không có quyền thực hiện thao tác này.'
          : status === 404
            ? 'Không tìm thấy tài nguyên được yêu cầu.'
            : status === 409
              ? 'Dữ liệu bị xung đột với trạng thái hiện tại.'
              : status >= 500
                ? 'Hệ thống đang gặp sự cố, vui lòng thử lại sau.'
                : 'Không thể xử lý yêu cầu.';
  }
}

import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
    statusCode: number;
    message: string;
    error: string;
    timestamp: string;
    path: string;
    details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const timestamp = new Date().toISOString();
        const path = request.url;

        let status: number;
        let message: string;
        let error: string;
        let details: unknown = undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const responseObj = exceptionResponse as Record<string, unknown>;
                message = (responseObj.message as string) || exception.message;
                error = (responseObj.error as string) || 'Error';
                details = responseObj.details;
            } else {
                message = exception.message;
                error = 'Error';
            }
        } else if (exception instanceof Error) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = 'Internal Server Error';
            
            // Log full error but don't expose to client
            this.logger.error(
                `Internal error at ${path}: ${exception.message}`,
                exception.stack,
            );
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'An unexpected error occurred';
            error = 'Internal Server Error';
        }

        const errorResponse: ErrorResponse = {
            statusCode: status,
            message,
            error,
            timestamp,
            path,
        };

        if (details) {
            errorResponse.details = details;
        }

        response.status(status).json(errorResponse);
    }
}

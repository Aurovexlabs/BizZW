import { NextFunction, Request, Response } from 'express';

import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { captureException } from '../lib/sentry';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: object
): void {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    ...(meta && { meta }),
  });
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = String(res.getHeader('x-request-id') || req.headers['x-request-id'] || '');

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      captureException(err, {
        requestId,
        path: req.path,
        method: req.method,
        errorCode: err.errorCode,
      });
      logger.error(
        { err, requestId, path: req.path, method: req.method },
        'Operational server error'
      );
    } else {
      logger.warn(
        { err, requestId, path: req.path, method: req.method },
        'Operational client error'
      );
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      ...(err.errors && { errors: err.errors }),
      ...(requestId && { requestId }),
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      ...(requestId && { requestId }),
    });
    return;
  }

  // Mongoose duplicate key error
  // MongoDB duplicate key: code is a number (11000)
  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      errorCode: 'DUPLICATE_ERROR',
      ...(requestId && { requestId }),
    });
    return;
  }

  // MongoDB/Atlas database-capacity limit error
  if (
    (err as { code?: number; message?: string }).code === 8000 &&
    ((err as { message?: string }).message || '')
      .toLowerCase()
      .includes('cannot create a new database')
  ) {
    res.status(503).json({
      success: false,
      message:
        'New workspace provisioning is temporarily unavailable due to database capacity limits. Please try again later or contact support.',
      errorCode: 'DATABASE_CAPACITY_EXCEEDED',
      ...(requestId && { requestId }),
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const flattened = err.flatten();
    const fieldErrors = Object.fromEntries(
      Object.entries(flattened.fieldErrors).map(([key, value]) => [
        key,
        (value || []).filter((message): message is string => typeof message === 'string'),
      ])
    );

    const errors =
      Object.keys(fieldErrors).length > 0
        ? fieldErrors
        : { _form: flattened.formErrors.filter((message) => typeof message === 'string') };

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors,
      ...(requestId && { requestId }),
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      errorCode: 'INVALID_TOKEN',
      ...(requestId && { requestId }),
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired',
      errorCode: 'TOKEN_EXPIRED',
      ...(requestId && { requestId }),
    });
    return;
  }

  // Unknown errors — don't leak internals in production
  captureException(err, { requestId, path: req.path, method: req.method });
  logger.error({ err, requestId, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    errorCode: 'INTERNAL_ERROR',
    ...(requestId && { requestId }),
  });
}

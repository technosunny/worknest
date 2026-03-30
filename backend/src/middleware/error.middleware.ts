import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      const fields = (err.meta?.target as string[]) || [];
      res.status(409).json({
        success: false,
        message: `Duplicate value for field(s): ${fields.join(', ')}`,
        error: 'DUPLICATE_ENTRY',
      });
      return;
    }

    if (err.code === 'P2025') {
      // Record not found
      res.status(404).json({
        success: false,
        message: 'Record not found',
        error: 'NOT_FOUND',
      });
      return;
    }

    if (err.code === 'P2003') {
      // Foreign key constraint
      res.status(400).json({
        success: false,
        message: 'Related record not found',
        error: 'FOREIGN_KEY_CONSTRAINT',
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      message: 'Database validation error',
      error: 'VALIDATION_ERROR',
    });
    return;
  }

  // Multer errors
  if (err.message && err.message.includes('Only')) {
    res.status(400).json({
      success: false,
      message: err.message,
      error: 'INVALID_FILE_TYPE',
    });
    return;
  }

  if (err.message && err.message.includes('File too large')) {
    res.status(400).json({
      success: false,
      message: 'File size exceeds the allowed limit',
      error: 'FILE_TOO_LARGE',
    });
    return;
  }

  // JWT errors (already handled in middleware, but just in case)
  if (err.message === 'Access token expired' || err.message === 'Invalid access token') {
    res.status(401).json({
      success: false,
      message: err.message,
      error: 'UNAUTHORIZED',
    });
    return;
  }

  // Operational errors with statusCode
  if (err.statusCode && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Generic internal server error
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
}

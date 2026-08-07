import { Request, Response, NextFunction } from 'express';
import { AppError, NotFoundError } from '../utils/exceptions';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error (full stack traces only outside production; production logs the message for 5xx)
  if (IS_PRODUCTION) {
    const status = err.statusCode || (err.name === 'CastError' ? 404 : err.code === 11000 ? 400 : 500);
    if (status >= 500) {
      console.error(`[${req.method} ${req.originalUrl}] ${err.message}`);
    }
  } else if (err instanceof Error && err.stack) {
    console.error(err.stack);
  } else {
    console.error('Non-Error thrown:', err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = new AppError(`Resource not found`, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error = new AppError('Duplicate field value entered', 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val: any) => val.message)
      .join(', ');
    error = new AppError(message, 400);
  }

  // Multer upload errors (oversized files etc.)
  if (err.name === 'MulterError') {
    error = new AppError(
      err.message === 'File too large'
        ? 'File too large. Max upload size exceeded.'
        : `Upload error: ${err.message}`,
      413
    );
  }

  // Body-parse errors (payload too large / malformed JSON)
  if (err.type === 'entity.too.large') {
    error = new AppError('Request body too large', 413);
  }
  if (err.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON body', 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error'
  });
};

export const notFound = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(new NotFoundError(`Not Found - ${req.originalUrl}`));
};

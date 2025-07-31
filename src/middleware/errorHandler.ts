import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: 500
  };

  // KSeF API errors
  if (err.message.includes('KSeF API')) {
    error.status = 502;
    error.message = 'KSeF API communication error';
  }

  // Validation errors
  if (err.message.includes('validation')) {
    error.status = 400;
  }

  res.status(error.status).json({
    error: error.message,
    timestamp: new Date().toISOString()
  });
};

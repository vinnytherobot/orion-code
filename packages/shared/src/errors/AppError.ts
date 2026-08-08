export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} not found`, 'NOT_FOUND', 404);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 'FORBIDDEN', 403);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 'CONFLICT', 409);
  }

  static validation(message: string): AppError {
    return new AppError(message, 'VALIDATION', 400);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 'INTERNAL_ERROR', 500);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

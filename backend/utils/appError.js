/**
 * Custom application error class for operational errors.
 * Operational errors are known runtime problems (invalid inputs, unauthorized access, etc.)
 * rather than programmer bugs.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', errors = null) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message = 'Unauthorized access. Please log in.') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden. You do not have permission to perform this action.') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Requested resource not found.') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Conflict. A resource with the provided details already exists.') {
    return new AppError(message, 409);
  }

  static internal(message = 'Internal server error.') {
    return new AppError(message, 500);
  }
}

module.exports = AppError;


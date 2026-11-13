/**
 * Custom application error class for operational errors.
 * Operational errors are known runtime problems (invalid inputs, unauthorized access, etc.)
 * rather than programmer bugs.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', errors = null, code = null) {
    return new AppError(message, 400, errors, code);
  }

  static unauthorized(message = 'Unauthorized access. Please log in.', code = null) {
    return new AppError(message, 401, null, code);
  }

  static forbidden(message = 'Forbidden. You do not have permission to perform this action.', code = null) {
    return new AppError(message, 403, null, code);
  }

  static notFound(message = 'Requested resource not found.', code = null) {
    return new AppError(message, 404, null, code);
  }

  static conflict(message = 'Conflict. A resource with the provided details already exists.', code = null) {
    return new AppError(message, 409, null, code);
  }

  static internal(message = 'Internal server error.') {
    return new AppError(message, 500);
  }
}

module.exports = AppError;


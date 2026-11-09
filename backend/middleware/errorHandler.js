const AppError = require('../utils/appError');

/**
 * Handle invalid MongoDB ObjectIDs
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid identifier: ${err.value} for field ${err.path}`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB unique index duplicate key errors
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : '';
  const message = `Duplicate value: '${value}' for '${field}'. Please use another value.`;
  return new AppError(message, 409, { [field]: `${field} already exists` });
};

/**
 * Handle Mongoose schema validation failures
 */
const handleValidationErrorDB = (err) => {
  const errors = {};
  Object.values(err.errors).forEach((el) => {
    errors[el.path] = el.message;
  });
  const message = `Validation error. Please check submitted fields.`;
  return new AppError(message, 400, errors);
};

/**
 * Handle invalid JWT signature or format
 */
const handleJWTError = () => {
  return new AppError('Invalid authentication token. Please log in again.', 401);
};

/**
 * Handle expired JWT token
 */
const handleJWTExpiredError = () => {
  return new AppError('Your session has expired. Please log in again.', 401);
};

/**
 * Send detailed error in development mode
 */
const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    errors: err.errors || null,
    stack: err.stack,
    error: err
  });
};

/**
 * Send sanitized error in production mode
 */
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errors: err.errors || null
    });
  }

  // Programming or unknown error: don't leak details
  console.error('[CRITICAL UNHANDLED ERROR]', err);
  res.status(500).json({
    status: 'error',
    message: 'An unexpected internal server error occurred.'
  });
};

/**
 * Global centralized error middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.code = err.code;

  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, req, res);
  } else {
    sendErrorDev(error, req, res);
  }
};

module.exports = errorHandler;


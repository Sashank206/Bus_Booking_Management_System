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
  let conflictCode = 'BOOKING_CONFLICT';
  let message = `Duplicate value: '${value}' for '${field}'. Please use another value.`;

  if (field === 'idempotencyKey') {
    conflictCode = 'IDEMPOTENCY_KEY_CONFLICT';
    message = 'This idempotency key has already been used for a different booking transaction.';
  } else if (field === 'holdToken') {
    conflictCode = 'BOOKING_ALREADY_PROCESSED';
    message = 'Your booking is already being processed. Please check My Bookings.';
  } else if (field === 'pnr') {
    conflictCode = 'BOOKING_CONFLICT';
    message = 'Booking reference conflict. Please retry your reservation.';
  }

  return new AppError(message, 409, { [field]: `${field} already exists` }, conflictCode);
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
    success: false,
    code: err.code || undefined,
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
      success: false,
      code: err.code || undefined,
      message: err.message,
      errors: err.errors || null
    });
  }

  // Programming or unknown error: don't leak details
  console.error('[CRITICAL UNHANDLED ERROR]', err);
  res.status(500).json({
    status: 'error',
    success: false,
    message: 'An unexpected internal server error occurred.'
  });
};

/**
 * Global centralized error middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = err;

  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  error.statusCode = error.statusCode || err.statusCode || 500;
  error.status = error.status || err.status || 'error';
  error.message = error.message || err.message;
  error.code = error.code || err.code;

  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, req, res);
  } else {
    sendErrorDev(error, req, res);
  }
};

module.exports = errorHandler;


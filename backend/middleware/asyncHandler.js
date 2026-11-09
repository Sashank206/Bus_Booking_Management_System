/**
 * Wraps an async route handler to forward unhandled promise rejections
 * directly to Express's next(err) error-handling pipeline.
 *
 * @param {Function} fn - Async controller function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;


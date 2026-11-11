const AppError = require('../utils/appError');
const asyncHandler = require('./asyncHandler');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const Operator = require('../models/Operator');

/**
 * Authentication middleware: Verifies JWT token and attaches authenticated user
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Extract token from Authorization header or HTTP-only cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token || token === 'none' || token === 'null' || token === 'undefined') {
    return next(new AppError('Authentication required. Please log in to proceed.', 401));
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    return next(new AppError('Invalid or expired authentication token. Please log in again.', 401));
  }

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The account belonging to this token no longer exists.', 401)
    );
  }

  // 4. Check if account is suspended or rejected
  if (currentUser.accountStatus === 'suspended') {
    return next(
      new AppError('Your account has been suspended. Please contact platform administration.', 403)
    );
  }
  if (currentUser.accountStatus === 'rejected') {
    return next(
      new AppError('Your account application has been rejected.', 403)
    );
  }

  // 5. Grant access: attach user to request object
  req.user = currentUser;

  // 6. If user is an operator, look up and attach their operator profile
  if (currentUser.role === 'operator') {
    const operator = await Operator.findOne({ userId: currentUser._id });
    req.operator = operator || null;
  }

  next();
});

/**
 * Optional authentication middleware:
 * Attaches user and operator profile if a valid token is present, but does not block unauthenticated requests.
 */
const optionalProtect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token || token === 'none' || token === 'null' || token === 'undefined') {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    const currentUser = await User.findById(decoded.id);
    if (currentUser && currentUser.accountStatus === 'active') {
      req.user = currentUser;
      if (currentUser.role === 'operator') {
        const operator = await Operator.findOne({ userId: currentUser._id });
        req.operator = operator || null;
      }
    }
  } catch (err) {
    // Proceed as unauthenticated guest on invalid/expired token
  }

  next();
});

/**
 * Role-based authorization middleware (RBAC)
 *
 * @param  {...String} roles - Allowed roles ('customer', 'operator', 'admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden. Access restricted to role(s): [${roles.join(', ')}]. Your current role is '${req.user.role}'.`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Ensures an operator is approved by administrator before accessing operator-only resources
 */
const requireApprovedOperator = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'admin') {
    // Admins bypass operator approval checks
    return next();
  }

  if (req.user.role !== 'operator') {
    return next(new AppError('Forbidden. Access restricted to bus operators.', 403));
  }

  let operator = req.operator;
  if (!operator) {
    operator = await Operator.findOne({ userId: req.user._id });
    req.operator = operator;
  }

  if (!operator) {
    return next(
      new AppError('Operator profile not found. Please submit your business profile.', 404)
    );
  }

  if (operator.approvalStatus !== 'approved') {
    return next(
      new AppError(
        `Operator access restricted. Your business profile status is currently '${operator.approvalStatus}'. Administrator approval is required before performing this action.`,
        403
      )
    );
  }

  next();
});

/**
 * Checks whether the current operator owns the target entity (or user is administrator)
 *
 * @param {ObjectId|String} resourceOperatorId - The operatorId on the resource
 * @param {Object} req - Express request
 * @returns {Boolean}
 */
const verifyOperatorOwnership = (resourceOperatorId, req) => {
  if (req.user.role === 'admin') return true;
  if (!req.operator) return false;
  return req.operator._id.toString() === resourceOperatorId.toString();
};

module.exports = {
  protect,
  optionalProtect,
  authorize,
  requireApprovedOperator,
  verifyOperatorOwnership
};


const User = require('../models/User');
const Operator = require('../models/Operator');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');
const { sendTokenResponse } = require('../utils/jwt');

/**
 * Register a new customer
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email address already exists.', 409));
  }

  // Hash password
  const passwordHash = await User.hashPassword(password);

  // Create customer
  const user = await User.create({
    name,
    email,
    passwordHash,
    phone,
    role: 'customer',
    accountStatus: 'active'
  });

  // Record audit event
  await AuditLog.create({
    userId: user._id,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: user._id,
    description: `Customer account registered for ${user.email}`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Failed to log user registration:', err.message));

  sendTokenResponse(user, 201, res, 'Customer account registered successfully');
});

/**
 * Register a new bus operator (requires Administrator approval)
 * POST /api/auth/operator-register
 */
const registerOperator = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phone,
    companyName,
    registrationNumber,
    businessAddress,
    contactPerson
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this business email address already exists.', 409));
  }

  // Hash password
  const passwordHash = await User.hashPassword(password);

  // Create operator user with pending status
  const user = await User.create({
    name,
    email,
    passwordHash,
    phone,
    role: 'operator',
    accountStatus: 'pending' // Pending admin approval
  });

  // Create operator business profile
  const operator = await Operator.create({
    userId: user._id,
    companyName,
    registrationNumber,
    contactPerson: contactPerson || name,
    businessAddress,
    approvalStatus: 'pending'
  });

  // Record audit event
  await AuditLog.create({
    userId: user._id,
    action: 'OPERATOR_ONBOARDING_REQUESTED',
    entityType: 'Operator',
    entityId: operator._id,
    description: `Operator business registration requested for ${companyName} (${email})`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Failed to log operator onboarding:', err.message));

  sendTokenResponse(
    user,
    201,
    res,
    'Operator registration submitted successfully. Your account is pending administrator approval before you can publish trips.',
    { operator }
  );
});

/**
 * Log in an existing user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Retrieve user with passwordHash
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    return next(new AppError('Invalid email address or password.', 401));
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid email address or password.', 401));
  }

  // Check account status
  if (user.accountStatus === 'suspended') {
    return next(
      new AppError('Your account has been suspended. Please contact platform support.', 403)
    );
  }
  if (user.accountStatus === 'rejected') {
    return next(
      new AppError('Your account application was not approved.', 403)
    );
  }

  // Retrieve operator profile if applicable
  let operator = null;
  if (user.role === 'operator') {
    operator = await Operator.findOne({ userId: user._id });
  }

  // Record audit log
  await AuditLog.create({
    userId: user._id,
    action: 'USER_LOGGED_IN',
    entityType: 'User',
    entityId: user._id,
    description: `User ${user.email} (${user.role}) logged in successfully`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Failed to log user login:', err.message));

  sendTokenResponse(
    user,
    200,
    res,
    'Logged in successfully',
    operator ? { operator } : {}
  );
});

/**
 * Log out user by clearing cookie
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax'
  });

  res.status(200).json({
    status: 'success',
    message: 'User logged out successfully'
  });
});

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res, next) => {
  let operator = null;
  if (req.user.role === 'operator') {
    operator = await Operator.findOne({ userId: req.user._id });
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
      ...(operator ? { operator } : {})
    }
  });
});

/**
 * Update authenticated user profile details
 * PUT /api/auth/profile
 */
const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, phone } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  let operator = null;
  if (user.role === 'operator') {
    const { companyName, businessAddress, contactPerson } = req.body;
    if (companyName || businessAddress || contactPerson) {
      operator = await Operator.findOne({ userId: user._id });
      if (operator) {
        if (companyName) operator.companyName = companyName;
        if (businessAddress) operator.businessAddress = businessAddress;
        if (contactPerson) operator.contactPerson = contactPerson;
        await operator.save();
      }
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user,
      ...(operator ? { operator } : {})
    }
  });
});

/**
 * Change current user password
 * PUT /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Incorrect current password.', 400));
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();

  sendTokenResponse(user, 200, res, 'Password changed successfully');
});

module.exports = {
  register,
  registerOperator,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword
};


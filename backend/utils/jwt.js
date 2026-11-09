const jwt = require('jsonwebtoken');

/**
 * Sign a JWT token containing user id and role
 *
 * @param {Object} payload - Data to sign into token
 * @returns {String} Signed JWT
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'busgo_fallback_development_secret_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify a JWT token
 *
 * @param {String} token - JWT string
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'busgo_fallback_development_secret_key_2026';
  return jwt.verify(token, secret);
};

/**
 * Set HTTP-only authentication cookie and send standardized JSON response
 *
 * @param {Object} user - User document
 * @param {Number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @param {String} message - Success message
 * @param {Object} extraData - Optional additional data to return (e.g., operator profile)
 */
const sendTokenResponse = (user, statusCode, res, message = 'Authentication successful', extraData = {}) => {
  const token = generateToken({ id: user._id, role: user.role });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax'
  };

  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    message,
    token,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      ...extraData
    }
  });
};

module.exports = {
  generateToken,
  verifyToken,
  sendTokenResponse
};


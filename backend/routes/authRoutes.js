const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  registerOperator,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerValidation,
  operatorRegisterValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} = require('../validators/authValidator');

const router = express.Router();

// Strict rate limiter for authentication routes to protect against brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 auth requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  },
  validate: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
  }
});

// Public auth routes
router.post('/register', authLimiter, registerValidation, register);
router.post('/operator-register', authLimiter, operatorRegisterValidation, registerOperator);
router.post('/login', authLimiter, loginValidation, login);
router.post('/logout', logout);

// Protected auth routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfileValidation, updateProfile);
router.put('/change-password', protect, changePasswordValidation, changePassword);

module.exports = router;


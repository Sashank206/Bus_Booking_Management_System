const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables before any module configuration
dotenv.config();

const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/appError');

// Route imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const busRoutes = require('./routes/busRoutes');
const stopRoutes = require('./routes/stopRoutes');
const routeRoutes = require('./routes/routeRoutes');
const tripRoutes = require('./routes/tripRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const cancellationRoutes = require('./routes/cancellationRoutes');
const refundRoutes = require('./routes/refundRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = Array.from(new Set([
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]));

// Security headers
app.use(helmet());

// CORS configuration for cross-origin requests from the React frontend
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key']
  })
);

// Body parsers and cookie middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// General API rate limiter with resilient key generation
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  },
  validate: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api', apiLimiter);

// Base route
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'BusGo Backend API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      admin: '/api/admin',
      operator: '/api/operator',
      buses: '/api/buses',
      stops: '/api/stops',
      routes: '/api/routes',
      trips: '/api/trips',
      bookings: '/api/bookings',
      payments: '/api/payments',
      cancellations: '/api/cancellations',
      refunds: '/api/refunds'
    }
  });
});

// Health check endpoint for system monitoring and frontend connectivity verification
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'BusGo API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/operator', operatorRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/refunds', refundRoutes);

// 404 handler for unmatched routes
app.use((req, res, next) => {
  next(new AppError(`Resource not found: ${req.method} ${req.originalUrl}`, 404));
});

// Centralized error handling middleware
app.use(errorHandler);

// Start server and initialize database if run directly
let server;
if (require.main === module) {
  connectDB().then(() => {
    server = app.listen(PORT, () => {
      console.log(`[BusGo] Backend server running on port at: http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`[BusGo] Health check accessible at: http://localhost:${PORT}/api/health`);
    });
  });
}

module.exports = { app, server };

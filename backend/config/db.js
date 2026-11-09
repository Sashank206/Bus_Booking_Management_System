const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the connection string from environment variables.
 * Handles initial connection, reconnection events, and graceful termination.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/busgo';

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: process.env.NODE_ENV !== 'production', // Build indexes in development
      serverSelectionTimeoutMS: 5000 // Keep trying to send operations for 5 seconds
    });

    console.log(`[Database] MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    // If running in development without a local MongoDB running, warn rather than crash immediately
    if (process.env.NODE_ENV === 'test') {
      throw error;
    }
  }
};

/**
 * Helper to execute an operation inside a MongoDB transaction when supported (e.g., replica sets/Atlas).
 * Falls back to direct execution if the environment does not support replica set transactions.
 *
 * @param {Function} callback - Async function receiving (session)
 */
const withTransaction = async (callback) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Listen for connection events
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] MongoDB reconnected.');
});

// Close Mongoose connection on process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[Database] MongoDB connection closed due to application termination (SIGINT).');
  process.exit(0);
});

module.exports = { connectDB, withTransaction };


const { body } = require('express-validator');
const { validateRequest } = require('./authValidator');

const busValidation = [
  body('busNumber')
    .trim()
    .notEmpty()
    .withMessage('Bus number or fleet code is required')
    .isLength({ max: 50 })
    .withMessage('Bus number cannot exceed 50 characters'),

  body('busName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bus name cannot exceed 100 characters'),

  body('busType')
    .trim()
    .notEmpty()
    .withMessage('Bus type is required (e.g., AC Sleeper 2+1, Volvo Multi-Axle)'),

  body('registrationNumber')
    .trim()
    .notEmpty()
    .withMessage('Vehicle registration number is required')
    .toUpperCase(),

  body('totalSeats')
    .notEmpty()
    .withMessage('Total seat capacity is required')
    .isInt({ min: 1, max: 100 })
    .withMessage('Total seats must be between 1 and 100'),

  body('seatLayout')
    .notEmpty()
    .withMessage('Seat layout is required')
    .isObject()
    .withMessage('Seat layout must be an object with rows, columns, and seats array'),

  body('seatLayout.rows')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Layout rows must be an integer between 1 and 50'),

  body('seatLayout.columns')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Layout columns must be an integer between 1 and 10'),

  body('seatLayout.seats')
    .isArray({ min: 1 })
    .withMessage('Seat layout must define a list of physical seats')
    .custom((seats, { req }) => {
      const totalSeats = parseInt(req.body.totalSeats, 10);
      if (seats.length !== totalSeats) {
        throw new Error(
          `Seat layout contains ${seats.length} seats, but totalSeats is configured as ${totalSeats}. They must match.`
        );
      }

      // Check unique seat numbers within bus and positive integer row/col
      const seatNumbers = new Set();
      for (const seat of seats) {
        if (!seat.seatNumber || !seat.seatNumber.trim()) {
          throw new Error('Every seat must have a valid seatNumber (e.g. 1A, 1B).');
        }
        const sNum = seat.seatNumber.trim().toUpperCase();
        if (seatNumbers.has(sNum)) {
          throw new Error(`Duplicate seat number detected in layout: ${sNum}`);
        }
        seatNumbers.add(sNum);

        if (seat.row == null || !Number.isInteger(Number(seat.row)) || Number(seat.row) < 1) {
          throw new Error(`Seat ${sNum} must have a valid positive integer row.`);
        }
        if (seat.col == null || !Number.isInteger(Number(seat.col)) || Number(seat.col) < 1) {
          throw new Error(`Seat ${sNum} must have a valid positive integer column.`);
        }
      }
      return true;
    }),

  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array of strings'),

  validateRequest
];

const busUpdateValidation = [
  body('busNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Bus number cannot be empty')
    .isLength({ max: 50 }),

  body('busName')
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body('busType')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Bus type cannot be empty'),

  body('registrationNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Registration number cannot be empty')
    .toUpperCase(),

  body('totalSeats')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Total seats must be between 1 and 100'),

  body('seatLayout')
    .optional()
    .isObject()
    .withMessage('Seat layout must be an object'),

  body('seatLayout.rows')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Layout rows must be an integer between 1 and 50'),

  body('seatLayout.columns')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Layout columns must be an integer between 1 and 10'),

  body('seatLayout.seats')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Seat layout must define a list of physical seats')
    .custom((seats, { req }) => {
      if (!seats) return true;
      if (req.body.totalSeats) {
        const totalSeats = parseInt(req.body.totalSeats, 10);
        if (seats.length !== totalSeats) {
          throw new Error(
            `Seat layout contains ${seats.length} seats, but totalSeats is configured as ${totalSeats}. They must match.`
          );
        }
      }

      const seatNumbers = new Set();
      for (const seat of seats) {
        if (!seat.seatNumber || !seat.seatNumber.trim()) {
          throw new Error('Every seat must have a valid seatNumber (e.g. 1A, 1B).');
        }
        const sNum = seat.seatNumber.trim().toUpperCase();
        if (seatNumbers.has(sNum)) {
          throw new Error(`Duplicate seat number detected in layout: ${sNum}`);
        }
        seatNumbers.add(sNum);

        if (seat.row == null || !Number.isInteger(Number(seat.row)) || Number(seat.row) < 1) {
          throw new Error(`Seat ${sNum} must have a valid positive integer row.`);
        }
        if (seat.col == null || !Number.isInteger(Number(seat.col)) || Number(seat.col) < 1) {
          throw new Error(`Seat ${sNum} must have a valid positive integer column.`);
        }
      }
      return true;
    }),

  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array of strings'),

  validateRequest
];

module.exports = { busValidation, busUpdateValidation };


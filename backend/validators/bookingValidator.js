const { body } = require('express-validator');
const { validateRequest } = require('./authValidator');

const holdValidation = [
  body('tripId')
    .notEmpty()
    .withMessage('Trip ID is required')
    .isMongoId()
    .withMessage('Invalid trip ID format'),

  body('seatNumbers')
    .isArray({ min: 1, max: 6 })
    .withMessage('seatNumbers must be an array of between 1 and 6 seat numbers')
    .custom((seats) => {
      const set = new Set();
      for (const s of seats) {
        if (!s || typeof s !== 'string' || !s.trim()) {
          throw new Error('Every seatNumber must be a valid non-empty string');
        }
        const upper = s.trim().toUpperCase();
        if (set.has(upper)) {
          throw new Error(`Duplicate seat number '${upper}' in hold request`);
        }
        set.add(upper);
      }
      return true;
    }),

  body('boardingStopId')
    .notEmpty()
    .withMessage('Boarding stop ID is required')
    .isMongoId()
    .withMessage('Invalid boarding stop ID format'),

  body('droppingStopId')
    .notEmpty()
    .withMessage('Dropping stop ID is required')
    .isMongoId()
    .withMessage('Invalid dropping stop ID format')
    .custom((val, { req }) => {
      if (val === req.body.boardingStopId) {
        throw new Error('Dropping stop must be different from boarding stop');
      }
      return true;
    }),

  validateRequest
];

const bookingValidation = [
  body('tripId')
    .notEmpty()
    .withMessage('Trip ID is required')
    .isMongoId()
    .withMessage('Invalid trip ID format'),

  body('boardingStopId')
    .notEmpty()
    .withMessage('Boarding stop ID is required')
    .isMongoId()
    .withMessage('Invalid boarding stop ID format'),

  body('droppingStopId')
    .notEmpty()
    .withMessage('Dropping stop ID is required')
    .isMongoId()
    .withMessage('Invalid dropping stop ID format')
    .custom((val, { req }) => {
      if (val === req.body.boardingStopId) {
        throw new Error('Dropping stop must be different from boarding stop');
      }
      return true;
    }),

  body('passengers')
    .isArray({ min: 1, max: 6 })
    .withMessage('passengers must be an array of between 1 and 6 passengers')
    .custom((passengers) => {
      const seatSet = new Set();
      for (const p of passengers) {
        if (!p.fullName || !p.fullName.trim()) {
          throw new Error('Every passenger must have a valid full name');
        }
        if (p.age == null || !Number.isInteger(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 120) {
          throw new Error('Passenger age must be an integer between 1 and 120');
        }
        if (!p.gender || !['male', 'female', 'other'].includes(p.gender.toLowerCase())) {
          throw new Error("Passenger gender must be 'male', 'female', or 'other'");
        }
        if (!p.seatNumber || !p.seatNumber.trim()) {
          throw new Error('Every passenger must be assigned a seatNumber');
        }
        const sNum = p.seatNumber.trim().toUpperCase();
        if (seatSet.has(sNum)) {
          throw new Error(`Multiple passengers cannot be assigned to the same seat '${sNum}'`);
        }
        seatSet.add(sNum);
      }
      return true;
    }),

  validateRequest
];

module.exports = { holdValidation, bookingValidation };


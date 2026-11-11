const { body } = require('express-validator');
const { validateRequest } = require('./authValidator');

const tripValidation = [
  body('busId')
    .notEmpty()
    .withMessage('Bus reference is required')
    .isMongoId()
    .withMessage('Invalid bus ID'),

  body('routeId')
    .notEmpty()
    .withMessage('Route reference is required')
    .isMongoId()
    .withMessage('Invalid route ID'),

  body('travelDate')
    .notEmpty()
    .withMessage('Travel date is required')
    .isISO8601()
    .withMessage('Travel date must be a valid ISO date'),

  body('departureTime')
    .notEmpty()
    .withMessage('Departure time is required')
    .isISO8601()
    .withMessage('Departure time must be a valid ISO datetime'),

  body('arrivalTime')
    .notEmpty()
    .withMessage('Arrival time is required')
    .isISO8601()
    .withMessage('Arrival time must be a valid ISO datetime')
    .custom((val, { req }) => {
      const dep = new Date(req.body.departureTime);
      const arr = new Date(val);
      if (arr <= dep) {
        throw new Error('Arrival time must be after departure time.');
      }
      return true;
    }),

  body('baseFare')
    .notEmpty()
    .withMessage('Base fare is required')
    .isFloat({ min: 0 })
    .withMessage('Base fare must be non-negative'),

  validateRequest
];

module.exports = { tripValidation };


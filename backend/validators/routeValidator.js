const { body } = require('express-validator');
const { validateRequest } = require('./authValidator');

const routeValidation = [
  body('sourceStopId')
    .notEmpty()
    .withMessage('Source stop is required')
    .isMongoId()
    .withMessage('Invalid source stop ID'),

  body('destinationStopId')
    .notEmpty()
    .withMessage('Destination stop is required')
    .isMongoId()
    .withMessage('Invalid destination stop ID')
    .custom((val, { req }) => {
      if (val === req.body.sourceStopId) {
        throw new Error('Destination stop must be different from source stop.');
      }
      return true;
    }),

  body('routeName')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Route name cannot exceed 150 characters'),

  body('distanceKm')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Distance must be non-negative'),

  body('estimatedDurationMinutes')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Estimated duration must be a non-negative integer'),

  body('stops')
    .optional()
    .isArray({ min: 2 })
    .withMessage('If provided, route stops must include at least source and destination (min 2 stops)')
    .custom((stops) => {
      if (!stops) return true;
      const sequences = new Set();
      const stopIds = new Set();

      for (const st of stops) {
        if (st.stopSequence == null || st.stopSequence < 0) {
          throw new Error('Every route stop must have a non-negative stopSequence.');
        }
        if (sequences.has(st.stopSequence)) {
          throw new Error(`Duplicate stop sequence position found: ${st.stopSequence}`);
        }
        sequences.add(st.stopSequence);

        if (!st.stopId) {
          throw new Error('Every stop in list must specify a valid stopId.');
        }
        if (stopIds.has(st.stopId)) {
          throw new Error(`A stop cannot appear multiple times on the same route.`);
        }
        stopIds.add(st.stopId);
      }
      return true;
    }),

  validateRequest
];

module.exports = { routeValidation };


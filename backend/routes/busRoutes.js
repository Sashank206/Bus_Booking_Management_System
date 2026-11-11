const express = require('express');
const {
  getBuses,
  getBusById,
  createBus,
  updateBus,
  toggleBusStatus
} = require('../controllers/busController');
const { protect, authorize, requireApprovedOperator } = require('../middleware/auth');
const { busValidation, busUpdateValidation } = require('../validators/busValidator');

const router = express.Router();

router.use(protect);

// Operators and admins can read buses
router.get('/', authorize('operator', 'admin'), getBuses);
router.get('/:busId', authorize('operator', 'admin'), getBusById);

// Only approved operators can create/update buses
router.post('/', authorize('operator'), requireApprovedOperator, busValidation, createBus);
router.put('/:busId', authorize('operator', 'admin'), requireApprovedOperator, busUpdateValidation, updateBus);
router.patch('/:busId/status', authorize('operator', 'admin'), requireApprovedOperator, toggleBusStatus);

module.exports = router;


const express = require('express');
const { getOperatorDashboard } = require('../controllers/operatorDashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('operator', 'admin'));

router.get('/dashboard', getOperatorDashboard);

module.exports = router;


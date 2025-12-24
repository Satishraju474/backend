const express = require('express');
const router = express.Router();
const { assignBulkFee, markFeePaid, getStats } = require('../controllers/placementController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/fees/assign', protect, authorize('placement_officer', 'admin'), assignBulkFee);
router.post('/fees/pay', protect, authorize('placement_officer', 'admin'), markFeePaid);
router.get('/stats', protect, authorize('placement_officer', 'admin'), getStats);

module.exports = router;

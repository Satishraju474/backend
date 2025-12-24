const express = require('express');
const router = express.Router();
const { assignHostelFee, markFeePaid, disableHostel, getStudentStatus } = require('../controllers/hostelController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/fees/assign', protect, authorize('hostel_warden', 'admin'), assignHostelFee);
router.post('/fees/pay', protect, authorize('hostel_warden', 'admin'), markFeePaid);
router.post('/disable', protect, authorize('hostel_warden', 'admin'), disableHostel);
router.get('/student/:usn', protect, authorize('hostel_warden', 'admin'), getStudentStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getMyAttendance, markAttendance, markBulkAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Student: get own attendance
router.get('/my-attendance', protect, authorize('student'), getMyAttendance);

// Admin / Exam Head: mark attendance
router.post('/mark', protect, authorize('admin', 'exam_head'), markAttendance);
router.post('/mark-bulk', protect, authorize('admin', 'exam_head'), markBulkAttendance);

module.exports = router;

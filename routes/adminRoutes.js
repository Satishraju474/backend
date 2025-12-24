const express = require('express');
const router = express.Router();
const {
    createStudent,
    updateStudentFees,
    createExamNotification,
    getDashboardStats,
    getExamNotifications,
    updateExamNotification,
    setGovFee,
    getSystemConfig,
    searchStudent
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/config', protect, authorize('admin'), getSystemConfig);
router.post('/config/gov-fee', protect, authorize('admin'), setGovFee);
router.get('/students/search', protect, authorize('admin'), searchStudent);

router.post('/students', protect, authorize('admin'), createStudent);
router.put('/students/:usn/fees', protect, authorize('admin'), updateStudentFees);
router.post('/notifications', protect, authorize('admin', 'exam_head'), createExamNotification);
router.put('/notifications/:id', protect, authorize('admin', 'exam_head'), updateExamNotification);
// Publicly accessible for now, but usually protected for students to get "My" notifications
router.get('/notifications', protect, getExamNotifications);
router.get('/stats', protect, authorize('admin', 'principal', 'exam_head'), getDashboardStats);

module.exports = router;

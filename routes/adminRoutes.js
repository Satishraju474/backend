const express = require('express');
const router = express.Router();
const {
    createStudent,
    updateStudentFees,
    createExamNotification,
    getDashboardStats,
    getExamNotifications,
    updateExamNotification,
    deleteExamNotification,
    setGovFee,
    getSystemConfig,
    searchStudent,
    getStudentsByYear,
    promoteStudents,
    getAnalytics
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/config', protect, authorize('admin'), getSystemConfig);
router.post('/config/gov-fee', protect, authorize('admin'), setGovFee);
router.get('/students/search', protect, authorize('admin'), searchStudent);

router.post('/students', protect, authorize('admin'), createStudent);
router.put('/students/:usn/fees', protect, authorize('admin'), updateStudentFees);
router.post('/notifications', protect, authorize('admin', 'exam_head'), createExamNotification);
router.put('/notifications/:id', protect, authorize('admin', 'exam_head'), updateExamNotification);
router.delete('/notifications/:id', protect, authorize('admin', 'exam_head'), deleteExamNotification);
// Publicly accessible for now, but usually protected for students to get "My" notifications
router.get('/notifications', protect, getExamNotifications);
router.get('/stats', protect, authorize('admin', 'principal', 'exam_head'), getDashboardStats);
router.get('/analytics', protect, authorize('admin'), getAnalytics);

// Promotion Routes
router.get('/students/year/:year', protect, authorize('admin'), getStudentsByYear);
router.post('/students/promote', protect, authorize('admin'), promoteStudents);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    getNotifications,
    createNotification,
    updateNotification,
    deleteNotification
} = require('../controllers/examHeadController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/notifications', protect, getNotifications);
router.post('/notifications', protect, authorize('exam_head', 'admin'), createNotification);
router.put('/notifications/:id', protect, authorize('exam_head', 'admin'), updateNotification);
router.delete('/notifications/:id', protect, authorize('exam_head', 'admin'), deleteNotification);

module.exports = router;

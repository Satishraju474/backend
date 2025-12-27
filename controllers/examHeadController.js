const ExamNotification = require('../models/ExamNotification');
const Student = require('../models/Student');

// @desc    Get all exam notifications
// @route   GET /api/exam-head/notifications
// @access  Private (Exam Head, Admin, Student)
const getNotifications = async (req, res) => {
    try {
        // If student, filter by their year? For now, return all active for simplicity or filter in frontend
        // But for exam head dashboard, return all.
        const notifications = await ExamNotification.find({}).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new exam notification
// @route   POST /api/exam-head/notifications
// @access  Private (Exam Head, Admin)
const createNotification = async (req, res) => {
    try {
        const { title, year, semester, examFeeAmount, startDate, lastDateWithoutFine, endDate, description, examType } = req.body;

        const notification = new ExamNotification({
            title,
            year,
            semester,
            examFeeAmount,
            startDate,
            lastDateWithoutFine,
            endDate,
            description,
            examType
        });

        const createdNotification = await notification.save();
        res.status(201).json(createdNotification);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update notification (e.g. extend date)
// @route   PUT /api/exam-head/notifications/:id
// @access  Private (Exam Head, Admin)
const updateNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await ExamNotification.findById(id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        notification.title = req.body.title || notification.title;
        notification.endDate = req.body.endDate || notification.endDate;
        notification.lateFee = req.body.lateFee !== undefined ? req.body.lateFee : notification.lateFee;
        notification.examsType = req.body.examType || notification.examType;

        await notification.save();
        res.json(notification);

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete notification
// @route   DELETE /api/exam-head/notifications/:id
// @access  Private (Exam Head, Admin)
const deleteNotification = async (req, res) => {
    try {
        const notification = await ExamNotification.findById(req.params.id);

        if (notification) {
            await notification.deleteOne();
            res.json({ message: 'Notification removed' });
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getNotifications,
    createNotification,
    updateNotification,
    deleteNotification
};

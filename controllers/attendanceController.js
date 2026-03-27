const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// @desc    Get attendance for logged-in student
// @route   GET /api/attendance/my-attendance
// @access  Private (Student)
const getMyAttendance = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user._id });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const records = await Attendance.find({ student: student._id }).sort({ date: -1 });

        // Group by subjectCode
        const grouped = {};
        for (const rec of records) {
            if (!grouped[rec.subjectCode]) {
                grouped[rec.subjectCode] = {
                    subject: rec.subject,
                    subjectCode: rec.subjectCode,
                    semester: rec.semester,
                    total: 0,
                    present: 0,
                    absent: 0,
                    late: 0,
                    records: []
                };
            }
            grouped[rec.subjectCode].total += 1;
            if (rec.status === 'present') grouped[rec.subjectCode].present += 1;
            else if (rec.status === 'absent') grouped[rec.subjectCode].absent += 1;
            else if (rec.status === 'late') grouped[rec.subjectCode].late += 1;
            grouped[rec.subjectCode].records.push({
                date: rec.date,
                status: rec.status
            });
        }

        const summary = Object.values(grouped).map(g => ({
            ...g,
            percentage: g.total > 0 ? Math.round(((g.present + g.late) / g.total) * 100) : 0
        }));

        res.json({ summary, totalRecords: records.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark attendance (admin / exam head use)
// @route   POST /api/attendance/mark
// @access  Private (Admin / Exam Head)
const markAttendance = async (req, res) => {
    try {
        const { studentId, date, subject, subjectCode, semester, status } = req.body;

        if (!studentId || !date || !subject || !subjectCode || !semester) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const record = await Attendance.create({
            student: studentId,
            date,
            subject,
            subjectCode,
            semester,
            status: status || 'present',
            markedBy: req.user._id
        });

        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk mark attendance
// @route   POST /api/attendance/mark-bulk
// @access  Private (Admin / Exam Head)
const markBulkAttendance = async (req, res) => {
    try {
        const { records } = req.body; // array of { studentId, date, subject, subjectCode, semester, status }

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'Records array is required' });
        }

        const docs = records.map(r => ({
            student: r.studentId,
            date: r.date,
            subject: r.subject,
            subjectCode: r.subjectCode,
            semester: r.semester,
            status: r.status || 'present',
            markedBy: req.user._id
        }));

        const result = await Attendance.insertMany(docs);
        res.status(201).json({ inserted: result.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMyAttendance, markAttendance, markBulkAttendance };

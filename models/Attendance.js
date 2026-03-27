const mongoose = require('mongoose');

const attendanceSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: Date, required: true },
    subject: { type: String, required: true },
    subjectCode: { type: String, required: true },
    semester: { type: Number, required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

attendanceSchema.index({ student: 1, semester: 1 });
attendanceSchema.index({ student: 1, subjectCode: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);

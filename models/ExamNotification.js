const mongoose = require('mongoose');

const examNotificationSchema = mongoose.Schema({
    title: { type: String, required: true },
    year: { type: Number, required: true, min: 1, max: 4 }, // Target Year (1,2,3,4)
    semester: { type: Number, required: true }, // Target Semester (1-8)
    examFeeAmount: { type: Number, required: true },
    lateFee: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    lastDateWithoutFine: { type: Date, required: true }, // Usually same as end date initially
    endDate: { type: Date, required: true }, // Final deadline (extended)
    isActive: { type: Boolean, default: true },
    description: { type: String },
    examType: { type: String, enum: ['regular', 'supplementary'], default: 'regular' } // Added distinction
}, { timestamps: true });

module.exports = mongoose.model('ExamNotification', examNotificationSchema);

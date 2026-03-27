const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    amount: { type: Number, required: true },
    paymentType: {
        type: String,
        enum: ['exam_fee', 'college_fee', 'transport_fee', 'hostel_fee', 'placement_fee', 'library_fee', 'other_fee'],
        required: true
    },
    examNotificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamNotification' }, // If type is exam_fee

    // For Supplementary Exams
    selectedSubjects: [{
        subjectName: String,
        subjectCode: String,
        fee: Number
    }],

    // Payment Gateway Details
    razorpayPaymentId: { type: String },
    razorpayOrderId: { type: String },
    razorpaySignature: { type: String },

    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    transactionDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);

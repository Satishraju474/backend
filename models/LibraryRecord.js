const mongoose = require('mongoose');

const libraryRecordSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    usn: { type: String, required: true },
    bookTitle: { type: String, required: true },
    bookId: { type: String, required: true }, // Simple ID or Accession Number
    borrowedDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date },
    status: { type: String, enum: ['borrowed', 'returned', 'overdue', 'lost'], default: 'borrowed' },
    fine: { type: Number, default: 0 },
    remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('LibraryRecord', libraryRecordSchema);

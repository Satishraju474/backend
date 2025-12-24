const LibraryRecord = require('../models/LibraryRecord');
const Student = require('../models/Student');

// @desc    Issue a book to a student
// @route   POST /api/library/issue
// @access  Private (Librarian/Admin)
const issueBook = async (req, res) => {
    try {
        const { usn, bookTitle, bookId, dueDate } = req.body;

        const student = await Student.findOne({ usn });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const newRecord = new LibraryRecord({
            student: student._id,
            usn: student.usn,
            bookTitle,
            bookId,
            dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default 15 days
            status: 'borrowed'
        });

        const savedRecord = await newRecord.save();
        res.status(201).json(savedRecord);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Return a book
// @route   POST /api/library/return
// @access  Private (Librarian/Admin)
const returnBook = async (req, res) => {
    try {
        const { recordId, fine, remarks } = req.body;

        const record = await LibraryRecord.findById(recordId);
        if (!record) {
            return res.status(404).json({ message: 'Library record not found' });
        }

        record.returnDate = Date.now();
        record.status = 'returned';
        if (fine) record.fine = fine;
        if (remarks) record.remarks = remarks;

        const updatedRecord = await record.save();
        res.json(updatedRecord);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get student's own borrowing history
// @route   GET /api/library/my-books
// @access  Private (Student)
const getMyBooks = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user._id });
        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const records = await LibraryRecord.find({ student: student._id }).sort({ borrowedDate: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get borrowing history of a specific student (For Librarian)
// @route   GET /api/library/student/:usn
// @access  Private (Librarian/Admin)
const getStudentLibraryHistory = async (req, res) => {
    try {
        const { usn } = req.params;
        const student = await Student.findOne({ usn });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const records = await LibraryRecord.find({ student: student._id }).sort({ borrowedDate: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    issueBook,
    returnBook,
    getMyBooks,
    getStudentLibraryHistory
};

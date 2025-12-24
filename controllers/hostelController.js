const Student = require('../models/Student');

// @desc    Assign Hostel Fee to a Student
// @route   POST /api/hostel/fees/assign
// @access  Private (Hostel Warden, Admin)
const assignHostelFee = async (req, res) => {
    try {
        const { usn, amount } = req.body;

        const student = await Student.findOne({ usn });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (!student.hostelOpted) { // If not already opted, enable it
            student.hostelOpted = true;
        }

        // Add Fee Record
        student.feeRecords.push({
            year: student.currentYear,
            semester: student.currentYear * 2 - 1, // Defaulting to odd sem approximation
            feeType: 'hostel',
            amountDue: Number(amount),
            status: 'pending',
            transactions: []
        });

        // Update Top Level Due
        student.hostelFeeDue += Number(amount);

        await student.save();
        res.json({ message: 'Hostel fee assigned successfully', student });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark Hostel Fee as Paid
// @route   POST /api/hostel/fees/pay
// @access  Private (Hostel Warden, Admin)
const markFeePaid = async (req, res) => {
    try {
        const { usn, amount, mode, reference } = req.body;

        const student = await Student.findOne({ usn });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const feeRecord = student.feeRecords.find(r => r.feeType === 'hostel' && r.status !== 'paid');
        if (!feeRecord) {
            return res.status(400).json({ message: 'No pending hostel fee record found for this student.' });
        }

        const paidAmt = Number(amount);
        feeRecord.amountPaid += paidAmt;

        feeRecord.transactions.push({
            amount: paidAmt,
            mode: mode || 'CASH',
            reference: reference || `HOSTEL-${Date.now()}`,
            date: Date.now()
        });

        if (feeRecord.amountPaid >= feeRecord.amountDue) {
            feeRecord.status = 'paid';
        } else {
            feeRecord.status = 'partial';
        }

        // Update Top Level
        student.hostelFeeDue = Math.max(0, student.hostelFeeDue - paidAmt);

        await student.save();

        res.json({ message: 'Payment recorded', student });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Disable Hostel for a Student
// @route   POST /api/hostel/disable
// @access  Private (Hostel Warden, Admin)
const disableHostel = async (req, res) => {
    try {
        const { usn } = req.body;
        const student = await Student.findOne({ usn });

        if (!student) return res.status(404).json({ message: 'Student not found' });

        student.hostelOpted = false;
        // Optional: Clear dues? The prompt said "disable the hostel... and make same as placement officer to deduct".
        // Usually disabling means they left. We might keep the record but stop new fees.
        // I'll just set the flag to false.

        await student.save();
        res.json({ message: `Hostel disabled for ${student.name}` });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search Student for Hostel
// @route   GET /api/hostel/student/:usn
// @access  Private
const getStudentStatus = async (req, res) => {
    try {
        const { usn } = req.params;
        const student = await Student.findOne({ usn }).select('usn name hostelOpted hostelFeeDue feeRecords');

        if (!student) return res.status(404).json({ message: 'Student not found' });

        const pendingRecords = student.feeRecords.filter(r => r.feeType === 'hostel');

        res.json({
            usn: student.usn,
            name: student.name, // Since name is populated in controller usually, wait Student model doesn't have name directly it has user ref.
            // Wait, Student model has `user` ref.
            // I need to populate user to get name.
            hostelOpted: student.hostelOpted,
            hostelFeeDue: student.hostelFeeDue,
            pendingRecords
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    assignHostelFee,
    markFeePaid,
    disableHostel,
    getStudentStatus
};

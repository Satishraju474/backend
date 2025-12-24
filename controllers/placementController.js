const Student = require('../models/Student');

// @desc    Assign Bulk Placement Fee to a specific Year
// @route   POST /api/placement/fees/assign
// @access  Private (Placement Officer)
const assignBulkFee = async (req, res) => {
    try {
        const { year, amount, description } = req.body;

        if (!year || !amount) {
            return res.status(400).json({ message: 'Year and Amount are required' });
        }

        // Find all active students in that year
        const students = await Student.find({ currentYear: year, status: 'active' });

        if (students.length === 0) {
            return res.status(404).json({ message: `No active students found in Year ${year}` });
        }

        let updatedCount = 0;

        for (const student of students) {
            // Check if fee already exists for this year to avoid duplicates
            const exists = student.feeRecords.find(r => r.year === year && r.feeType === 'placement');

            if (!exists) {
                student.feeRecords.push({
                    year: year,
                    semester: student.currentYear * 2 - 1, // Defaulting to odd sem, doesn't matter much for yearly fee
                    feeType: 'placement',
                    amountDue: amount,
                    status: 'pending',
                    transactions: []
                });
                await student.save();
                updatedCount++;
            }
        }

        res.json({ message: `Placement Fee assigned to ${updatedCount} students in Year ${year}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark Placement Fee as Paid for a Student
// @route   POST /api/placement/fees/pay
// @access  Private (Placement Officer)
const markFeePaid = async (req, res) => {
    try {
        const { usn, amount, mode, reference } = req.body;

        const student = await Student.findOne({ usn });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Find the placement fee record - prioritize current year or just find ANY pending placement fee
        // Usually we pay for the current demand.
        const record = student.feeRecords.find(r => r.feeType === 'placement' && r.year === student.currentYear);

        if (!record) {
            // Try to create one on the fly if not exists? Or error?
            // Better to error, fee must be assigned first.
            return res.status(404).json({ message: 'No Placement Fee record found for this student for current year.' });
        }

        // Update Record
        const paidAmount = Number(amount);
        record.amountPaid += paidAmount;

        record.transactions.push({
            amount: paidAmount,
            mode: mode || 'CASH',
            reference: reference || `MANUAL-${Date.now()}`,
            date: Date.now()
        });

        if (record.amountPaid >= record.amountDue) {
            record.status = 'paid';
        } else {
            record.status = 'partial';
        }

        await student.save();
        res.json({ message: 'Payment recorded successfully', student });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Placement Dashboard Stats
// @route   GET /api/placement/stats
// @access  Private (Placement Officer)
const getStats = async (req, res) => {
    try {
        const students = await Student.find({ status: 'active' });

        let totalDue = 0;
        let totalPaid = 0;
        let studentsCovered = 0;

        students.forEach(s => {
            const placementRecords = s.feeRecords.filter(r => r.feeType === 'placement');
            placementRecords.forEach(r => {
                totalDue += r.amountDue;
                totalPaid += r.amountPaid;
            });
            if (placementRecords.length > 0) studentsCovered++;
        });

        res.json({
            totalStudents: students.length,
            studentsWithFee: studentsCovered,
            totalDue,
            totalPaid,
            pending: totalDue - totalPaid
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    assignBulkFee,
    markFeePaid,
    getStats
};

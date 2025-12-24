const Student = require('../models/Student');

// @desc    Get current student profile
// @route   GET /api/students/profile
// @access  Private (Student)
const getStudentProfile = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user._id }).populate('user', 'name email');

        if (student) {
            res.json(student);
        } else {
            res.status(404).json({ message: 'Student profile not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check exam eligibility
// @route   GET /api/students/eligibility
// @access  Private (Student)
const checkEligibility = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user._id });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        let isEligible = true;
        let reasons = [];

        if (student.status !== 'active') {
            isEligible = false; // Backward compat
            reasons.push(`Student status is ${student.status}`);
        }

        // Logic for Split Eligibility (Odd Sem vs Even Sem Exams)
        let eligibleForOddSem = false;
        let eligibleForEvenSem = false;
        let percentagePaid = 0;

        // Calculate Total Current Year Fee (College + Transport) based on feeRecords for current year
        const currentYearRecords = student.feeRecords.filter(r => r.year === student.currentYear && ['college', 'transport'].includes(r.feeType));
        const totalDue = currentYearRecords.reduce((sum, r) => sum + r.amountDue, 0);
        const totalPaid = currentYearRecords.reduce((sum, r) => sum + (r.amountPaid || 0), 0);

        // If no fee records yet, fallback to top-level dues (Assuming fully unpaid if no records or fresh start)
        const effectiveTotalDue = totalDue > 0 ? totalDue : (student.collegeFeeDue + student.transportFeeDue); // Approx fallback
        const effectivePaid = totalDue > 0 ? totalPaid : 0;

        if (effectiveTotalDue > 0) {
            percentagePaid = (effectivePaid / effectiveTotalDue) * 100;
        } else {
            // If 0 due, assume eligible (scholarship or fully paid previously?)
            // Or check if top level due is 0.
            if (student.collegeFeeDue === 0 && student.transportFeeDue === 0) percentagePaid = 100;
        }

        // Rule: Odd Sem (e.g. Sem 1) requires >= 50% Clearance
        if (percentagePaid >= 50) {
            eligibleForOddSem = true;
        } else {
            reasons.push(`Odd Sem Eligibility: Paid ${percentagePaid.toFixed(1)}% (Need 50%)`);
        }

        // Rule: Even Sem (e.g. Sem 2) requires 100% Clearance
        if (percentagePaid >= 99.9) { // Float tolerance
            eligibleForEvenSem = true;
        } else {
            if (eligibleForOddSem) reasons.push(`Even Sem Eligibility: Paid ${percentagePaid.toFixed(1)}% (Need 100%)`);
        }

        // Check Override
        if (student.eligibilityOverride === true) {
            eligibleForOddSem = true;
            eligibleForEvenSem = true;
            reasons = ['Administratively Overridden (Eligible)'];
        } else if (student.eligibilityOverride === false) {
            eligibleForOddSem = false;
            eligibleForEvenSem = false;
            reasons = ['Administratively Overridden (Ineligible)'];
        }

        // Backward compatibility: "isEligible" generally implies ability to pay *something*. 
        // We'll leave it as true if even Odd is eligible, but the frontend should check specific flags.
        isEligible = eligibleForOddSem;

        if (student.lastSemDues > 0) {
            isEligible = false;
            eligibleForOddSem = false;
            eligibleForEvenSem = false;
            reasons.push(`Pending Last Semester Dues: ${student.lastSemDues}`);
        }

        res.json({
            isEligible,
            eligibleForOddSem,
            eligibleForEvenSem,
            reasons,
            student: {
                usn: student.usn,
                name: req.user.name,
                collegeFeeDue: student.collegeFeeDue,
                transportFeeDue: student.transportFeeDue,
                lastSemDues: student.lastSemDues,
                percentagePaid
            }
        });



    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getStudentProfile, checkEligibility };

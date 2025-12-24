const User = require('../models/User');
const Student = require('../models/Student');
const ExamNotification = require('../models/ExamNotification');
const SystemConfig = require('../models/SystemConfig');

// @desc    Create a new student with user profile
// @route   POST /api/admin/students
// @access  Private (Admin)
// @desc    Create a new student with user profile
// @route   POST /api/admin/students
// @access  Private (Admin)
const createStudent = async (req, res) => {
    try {
        const {
            username, password, name, department, currentYear,
            quota, entry, email,
            transportOpted, // Boolean
            assignedCollegeFee, // For Management Quota
            assignedTransportFee // If transportOpted is true
        } = req.body;

        // 1. Create User
        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({
            username,
            password,
            name,
            email,
            role: 'student'
        });

        // 2. Determine initial fees
        let initialCollegeFee = 0;

        if (quota === 'management') {
            initialCollegeFee = assignedCollegeFee || 0;
        } else {
            // Fetch Default Gov Fee
            const config = await SystemConfig.findOne({ key: 'default_gov_fee' });
            initialCollegeFee = config ? config.value : 0;
        }

        let initialTransportFee = 0;
        if (transportOpted) {
            initialTransportFee = assignedTransportFee || 0;
        }

        // 3. Create Student Profile
        const student = await Student.create({
            user: user._id,
            usn: username,
            department,
            currentYear: Number(currentYear),
            quota,
            entry,
            transportOpted: transportOpted || false,
            collegeFeeDue: initialCollegeFee,
            transportFeeDue: initialTransportFee
        });

        res.status(201).json(student);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Student Fees
// @route   PUT /api/admin/students/:usn/fees
// @access  Private (Admin)
const updateStudentFees = async (req, res) => {
    try {
        const {
            collegeFeeDue, transportFeeDue, lastSemDues, status, transportOpted, // Direct updates
            feeRecordId, amount, mode, reference, // Payment Transaction
            eligibilityOverride // New field
        } = req.body;

        const student = await Student.findOne({ usn: req.params.usn });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // 1. Handle Ledger Payment Transaction
        if (feeRecordId && amount) {
            // Ensure feeRecords is initialized
            if (!student.feeRecords) {
                student.feeRecords = [];
            }

            // Find record safely
            const record = student.feeRecords.find(r => r._id.toString() === feeRecordId);

            if (!record) {
                console.error(`Fee Record not found: ${feeRecordId}`);
                return res.status(404).json({ message: 'Fee Record not found' });
            }

            // Update Paid Amount
            const paymentAmount = Number(amount); // Ensure number
            record.amountPaid = (record.amountPaid || 0) + paymentAmount;

            // Update Status
            if (record.amountPaid >= record.amountDue) {
                record.status = 'paid';
            } else if (record.amountPaid > 0) {
                record.status = 'partial';
            }

            // Add Transaction Log
            record.transactions.push({
                amount: paymentAmount,
                date: new Date(),
                mode: mode || 'Manual',
                reference: reference || 'Admin Update'
            });

            // Sync with Top-level Dues
            if (record.feeType === 'college') {
                student.collegeFeeDue = Math.max(0, (student.collegeFeeDue || 0) - paymentAmount);
            }
            if (record.feeType === 'transport') {
                student.transportFeeDue = Math.max(0, (student.transportFeeDue || 0) - paymentAmount);
            }
        }

        // 2. Handle Manual Direct Updates
        if (collegeFeeDue !== undefined) {
            student.collegeFeeDue = collegeFeeDue;
            // If marked as paid (0), sync any pending ledger records
            if (collegeFeeDue === 0 && student.feeRecords) {
                student.feeRecords.forEach(r => {
                    if (r.feeType === 'college' && r.status !== 'paid') {
                        r.status = 'paid';
                        r.amountPaid = r.amountDue;
                        r.transactions.push({
                            amount: r.amountDue - (r.amountPaid || 0),
                            date: new Date(),
                            mode: 'Auto-Clear',
                            reference: 'Admin Marked Paid'
                        });
                    }
                });
            }
        }

        if (transportFeeDue !== undefined) {
            student.transportFeeDue = transportFeeDue;
            // If marked as paid (0), sync any pending ledger records
            if (transportFeeDue === 0 && student.feeRecords) {
                student.feeRecords.forEach(r => {
                    if (r.feeType === 'transport' && r.status !== 'paid') {
                        r.status = 'paid';
                        r.amountPaid = r.amountDue;
                        r.transactions.push({
                            amount: r.amountDue - (r.amountPaid || 0),
                            date: new Date(),
                            mode: 'Auto-Clear',
                            reference: 'Admin Marked Paid'
                        });
                    }
                });
            }
        }

        if (lastSemDues !== undefined) student.lastSemDues = lastSemDues;
        if (status !== undefined) student.status = status;
        if (transportOpted !== undefined) student.transportOpted = transportOpted;
        if (eligibilityOverride !== undefined) student.eligibilityOverride = eligibilityOverride;

        const updatedStudent = await student.save();
        res.json(updatedStudent);
    } catch (error) {
        console.error("Update Fee Error:", error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Set Default Government Fee (And Apply)
// @route   POST /api/admin/config/gov-fee
// @access  Private (Admin)
// @desc    Set Default Government Fee (And Apply)
// @route   POST /api/admin/config/gov-fee
// @access  Private (Admin)
const setGovFee = async (req, res) => {
    try {
        const { quota, currentYear, amount, usn } = req.body;

        if (!quota || !amount) {
            return res.status(400).json({ message: 'Quota and Amount are required' });
        }

        const newAmount = parseInt(amount);
        const year = Number(currentYear);
        const semA = (year * 2) - 1;
        const semB = year * 2;
        const splitFee = Math.ceil(newAmount / 2);

        // Helper to update/add semester records
        const updateSemesterRecords = (student, totalFee) => {
            const amountA = Math.ceil(totalFee / 2);
            const amountB = totalFee - amountA;

            // Update/Create Sem A
            const indexA = student.feeRecords.findIndex(r => r.semester === semA && r.feeType === 'college');
            if (indexA !== -1) {
                student.feeRecords[indexA].amountDue = amountA;
                // Update status if needed
                if (student.feeRecords[indexA].amountPaid >= amountA) student.feeRecords[indexA].status = 'paid';
                else if (student.feeRecords[indexA].amountPaid > 0) student.feeRecords[indexA].status = 'partial';
                else student.feeRecords[indexA].status = 'pending';
            } else {
                student.feeRecords.push({
                    year: year,
                    semester: semA,
                    feeType: 'college',
                    amountDue: amountA,
                    status: 'pending',
                    transactions: []
                });
            }

            // Update/Create Sem B
            const indexB = student.feeRecords.findIndex(r => r.semester === semB && r.feeType === 'college');
            if (indexB !== -1) {
                student.feeRecords[indexB].amountDue = amountB;
                if (student.feeRecords[indexB].amountPaid >= amountB) student.feeRecords[indexB].status = 'paid';
                else if (student.feeRecords[indexB].amountPaid > 0) student.feeRecords[indexB].status = 'partial';
                else student.feeRecords[indexB].status = 'pending';
            } else {
                student.feeRecords.push({
                    year: year,
                    semester: semB,
                    feeType: 'college',
                    amountDue: amountB,
                    status: 'pending',
                    transactions: []
                });
            }
        };


        if (quota === 'government') {
            if (!currentYear) return res.status(400).json({ message: 'Year is required' });

            const students = await Student.find({ quota: 'government', currentYear: year });

            for (const student of students) {
                student.collegeFeeDue = newAmount;
                updateSemesterRecords(student, newAmount);
                await student.save();
            }

            // Update System Config
            await SystemConfig.findOneAndUpdate(
                { key: 'default_gov_fee' },
                { value: newAmount },
                { upsert: true }
            );

            res.json({ message: `Updated fees for ${students.length} students in Year ${year}` });

        } else if (quota === 'management') {
            if (!usn || !currentYear) return res.status(400).json({ message: 'USN and Year required' });

            const student = await Student.findOne({ usn: usn, quota: 'management' });
            if (!student) return res.status(404).json({ message: 'Student not found' });

            student.collegeFeeDue = (student.collegeFeeDue || 0) + newAmount; // Logic check: is this replace or add? Assuming setGovFee implies "Set Fee" but old logic did +=. Let's assume for management it's usually "Add this years fee". 
            // Wait, for management, usually we set the fee for the year. 
            // The previous logic was: student.collegeFeeDue = (student.collegeFeeDue || 0) - oldDue + parseInt(amount);
            // Let's stick to "setting" the fee for this year.

            // Recalculate total due based on ALL years/semesters? 
            // Or just update the specific year records?
            // "management" fee passing logic usually implies "Set the fee for THIS year". 
            // So we should find if there was previous fee for this year, remove it from total, add new.

            // Simplified: Update the semester records for this year to match newAmount
            // And ensure top level collegeFeeDue matches sum of all feeRecords amountDue - sum of amountPaid?
            // Or just allow the helper to handle the records, and we manually adjust the top level.

            // IMPORTANT: If we are "Setting" the fee for year X, we should overwrite whatever was there for year X.
            // The previous code had complex logic. Let's simplify:
            // 1. Calculate the difference between new fee and old fee for this year.
            // 2. Adjust total collegeFeeDue by that diff.
            // 3. Update records.

            // Find existing due for this year to calc diff
            const existingRecs = student.feeRecords.filter(r => r.year === year && r.feeType === 'college');
            const oldYearDue = existingRecs.reduce((sum, r) => sum + r.amountDue, 0);

            student.collegeFeeDue = (student.collegeFeeDue || 0) - oldYearDue + newAmount;
            updateSemesterRecords(student, newAmount);

            await student.save();
            res.json({ message: `Fee Allocated`, student });

        } else {
            res.status(400).json({ message: 'Invalid Quota' });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get System Config
// @route   GET /api/admin/config
const getSystemConfig = async (req, res) => {
    try {
        const govFee = await SystemConfig.findOne({ key: 'default_gov_fee' });
        res.json({
            defaultGovFee: govFee ? govFee.value : 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search Student by USN
// @route   GET /api/admin/students/search
const searchStudent = async (req, res) => {
    try {
        const { query } = req.query;
        // Search by USN (exact or partial)
        const student = await Student.findOne({ usn: { $regex: query, $options: 'i' } })
            .populate('user', 'name email');

        if (student) {
            res.json(student);
        } else {
            res.status(404).json({ message: 'Student not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Exam Notification
// @route   POST /api/admin/notifications
// @access  Private (Admin)
const createExamNotification = async (req, res) => {
    try {
        const { title, year, semester, examFeeAmount, startDate, endDate, description, examType } = req.body;
        const notification = await ExamNotification.create({
            title, year, semester, examFeeAmount, startDate, endDate, description, examType,
            lastDateWithoutFine: endDate, // Set initial fine deadline to endDate
            lateFee: 0
        });
        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Exam Notification (Extend Date / Add Penalty)
// @route   PUT /api/admin/notifications/:id
// @access  Private (Exam Head)
const updateExamNotification = async (req, res) => {
    try {
        const { endDate, lateFee, isActive } = req.body;
        const notification = await ExamNotification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (endDate) notification.endDate = endDate;
        if (lateFee !== undefined) notification.lateFee = Number(lateFee);
        if (isActive !== undefined) notification.isActive = isActive;

        // If extending, we do NOT change lastDateWithoutFine automatically unless requested
        // The logic is: Original End Date remains "Last Date Without Fine" if we are extending "With Penalty"

        const updatedNotification = await notification.save();
        res.json(updatedNotification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Active Notifications
// @route   GET /api/admin/notifications
// @access  Public (or Private)
const getExamNotifications = async (req, res) => {
    try {
        const { isActive } = req.query;
        let query = {};

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // If user is logged in (req.user exists due to protect middleware usually, but this route might be semi-public)
        // If it's a student, we apply visibility logic.
        if (req.user && req.user.role === 'student') {
            const student = await Student.findOne({ user: req.user._id });
            if (student) {
                const currentYear = student.currentYear;

                // LOGIC:
                // 1. Regular Exams: Must match student's current year exactly.
                // 2. Supplementary Exams: Visible if Notification Year <= Student Current Year.
                //    (e.g., Year 1 Supply is visible to Year 1, 2, 3, 4)

                query.$or = [
                    { examType: 'regular', year: currentYear },
                    { examType: 'supplementary', year: { $lte: currentYear } },
                    { examType: { $exists: false }, year: currentYear } // Backward compat
                ];
                // Ensure we only get active ones for students regardless of query param usually, 
                // but let's respect the query param if passed, otherwise default to active.
                if (isActive === undefined) query.isActive = true;
            }
        }

        // If admin/others, they see everything based on query.

        const notifications = await ExamNotification.find(query).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Stats for Dashboard
// @route   GET /api/admin/stats
// @access  Private (Admin/Principal)
const getDashboardStats = async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments();
        const activeStudents = await Student.countDocuments({ status: 'active' });

        const byDepartment = await Student.aggregate([
            { $group: { _id: "$department", count: { $sum: 1 } } }
        ]);

        const byQuota = await Student.aggregate([
            { $group: { _id: "$quota", count: { $sum: 1 } } }
        ]);

        const byEntryType = await Student.aggregate([
            { $group: { _id: "$entry", count: { $sum: 1 } } }
        ]);

        res.json({
            totalStudents,
            activeStudents,
            byDepartment,
            byQuota,
            byEntryType
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createStudent,
    updateStudentFees,
    createExamNotification,
    updateExamNotification,
    getExamNotifications,
    getDashboardStats,
    setGovFee,
    getSystemConfig,
    searchStudent
};

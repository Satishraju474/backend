const User = require('../models/User');
const Student = require('../models/Student');
const SystemConfig = require('../models/SystemConfig');

// @desc    Create a new student
// @route   POST /api/registrar/students
// @access  Private (Registrar)
const createStudent = async (req, res) => {
    try {
        const {
            username, password, name, department, currentYear,
            quota, entry, email,
            transportOpted,
            transportRoute,
            hostelOpted,
            placementOpted,
            assignedCollegeFee,
            assignedTransportFee,
            assignedHostelFee,
            assignedPlacementFee,
            // New detailed fields
            course, currentSemester, batch, admissionNo, admissionDate, admissionType,
            shortName, dateOfBirth, gender, bloodGroup, motherTongue, nationality, religion,
            casteCategory, casteName,
            fatherName, fatherOccupation, fatherMobile, fatherEmail,
            motherName, motherOccupation, annualIncome,
            studentMobile, correspondenceAddress, permanentAddress,
            testName, testRank,
            isLateral, isDetainee, reimbursement, hasScholarship, isDiscontinued,
            aadharNo, voterIdNo, panNo, rationCardNo,
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

        // 2. Determine fees
        let initialCollegeFee = 0;
        if (quota === 'management' || quota === 'nri') {
            initialCollegeFee = assignedCollegeFee ? Number(assignedCollegeFee) : 0;
        } else {
            if (assignedCollegeFee && Number(assignedCollegeFee) > 0) {
                initialCollegeFee = Number(assignedCollegeFee);
            } else {
                initialCollegeFee = 0;
            }
        }

        // Mutual Exclusivity Check (Hostel vs Transport)
        let finalTransportOpted = transportOpted;
        let finalHostelOpted = hostelOpted;

        if (finalTransportOpted && finalHostelOpted) {
            finalTransportOpted = false;
        }

        let initialTransportFee = 0;
        if (finalTransportOpted) {
            initialTransportFee = assignedTransportFee ? Number(assignedTransportFee) : 0;
        }

        // 3. Create Student Profile
        const currentYearNum = parseInt(currentYear) || 1;
        const semA = (currentYearNum * 2) - 1;
        const semB = currentYearNum * 2;

        const feeRecords = [];

        // College Fee Split
        if (initialCollegeFee > 0) {
            const splitFee = Math.ceil(initialCollegeFee / 2);
            feeRecords.push({ year: currentYearNum, semester: semA, feeType: 'college', amountDue: splitFee, status: 'pending', transactions: [] });
            feeRecords.push({ year: currentYearNum, semester: semB, feeType: 'college', amountDue: initialCollegeFee - splitFee, status: 'pending', transactions: [] });
        }

        // Transport Fee Split
        if (initialTransportFee > 0) {
            const splitTrans = Math.ceil(initialTransportFee / 2);
            feeRecords.push({ year: currentYearNum, semester: semA, feeType: 'transport', amountDue: splitTrans, status: 'pending', transactions: [] });
            feeRecords.push({ year: currentYearNum, semester: semB, feeType: 'transport', amountDue: initialTransportFee - splitTrans, status: 'pending', transactions: [] });
        }

        let initialHostelFee = 0;
        if (finalHostelOpted) {
            initialHostelFee = assignedHostelFee ? Number(assignedHostelFee) : 0;
        }

        // Hostel Fee Split
        if (initialHostelFee > 0) {
            const splitHostel = Math.ceil(initialHostelFee / 2);
            feeRecords.push({ year: currentYearNum, semester: semA, feeType: 'hostel', amountDue: splitHostel, status: 'pending', transactions: [] });
            feeRecords.push({ year: currentYearNum, semester: semB, feeType: 'hostel', amountDue: initialHostelFee - splitHostel, status: 'pending', transactions: [] });
        }

        let initialPlacementFee = 0;
        if (placementOpted) {
            initialPlacementFee = assignedPlacementFee ? Number(assignedPlacementFee) : 0;
            if (initialPlacementFee > 0) {
                const splitPlace = Math.ceil(initialPlacementFee / 2);
                feeRecords.push({ year: currentYearNum, semester: semA, feeType: 'placement', amountDue: splitPlace, status: 'pending', transactions: [] });
                feeRecords.push({ year: currentYearNum, semester: semB, feeType: 'placement', amountDue: initialPlacementFee - splitPlace, status: 'pending', transactions: [] });
            }
        }

        const student = await Student.create({
            user: user._id,
            usn: username,
            department,
            course: course || 'B.Tech',
            currentYear: currentYearNum,
            currentSemester: currentSemester ? Number(currentSemester) : undefined,
            quota,
            entry,
            batch: batch || '',
            admissionNo: admissionNo || '',
            admissionDate: admissionDate ? new Date(admissionDate) : undefined,
            admissionType: admissionType || '',
            shortName: shortName || '',
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender,
            bloodGroup: bloodGroup || '',
            motherTongue: motherTongue || '',
            nationality: nationality || 'Indian',
            religion: religion || '',
            casteCategory: casteCategory || '',
            casteName: casteName || '',
            fatherName: fatherName || '',
            fatherOccupation: fatherOccupation || '',
            fatherMobile: fatherMobile || '',
            fatherEmail: fatherEmail || '',
            motherName: motherName || '',
            motherOccupation: motherOccupation || '',
            annualIncome: annualIncome ? Number(annualIncome) : undefined,
            studentMobile: studentMobile || '',
            correspondenceAddress: correspondenceAddress || '',
            permanentAddress: permanentAddress || '',
            testName: testName || '',
            testRank: testRank ? Number(testRank) : undefined,
            isLateral: isLateral || false,
            isDetainee: isDetainee || false,
            reimbursement: reimbursement || false,
            hasScholarship: hasScholarship || false,
            isDiscontinued: isDiscontinued || false,
            aadharNo: aadharNo || '',
            voterIdNo: voterIdNo || '',
            panNo: panNo || '',
            rationCardNo: rationCardNo || '',
            transportOpted: finalTransportOpted || false,
            transportRoute: finalTransportOpted ? transportRoute : '',
            hostelOpted: finalHostelOpted || false,
            placementOpted: placementOpted || false,
            collegeFeeDue: initialCollegeFee,
            transportFeeDue: initialTransportFee,
            hostelFeeDue: initialHostelFee,
            placementFeeDue: initialPlacementFee,
            annualCollegeFee: initialCollegeFee,
            annualTransportFee: initialTransportFee,
            annualHostelFee: initialHostelFee,
            annualPlacementFee: initialPlacementFee,
            feeRecords: feeRecords
        });

        res.status(201).json(student);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset User Password
// @route   POST /api/registrar/reset-password
// @access  Private (Registrar)
const resetPassword = async (req, res) => {
    try {
        const { username, newPassword } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = newPassword;
        // Note: The User model pre-save hook should handle hashing.
        // If the model checks isModified('password'), assigning it here triggers it.

        await user.save();

        res.json({ message: `Password reset successful for user ${username}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Student Details by USN
// @route   GET /api/registrar/students/:usn
// @access  Private (Registrar)
const getStudentByUSN = async (req, res) => {
    try {
        const student = await Student.findOne({ usn: req.params.usn })
            .populate('user', 'name email photoUrl role');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createStudent, resetPassword, getStudentByUSN };

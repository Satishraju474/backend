const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const ExamNotification = require('../models/ExamNotification');

const LibraryRecord = require('../models/LibraryRecord');

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private (Student)
const createOrder = async (req, res) => {
    try {
        const { amount, paymentType, examNotificationId, selectedSubjects } = req.body;

        // Extra safety: normalize amount
        const requestedAmount = Number(amount);

        // Validation and business rules for exam fee payments
        if (paymentType === 'exam_fee') {
            const student = await Student.findOne({ user: req.user._id });
            if (!student) return res.status(404).json({ message: 'Student verification failed' });

            // 1. Block if library books pending (real-life rule)
            const pendingBooks = await LibraryRecord.countDocuments({
                student: student._id,
                status: { $ne: 'returned' }
            });

            if (pendingBooks > 0) {
                return res.status(400).json({
                    message: "You cannot pay Exam Fees with pending Library Books. Please return them first."
                });
            }

            if (examNotificationId) {
                const notification = await ExamNotification.findById(examNotificationId);
                if (!notification) {
                    return res.status(400).json({ message: 'Exam notification not found' });
                }

                const today = new Date();
                const withoutFine = notification.lastDateWithoutFine ? new Date(notification.lastDateWithoutFine) : new Date(notification.endDate);
                const isLateWindow = today > withoutFine;
                const lateFee = isLateWindow ? (notification.lateFee || 0) : 0;

                // Prevent payments after final end date
                if (today > new Date(notification.endDate)) {
                    return res.status(400).json({ message: 'Payment window for this exam has closed.' });
                }

                // Collect existing completed payments for this exam
                const existingPayments = await Payment.find({
                    student: student._id,
                    paymentType: 'exam_fee',
                    examNotificationId: notification._id,
                    status: 'completed'
                });

                if (notification.examType === 'regular') {
                    if (existingPayments.length > 0) {
                        return res.status(400).json({ message: 'Exam fee for this notification is already paid.' });
                    }

                    // Expected amount = base examFeeAmount (+ late fee if in late window)
                    let expected = Number(notification.examFeeAmount) || 0;
                    expected += lateFee;

                    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
                        return res.status(400).json({ message: 'Invalid amount for exam fee.' });
                    }

                    if (Math.round(requestedAmount) !== Math.round(expected)) {
                        return res.status(400).json({ message: 'Exam fee amount mismatch. Please refresh and try again.' });
                    }
                } else if (notification.examType === 'supplementary') {
                    if (!selectedSubjects || !Array.isArray(selectedSubjects) || selectedSubjects.length === 0) {
                        return res.status(400).json({ message: 'Please select at least one subject for supplementary exam.' });
                    }

                    // Build lookup of valid subjects from notification
                    const subjectMap = new Map();
                    (notification.subjects || []).forEach(sub => {
                        subjectMap.set(sub.subjectCode, sub);
                    });

                    // Gather already paid subject codes for this exam
                    const alreadyPaidCodes = new Set();
                    existingPayments.forEach(p => {
                        (p.selectedSubjects || []).forEach(s => {
                            if (s.subjectCode) alreadyPaidCodes.add(s.subjectCode);
                        });
                    });

                    // Validate requested subjects
                    let totalCalc = 0;
                    const duplicateSubjects = [];
                    const invalidSubjects = [];

                    selectedSubjects.forEach(sub => {
                        const code = sub.subjectCode;
                        if (!code || !subjectMap.has(code)) {
                            invalidSubjects.push(code || 'UNKNOWN');
                            return;
                        }
                        if (alreadyPaidCodes.has(code)) {
                            duplicateSubjects.push(code);
                            return;
                        }
                        // We no longer sum individual fees here
                    });

                    if (invalidSubjects.length > 0) {
                        return res.status(400).json({
                            message: `One or more selected subjects are not valid for this exam: ${invalidSubjects.join(', ')}`
                        });
                    }

                    if (duplicateSubjects.length > 0) {
                        return res.status(400).json({
                            message: `You have already paid for: ${duplicateSubjects.join(', ')}`
                        });
                    }

                    // Calculate tiered fee based on number of valid selected subjects
                    const numSubjects = selectedSubjects.length;
                    if (numSubjects === 1) totalCalc = 800;
                    else if (numSubjects === 2) totalCalc = 1200;
                    else if (numSubjects === 3) totalCalc = 1800;
                    else if (numSubjects >= 4) totalCalc = 2500;

                    // Add late fee once per transaction if in late window
                    totalCalc += lateFee;

                    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
                        return res.status(400).json({ message: 'Invalid amount for supplementary exam.' });
                    }

                    if (Math.round(requestedAmount) !== Math.round(totalCalc)) {
                        console.log(`Supplementary amount mismatch: requested=${requestedAmount}, expected=${totalCalc}`);
                        return res.status(400).json({ message: 'Calculated exam amount has changed. Please re-select subjects and try again.' });
                    }
                }
            }
        }

        if (process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id') {
            throw new Error("Razorpay API Keys are not configured in .env file");
        }

        const keyId = process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.replace(/"/g, '').trim() : '';
        const keySecret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.replace(/"/g, '').trim() : '';

        console.log("Razorpay Init - Key Length:", keyId.length, "Secret Length:", keySecret.length);
        console.log("Using Razorpay Key:", keyId.substring(0, 8) + "...");

        const instance = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        const options = {
            amount: Math.round(Number(amount) * 100), // amount in paise, ensure integer
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await instance.orders.create(options);

        if (!order) return res.status(500).send("Error creating order");

        res.json(order);

    } catch (error) {
        console.error("Razorpay Order Error:", error);

        if (error.statusCode === 401) {
            return res.status(500).json({ message: "Razorpay Auth Failed: Invalid Key ID or Secret" });
        }

        res.status(500).json({ message: error.error?.description || error.message || "Payment Initialization Failed" });
    }
};

// @desc    Verify Payment
// @route   POST /api/payments/verify
// @access  Private (Student)
const sendEmail = require('../utils/sendEmail');

// ... (rest of imports)

// ...

const verifyPayment = async (req, res) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            signature,
            paymentType,
            amount,
            examNotificationId,
            selectedSubjects
        } = req.body;

        // Handle Test Mode gracefully if secret is default
        if (process.env.RAZORPAY_KEY_SECRET) {
            const secret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.replace(/"/g, '').trim() : '';
            const shasum = crypto.createHmac("sha256", secret);
            shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
            const digest = shasum.digest("hex");

            if (digest !== signature) {
                return res.status(400).json({ msg: "Transaction validation failed!" });
            }
        }

        const student = await Student.findOne({ user: req.user._id }).populate('user');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Save Payment and Update Status
        const payment = new Payment({
            student: student._id,
            amount,
            paymentType,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature: signature,
            status: 'completed',
            examNotificationId: examNotificationId || null,
            selectedSubjects: selectedSubjects || []
        });

        await payment.save();

        // Auto-update dues if applicable
        let feeTypeLabel = 'Fee';

        // Helper to distribute payment execution (Refactored for Semester-wise)
        const distributePayment = (type, paidAmount) => {
            if (!student.feeRecords) return;

            // Filter relevant records and sort by time (Year ASC, Sem ASC)
            let records = student.feeRecords.filter(r => r.feeType === type && r.status !== 'paid');
            records.sort((a, b) => (a.year - b.year) || (a.semester - b.semester));

            let remaining = paidAmount;

            for (let record of records) {
                if (remaining <= 0) break;

                const pendingOnRecord = record.amountDue - (record.amountPaid || 0);
                const deduction = Math.min(pendingOnRecord, remaining);

                record.amountPaid = (record.amountPaid || 0) + deduction;
                remaining -= deduction;

                // Update Status
                if (record.amountPaid >= record.amountDue) record.status = 'paid';
                else if (record.amountPaid > 0) record.status = 'partial';

                // Log internal transaction
                record.transactions.push({
                    amount: deduction,
                    date: new Date(),
                    mode: 'Online (Razorpay)',
                    reference: razorpayPaymentId
                });
            }
        };

        if (paymentType === 'college_fee') {
            distributePayment('college', amount); // Update Ledger
            student.collegeFeeDue = Math.max(0, student.collegeFeeDue - amount); // Update Top-level
            await student.save();
            feeTypeLabel = 'College Fee';
        } else if (paymentType === 'transport_fee') {
            distributePayment('transport', amount); // Update Ledger
            student.transportFeeDue = Math.max(0, student.transportFeeDue - amount); // Update Top-level
            await student.save();
            feeTypeLabel = 'Transport Fee';
        } else if (paymentType === 'hostel_fee') {
            distributePayment('hostel', amount);
            student.hostelFeeDue = Math.max(0, student.hostelFeeDue - amount);
            await student.save();
            feeTypeLabel = 'Hostel Fee';
        } else if (paymentType === 'placement_fee') {
            distributePayment('placement', amount);
            student.placementFeeDue = Math.max(0, student.placementFeeDue - amount);
            await student.save();
            feeTypeLabel = 'Placement Fee';
        } else if (paymentType === 'library_fee') {
            distributePayment('library', amount);
            student.libraryFeeDue = Math.max(0, student.libraryFeeDue - amount);
            await student.save();
            feeTypeLabel = 'Library Fee';
        } else if (paymentType === 'other_fee') {
            distributePayment('other', amount);
            student.otherFeeDue = Math.max(0, student.otherFeeDue - amount);
            await student.save();
            feeTypeLabel = 'Other Fee';
        } else if (paymentType === 'exam_fee') {
            feeTypeLabel = 'Exam Fee';
        }

        // Send Email Notification
        try {
            await sendEmail({
                email: student.user.email,
                subject: `Payment Successful - ${feeTypeLabel}`,
                message: `Dear ${student.user.name},\n\nYour payment of ₹${amount} for ${feeTypeLabel} has been successfully received.\n\nTransaction ID: ${razorpayPaymentId}\nDate: ${new Date().toLocaleString()}\n\nThank you,\nCollege Accounts Dept.`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                        <h2 style="color: #4f46e5;">Payment Successful</h2>
                        <p>Dear <strong>${student.user.name}</strong>,</p>
                        <p>Your payment has been successfully received.</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Fee Type:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${feeTypeLabel}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">₹${amount}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Transaction ID:</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${razorpayPaymentId}</td>
                            </tr>
                        </table>
                        <p>Thank you,<br>College Accounts Dept.</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            // Don't fail the request, just log it
        }

        res.json({
            msg: "Payment success",
            paymentId: razorpayPaymentId,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Razorpay Key ID
// @route   GET /api/payments/key
// @access  Private
const getRazorpayKey = async (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
};

// @desc    Get My Payments
// @route   GET /api/payments/my-history
// @access  Private (Student)
const getMyPayments = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user._id });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const payments = await Payment.find({ student: student._id }).sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createOrder, verifyPayment, getRazorpayKey, getMyPayments };

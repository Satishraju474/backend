const mongoose = require('mongoose');

const studentSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    usn: { type: String, required: true, unique: true }, // HT Number / Roll No

    // Academic Details
    department: { type: String, required: true },
    course: { type: String, default: 'B.Tech' },
    currentYear: { type: Number, required: true, min: 1, max: 4 },
    currentSemester: { type: Number, min: 1, max: 8 },
    quota: { type: String, enum: ['government', 'management', 'nri'], required: true },
    entry: { type: String, enum: ['regular', 'lateral'], required: true },
    status: { type: String, enum: ['active', 'detained', 'dropout'], default: 'active' },
    batch: { type: String },              // e.g. "2022-2023"
    admissionNo: { type: String },
    admissionDate: { type: Date },
    admissionType: { type: String },     // CONVENOR / MANAGEMENT

    // Personal Details
    shortName: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    bloodGroup: { type: String },
    motherTongue: { type: String },
    nationality: { type: String, default: 'Indian' },
    religion: { type: String },
    casteCategory: { type: String },     // OC / BC / SC / ST
    casteName: { type: String },

    // Parent / Guardian Details
    fatherName: { type: String },
    fatherOccupation: { type: String },
    fatherMobile: { type: String },
    fatherEmail: { type: String },
    motherName: { type: String },
    motherOccupation: { type: String },
    annualIncome: { type: Number },
    guardianName: { type: String },    // legacy
    guardianPhone: { type: String },   // legacy

    // Contact Details
    studentMobile: { type: String },
    correspondenceAddress: { type: String },
    permanentAddress: { type: String },
    address: { type: String },          // legacy

    // Admission / Test Details
    testName: { type: String },         // EAMCET / JEE
    testRank: { type: Number },

    // Flags
    isLateral: { type: Boolean, default: false },
    isDetainee: { type: Boolean, default: false },
    reimbursement: { type: Boolean, default: false },
    hasScholarship: { type: Boolean, default: false },
    isDiscontinued: { type: Boolean, default: false },

    // Identity Details
    aadharNo: { type: String },
    voterIdNo: { type: String },
    panNo: { type: String },
    rationCardNo: { type: String },

    // Fees Due Status
    transportOpted: { type: Boolean, default: false },
    transportRoute: { type: String, default: '' },
    hostelOpted: { type: Boolean, default: false },
    placementOpted: { type: Boolean, default: false },

    collegeFeeDue: { type: Number, default: 0 },
    transportFeeDue: { type: Number, default: 0 },
    hostelFeeDue: { type: Number, default: 0 },
    placementFeeDue: { type: Number, default: 0 },
    libraryFeeDue: { type: Number, default: 0 },
    otherFeeDue: { type: Number, default: 0 },
    lastSemDues: { type: Number, default: 0 },

    // Persistent Annual Fee Structure
    annualCollegeFee: { type: Number, default: 0 },
    annualTransportFee: { type: Number, default: 0 },
    annualHostelFee: { type: Number, default: 0 },
    annualPlacementFee: { type: Number, default: 0 },

    // Fee Records (Ledger)
    feeRecords: [{
        year: { type: Number, required: true },
        semester: { type: Number, required: true },
        feeType: { type: String, enum: ['college', 'transport', 'other', 'placement', 'hostel', 'library'], required: true },
        amountDue: { type: Number, required: true },
        amountPaid: { type: Number, default: 0 },
        status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
        transactions: [{
            amount: Number,
            date: { type: Date, default: Date.now },
            mode: String,
            reference: String
        }]
    }],

    // Eligibility Override
    eligibilityOverride: { type: Boolean, default: null },

}, { timestamps: true });

studentSchema.index({ user: 1 });
studentSchema.index({ department: 1, currentYear: 1 });
studentSchema.index({ status: 1 });

module.exports = mongoose.model('Student', studentSchema);

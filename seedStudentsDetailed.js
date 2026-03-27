const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Student = require('./models/Student');

dotenv.config();

const dummyStudents = [
    {
        username: '1BV21CS001',
        password: 'Student@123',
        name: 'Alice Kumar',
        email: 'alice@example.com',
        mobile: '9876543210',
        department: 'CSE',
        currentYear: 3,
        quota: 'government',
        entry: 'regular',
        dateOfBirth: new Date('2001-05-15'),
        gender: 'Female',
        address: '123 Main St, Bangalore, Karnataka',
        guardianName: 'Rahul Kumar',
        guardianPhone: '9876543211',
        transportOpted: true,
        transportRoute: 'Route A',
        hostelOpted: true,
        placementOpted: true,
        feeRecords: [
            {
                year: 3,
                semester: 5,
                feeType: 'college',
                amountDue: 50000,
                amountPaid: 25000,
                status: 'partial'
            },
            {
                year: 3,
                semester: 5,
                feeType: 'library',
                amountDue: 2000,
                amountPaid: 2000,
                status: 'paid'
            },
            {
                year: 3,
                semester: 6,
                feeType: 'college',
                amountDue: 50000,
                amountPaid: 0,
                status: 'pending'
            }
        ]
    },
    {
        username: '1BV21EC002',
        password: 'Student@123',
        name: 'Bharath Rao',
        email: 'bharath@example.com',
        mobile: '8876543210',
        department: 'ECE',
        currentYear: 2,
        quota: 'management',
        entry: 'regular',
        dateOfBirth: new Date('2002-08-20'),
        gender: 'Male',
        address: '456 Tech Park, Hyderabad, Telangana',
        guardianName: 'Sanjay Rao',
        guardianPhone: '8876543211',
        feeRecords: [
            {
                year: 2,
                semester: 3,
                feeType: 'college',
                amountDue: 150000,
                amountPaid: 150000,
                status: 'paid'
            },
            {
                year: 2,
                semester: 4,
                feeType: 'college',
                amountDue: 150000,
                amountPaid: 0,
                status: 'pending'
            }
        ]
    },
    {
        username: '1BV20ME003',
        password: 'Student@123',
        name: 'Chaitra N',
        email: 'chaitra@example.com',
        mobile: '7876543210',
        department: 'MECH',
        currentYear: 4,
        quota: 'government',
        entry: 'lateral',
        dateOfBirth: new Date('2000-11-10'),
        gender: 'Female',
        address: '789 MG Road, Mysore, Karnataka',
        guardianName: 'Narayana M',
        guardianPhone: '7876543211',
        feeRecords: [
            {
                year: 4,
                semester: 7,
                feeType: 'college',
                amountDue: 45000,
                amountPaid: 45000,
                status: 'paid'
            },
            {
                year: 4,
                semester: 7,
                feeType: 'placement',
                amountDue: 15000,
                amountPaid: 5000,
                status: 'partial'
            }
        ]
    },
];

const seedStudentsDetailed = async () => {
    try {
        await connectDB();

        for (const stu of dummyStudents) {
            let user = await User.findOne({ username: stu.username });

            if (user) {
                console.log(`Updating existing user ${stu.username}`);
                user.name = stu.name;
                user.email = stu.email;
                user.mobile = stu.mobile;
                await user.save();
            } else {
                user = await User.create({
                    username: stu.username,
                    password: stu.password,
                    name: stu.name,
                    email: stu.email,
                    mobile: stu.mobile,
                    role: 'student',
                });
            }

            let student = await Student.findOne({ usn: stu.username });

            if (student) {
                console.log(`Updating existing student ${stu.username}`);
                student.department = stu.department;
                student.currentYear = stu.currentYear;
                student.quota = stu.quota;
                student.entry = stu.entry;
                student.dateOfBirth = stu.dateOfBirth;
                student.gender = stu.gender;
                student.address = stu.address;
                student.guardianName = stu.guardianName;
                student.guardianPhone = stu.guardianPhone;
                student.transportOpted = stu.transportOpted || false;
                student.transportRoute = stu.transportRoute || '';
                student.hostelOpted = stu.hostelOpted || false;
                student.placementOpted = stu.placementOpted || false;
                student.feeRecords = stu.feeRecords || [];
                await student.save();
            } else {
                await Student.create({
                    user: user._id,
                    usn: stu.username,
                    department: stu.department,
                    currentYear: stu.currentYear,
                    quota: stu.quota,
                    entry: stu.entry,
                    status: 'active',
                    dateOfBirth: stu.dateOfBirth,
                    gender: stu.gender,
                    address: stu.address,
                    guardianName: stu.guardianName,
                    guardianPhone: stu.guardianPhone,
                    transportOpted: stu.transportOpted || false,
                    transportRoute: stu.transportRoute || '',
                    hostelOpted: stu.hostelOpted || false,
                    placementOpted: stu.placementOpted || false,
                    collegeFeeDue: 0,
                    transportFeeDue: 0,
                    hostelFeeDue: 0,
                    placementFeeDue: 0,
                    libraryFeeDue: 0,
                    otherFeeDue: 0,
                    annualCollegeFee: 50000,
                    feeRecords: stu.feeRecords || []
                });
            }

            console.log(`Processed dummy student ${stu.username} (${stu.name})`);
        }

        console.log('Detailed dummy students seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error creating detailed dummy students:', err.message);
        process.exit(1);
    }
};

seedStudentsDetailed();

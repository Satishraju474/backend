const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const importData = async () => {
    try {
        const rolesToReset = [
            'admin',
            'admission_officer',
            'hostel_manager',
            'librarian',
            'placement_officer',
            'transport_dept',
            'registrar',
            'exam_head'
        ];

        // Remove existing users with these roles
        console.log('Removing old administrative users...');
        await User.deleteMany({ role: { $in: rolesToReset } });
        console.log('Old users removed.');

        const newUsers = [
            {
                username: 'admin',
                password: '123',
                role: 'admin',
                name: 'System Admin',
                email: 'admin@college.edu'
            },
            {
                username: 'admission_officer',
                password: '123',
                role: 'admission_officer',
                name: 'Admission Officer',
                email: 'admission@college.edu'
            },
            {
                username: 'hostel_admin',
                password: '123',
                role: 'hostel_manager',
                name: 'Hostel Admin',
                email: 'hostel@college.edu'
            },
            {
                username: 'librarian',
                password: '123',
                role: 'librarian',
                name: 'Librarian',
                email: 'librarian@college.edu'
            },
            {
                username: 'training_dept',
                password: '123',
                role: 'placement_officer',
                name: 'Training Department',
                email: 'training@college.edu'
            },
            {
                username: 'transport',
                password: '123',
                role: 'transport_dept',
                name: 'Transport',
                email: 'transport@college.edu'
            },
            {
                username: 'enrollment_help_desk',
                password: '123',
                role: 'registrar',
                name: 'Student Enrollment Help Desk',
                email: 'enrollment@college.edu'
            },
            {
                username: 'exam_head',
                password: '123',
                role: 'exam_head',
                name: 'Chief of Examinations',
                email: 'examhead@college.edu'
            }
        ];

        // Create new users
        console.log('Creating new administrative users...');
        await User.create(newUsers);
        console.log('New users created successfully.');

        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

importData();

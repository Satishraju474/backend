const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('./models/Student');
const User = require('./models/User'); // Need this to populate
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const checkStudents = async () => {
    try {
        const students = await Student.find({}).populate('user');
        console.log(`Found ${students.length} students.`);
        for (const s of students) {
            console.log(`- USN: ${s.usn}`);
            if (s.user) {
                console.log(`  User: ${s.user.username} (${s.user.role})`);
            } else {
                console.log(`  User: NULL (Orphaned Student Record)`);
            }
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkStudents();

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
    department: 'CSE',
    currentYear: 3,
    quota: 'government',
    entry: 'regular',
  },
  {
    username: '1BV21EC002',
    password: 'Student@123',
    name: 'Bharath Rao',
    email: 'bharath@example.com',
    department: 'ECE',
    currentYear: 2,
    quota: 'management',
    entry: 'regular',
  },
  {
    username: '1BV20ME003',
    password: 'Student@123',
    name: 'Chaitra N',
    email: 'chaitra@example.com',
    department: 'MECH',
    currentYear: 4,
    quota: 'government',
    entry: 'lateral',
  },
];

const seedStudents = async () => {
  try {
    await connectDB();

    for (const stu of dummyStudents) {
      const existingUser = await User.findOne({ username: stu.username });
      if (existingUser) {
        console.log(`Skipping ${stu.username} - user already exists`);
        continue;
      }

      const user = await User.create({
        username: stu.username,
        password: stu.password,
        name: stu.name,
        email: stu.email,
        role: 'student',
      });

      await Student.create({
        user: user._id,
        usn: stu.username,
        department: stu.department,
        currentYear: stu.currentYear,
        quota: stu.quota,
        entry: stu.entry,
        status: 'active',
        transportOpted: false,
        hostelOpted: false,
        placementOpted: false,
        collegeFeeDue: 0,
        transportFeeDue: 0,
        hostelFeeDue: 0,
        placementFeeDue: 0,
        libraryFeeDue: 0,
        otherFeeDue: 0,
        annualCollegeFee: 50000,
      });

      console.log(`Created dummy student ${stu.username} (${stu.name})`);
    }

    console.log('Dummy students seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating dummy students:', err.message);
    process.exit(1);
  }
};

seedStudents();


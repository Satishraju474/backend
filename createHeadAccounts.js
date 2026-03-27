const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');

dotenv.config();

const headUsers = [
  {
    username: 'admin',
    password: 'Admin@123',
    role: 'admin',
    name: 'System Administrator',
    email: 'admin@example.com',
  },
  {
    username: 'principal',
    password: 'Principal@123',
    role: 'principal',
    name: 'Principal',
    email: 'principal@example.com',
  },
  {
    username: 'examhead',
    password: 'ExamHead@123',
    role: 'exam_head',
    name: 'Exam Section Head',
    email: 'examhead@example.com',
  },
  {
    username: 'transport',
    password: 'Transport@123',
    role: 'transport_dept',
    name: 'Transport Department Head',
    email: 'transport@example.com',
  },
  {
    username: 'registrar',
    password: 'Registrar@123',
    role: 'registrar',
    name: 'Registrar',
    email: 'registrar@example.com',
  },
  {
    username: 'librarian',
    password: 'Librarian@123',
    role: 'librarian',
    name: 'Chief Librarian',
    email: 'librarian@example.com',
  },
  {
    username: 'admission',
    password: 'Admission@123',
    role: 'admission_officer',
    name: 'Admission Officer',
    email: 'admission@example.com',
  },
  {
    username: 'placement',
    password: 'Placement@123',
    role: 'placement_officer',
    name: 'Placement Officer',
    email: 'placement@example.com',
  },
  {
    username: 'hostel',
    password: 'Hostel@123',
    role: 'hostel_manager',
    name: 'Hostel Manager',
    email: 'hostel@example.com',
  },
];

const createHeadAccounts = async () => {
  try {
    await connectDB();

    for (const head of headUsers) {
      const existing = await User.findOne({ username: head.username });
      if (existing) {
        console.log(`Skipping ${head.username} (${head.role}) - already exists`);
        continue;
      }

      await User.create(head);
      console.log(`Created ${head.username} (${head.role})`);
    }

    console.log('Head accounts seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating head accounts:', err.message);
    process.exit(1);
  }
};

createHeadAccounts();


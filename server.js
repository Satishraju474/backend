const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Add this line
// const principalRoutes = require('./routes/principalRoutes'); // Disabled - File not found
const examHeadRoutes = require('./routes/examHeadRoutes'); // Mount
const transportRoutes = require('./routes/transportRoutes'); // Add this
const registrarRoutes = require('./routes/registrarRoutes');
const librarianRoutes = require('./routes/libraryRoutes'); // Fixed to libraryRoutes
const uploadRoutes = require('./routes/uploadRoutes');
const studentRoutes = require('./routes/studentRoutes'); // Added
const paymentRoutes = require('./routes/paymentRoutes'); // Added
const admissionRoutes = require('./routes/admissionRoutes');
const placementRoutes = require('./routes/placementRoutes');
const hostelRoutes = require('./routes/hostelRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); // Mount
// app.use('/api/principal', principalRoutes);
app.use('/api/exam-head', examHeadRoutes); // Mount
app.use('/api/transport', transportRoutes); // Mount
app.use('/api/registrar', registrarRoutes);
app.use('/api/librarian', librarianRoutes);
app.use('/api/library', librarianRoutes); // Alias for Student Dashboard compatibility
app.use('/api/students', studentRoutes); // Mounted
app.use('/api/payments', paymentRoutes); // Mounted
app.use('/api/admission', admissionRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/hostel', hostelRoutes);
app.use('/api', uploadRoutes);

// SERVE STATIC FILES (Images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

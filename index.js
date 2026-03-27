const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
// const mongoSanitize = require('express-mongo-sanitize'); // Disabled due to Express 5 compatibility issue
// const xss = require('xss-clean'); // Disabled due to Express 5 compatibility issue
const hpp = require('hpp');
const compression = require('compression');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Security Headers
app.use(helmet({
    crossOriginResourcePolicy: false,
}));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined')); // detailed logs for production
}

// Body Parser
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS

// Sanitize Data
// NOTE: express-mongo-sanitize & xss-clean currently conflict with Express 5 (req.query is read-only).
// If needed later, re-enable with compatible versions or custom middleware.
// app.use(mongoSanitize()); // Prevent NoSQL injection
// app.use(xss()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Enable CORS (explicitly allow Vite dev origin)
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Extra CORS headers + handle OPTIONS quickly
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// Compression
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 10 minutes'
});
app.use('/api', limiter);

// Debug Middleware (Optional, can be removed in strict production)
app.use((req, res, next) => {
    // Keep this for now as per previous logic, but Morgan handles most logging
    // console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`); 
    next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/transport', require('./routes/transportRoutes'));
app.use('/api/registrar', require('./routes/registrarRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/library', require('./routes/libraryRoutes'));
app.use('/api/librarian', require('./routes/libraryRoutes')); // Alias
app.use('/api/placement', require('./routes/placementRoutes'));
app.use('/api/hostel', require('./routes/hostelRoutes'));
app.use('/api/admission', require('./routes/admissionRoutes'));
app.use('/api/exam-head', require('./routes/examHeadRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// Make uploads folder static
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Base Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Server Error'
    });
});

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});

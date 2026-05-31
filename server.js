// ============================================================
// FILE: backend/server.js
// PURPOSE: Main entry point - starts the Express web server
// ============================================================
//
// WHAT IS EXPRESS?
// Express is a Node.js framework that makes it easy to:
// - Create a web server
// - Define routes (URLs your server responds to)
// - Handle HTTP requests and send responses
//
// WHAT HAPPENS WHEN server.js RUNS?
// 1. Load environment variables from .env file
// 2. Connect to MongoDB database
// 3. Configure Express with middleware
// 4. Register all routes
// 5. Start listening for requests on a port
//
// ============================================================

// Load environment variables FIRST (before anything else)
// This reads the .env file and makes values available via process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');           // Allows frontend to make requests to backend
const connectDB = require('./config/database');

// Import route files
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ============================================================
// CONNECT TO DATABASE
// ============================================================
connectDB();

// ============================================================
// CREATE EXPRESS APP
// ============================================================
const app = express();

// ============================================================
// MIDDLEWARE SETUP
// Middleware runs for every request before hitting routes
// ============================================================

// CORS - Cross-Origin Resource Sharing
// This allows your frontend (running on a different port/domain)
// to make API calls to your backend.
// Without CORS, the browser would block these requests for security.
app.use(cors({
  origin: [
    'http://localhost:3000',      // If you use a development server
    'http://localhost:5000',
    'http://127.0.0.1:5500',      // VS Code Live Server
    'http://localhost:5500',
    'https://student-portal-frontend-qg6f.onrender.com',
    // Add your deployed frontend URL here when you deploy
    // 'https://your-app.netlify.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  // Allow all origins for development (remove in production!)
  optionsSuccessStatus: 200,
}));

// For development, allow all origins
// REMOVE THIS IN PRODUCTION and use specific origins above
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// express.json() - Parses incoming requests with JSON body
// Without this, req.body would be undefined
// When frontend sends JSON data, this converts it to a JavaScript object
app.use(express.json({ limit: '10kb' })); // Limit body size to 10kb (security)

// express.urlencoded() - Parses form data
app.use(express.urlencoded({ extended: true }));

// ============================================================
// ROUTES
// Tell Express which router to use for which URL prefix
// ============================================================

// Health check route - useful to test if server is running
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 Student Attendance API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      attendance: '/api/attendance',
      admin: '/api/admin',
    },
  });
});

// Mount routes with their URL prefixes:
// Any request to /api/auth/* goes to authRoutes
// Any request to /api/attendance/* goes to attendanceRoutes
// Any request to /api/admin/* goes to adminRoutes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);

// ============================================================
// 404 HANDLER - Route not found
// This catches any URL that didn't match any route above
// ============================================================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`,
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// Catches any unhandled errors and sends a clean response
// ============================================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST http://localhost:${PORT}/api/auth/signup`);
  console.log(`  POST http://localhost:${PORT}/api/auth/login`);
  console.log(`  GET  http://localhost:${PORT}/api/auth/me`);
  console.log(`  GET  http://localhost:${PORT}/api/attendance/my`);
  console.log(`  POST http://localhost:${PORT}/api/admin/login`);
  console.log(`  GET  http://localhost:${PORT}/api/admin/students`);
  console.log(`\n✅ Ready to accept requests!\n`);
});

// Handle uncaught promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server gracefully
  process.exit(1);
});

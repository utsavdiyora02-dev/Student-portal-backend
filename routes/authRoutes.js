// ============================================================
// FILE: backend/routes/authRoutes.js
// PURPOSE: Handles Student Sign Up, Sign In, and profile
// ============================================================
//
// WHAT ARE ROUTES?
// Routes define what happens when someone visits a URL.
// For example:
// POST /api/auth/signup → Create a new student account
// POST /api/auth/login  → Log in and get a token
// GET  /api/auth/me     → Get current student's profile
//
// HTTP Methods:
// GET    = Read data (like opening a webpage)
// POST   = Send/create data (like submitting a form)
// PUT    = Update data
// DELETE = Delete data
//
// ============================================================

const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

const router = express.Router(); // Create a router - a mini app for these routes

// ============================================================
// HELPER FUNCTION: Create and send JWT token
// This is called after successful login/signup
// ============================================================
const sendTokenResponse = (student, statusCode, res) => {
  // Create JWT payload - what information to store in the token
  const payload = {
    id: student._id,    // Student's unique database ID
    role: 'student',    // Role type
  };

  // Sign the token with our secret key
  // It will expire after JWT_EXPIRES_IN (e.g., "7d" = 7 days)
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  // Send the response with token and student data
  res.status(statusCode).json({
    success: true,
    token, // The JWT token - frontend will store this
    student: {
      id: student._id,
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
      class: student.class,
      subjects: student.subjects,
    },
  });
};

// ============================================================
// ROUTE: POST /api/auth/signup
// PURPOSE: Register a new student account
// ============================================================
router.post('/signup', async (req, res) => {
  try {
    // Destructure (extract) data from request body
    // req.body contains the JSON data sent from the frontend form
    const { name, email, password, rollNumber, class: studentClass, subjects } = req.body;

    // --- Validation: Check required fields ---
    if (!name || !email || !password || !rollNumber || !studentClass) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, rollNumber, class',
      });
    }

    // --- Check if email already exists ---
    const existingEmail = await Student.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // --- Check if roll number already exists ---
    const existingRoll = await Student.findOne({ rollNumber });
    if (existingRoll) {
      return res.status(400).json({
        success: false,
        message: 'This roll number is already registered.',
      });
    }

    // --- Create the new student in database ---
    // Note: password will be automatically hashed by the pre-save middleware
    // we defined in the Student model!
    const student = await Student.create({
      name,
      email,
      password,
      rollNumber,
      class: studentClass,
      // Use provided subjects or default subjects
      subjects: subjects || [
        { name: 'Mathematics', code: 'MATH101' },
        { name: 'Physics', code: 'PHY101' },
        { name: 'Chemistry', code: 'CHEM101' },
      ],
    });

    console.log(`✅ New student registered: ${student.name} (${student.email})`);

    // Send success response with token
    sendTokenResponse(student, 201, res); // 201 = "Created"
  } catch (error) {
    console.error('Signup error:', error);

    // Handle duplicate key errors from MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Roll number'} already exists.`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.',
    });
  }
});

// ============================================================
// ROUTE: POST /api/auth/login
// PURPOSE: Log in with email and password
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password were provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    // Find student by email
    // .select('+password') explicitly includes password field
    // (we set select: false in the model for security)
    const student = await Student.findOne({ email: email.toLowerCase() }).select('+password');

    // If no student found with that email
    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.', // Don't say "email not found" - security best practice
      });
    }

    // Check if account is active
    if (!student.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin.',
      });
    }

    // Compare the provided password with the hashed password in database
    const isPasswordCorrect = await student.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    console.log(`✅ Student logged in: ${student.name}`);
    sendTokenResponse(student, 200, res); // 200 = "OK"
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.',
    });
  }
});

// ============================================================
// ROUTE: GET /api/auth/me
// PURPOSE: Get current logged-in student's profile
// This route is PROTECTED - requires valid JWT token
// ============================================================
router.get('/me', protect, async (req, res) => {
  // req.user is attached by the protect middleware
  // It already contains the student's data from database
  try {
    const student = await Student.findById(req.user._id);

    res.status(200).json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        class: student.class,
        subjects: student.subjects,
        profilePicture: student.profilePicture,
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile.' });
  }
});

// ============================================================
// ROUTE: PUT /api/auth/change-password
// PURPOSE: Change student's password
// ============================================================
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    // Get student with password field
    const student = await Student.findById(req.user._id).select('+password');

    // Verify current password
    const isCorrect = await student.comparePassword(currentPassword);
    if (!isCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Update password - the pre-save hook will hash it automatically
    student.password = newPassword;
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error changing password.' });
  }
});

module.exports = router;

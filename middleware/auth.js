// ============================================================
// FILE: backend/middleware/auth.js
// PURPOSE: Middleware to verify JWT tokens and protect routes
// ============================================================
//
// WHAT IS MIDDLEWARE?
// Middleware is code that runs BETWEEN receiving a request and
// sending a response. Think of it as a security guard at a door:
//
// Request → [Middleware checks token] → Route Handler → Response
//
// If the token is valid: let them through ✅
// If the token is invalid: reject them ❌
//
// WHAT IS JWT (JSON Web Token)?
// When a user logs in, the server creates a "token" - a special
// string that proves who they are. Like a concert wristband.
// The user sends this token with every future request.
// The server checks the token to know who is asking.
//
// JWT looks like: xxxxx.yyyyy.zzzzz
// (3 parts separated by dots, each Base64 encoded)
//
// ============================================================

const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

// ============================================================
// MIDDLEWARE: Protect Student Routes
// This runs before any protected student route
// ============================================================
const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in the Authorization header
    // Format: "Authorization: Bearer xxxxx.yyyyy.zzzzz"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Extract just the token part (after "Bearer ")
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token found, deny access
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in first.',
      });
    }

    // Verify the token is valid and not expired
    // jwt.verify() decodes the token and checks the signature
    // If it's tampered with or expired, it throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Decoded contains what we stored when creating the token
    // In our case: { id: student._id, role: 'student' }

    // Find the student in the database using the ID from the token
    const student = await Student.findById(decoded.id);

    // If student doesn't exist anymore (deleted), deny access
    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'The account belonging to this token no longer exists.',
      });
    }

    // Check if account is active
    if (!student.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Contact admin.',
      });
    }

    // Attach the student data to the request object
    // This makes it available in the next route handler
    // Example: req.user._id, req.user.name
    req.user = student;
    req.userRole = 'student';

    next(); // Move on to the actual route handler
  } catch (error) {
    // Token is invalid, expired, or malformed
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
    });
  }
};

// ============================================================
// MIDDLEWARE: Protect Admin Routes
// Admin has a separate simple token for security
// ============================================================
const adminProtect = (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Admin access denied. Please log in.',
      });
    }

    // Verify the admin token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this is actually an admin token
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Admin privileges required.',
      });
    }

    // Attach admin info to request
    req.admin = decoded;
    req.userRole = 'admin';

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token.',
    });
  }
};

// Export both middleware functions
module.exports = { protect, adminProtect };

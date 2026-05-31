// ============================================================
// FILE: backend/models/Student.js
// PURPOSE: Defines the shape/structure of Student data in MongoDB
// ============================================================
//
// WHAT IS A "MODEL" OR "SCHEMA"?
// Think of a Schema like a blueprint or a form template.
// It says: "Every student document in the database MUST have
// these fields, and they MUST be these types."
//
// For example: every student must have a name (String),
// an email (String), a password (String), etc.
//
// MongoDB stores data as "documents" (like JSON objects).
// Mongoose Schema defines what those documents look like.
//
// ============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Library for hashing passwords securely

// Define what a Student looks like in the database
const studentSchema = new mongoose.Schema(
  {
    // Student's full name
    name: {
      type: String,       // Must be text
      required: [true, 'Name is required'],  // Cannot be empty
      trim: true,         // Removes extra spaces from beginning/end
    },

    // Student's email - used for login
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,       // No two students can have the same email
      lowercase: true,    // Always store as lowercase
      trim: true,
      // Validate that it looks like an email address
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },

    // Student's password - will be hashed (encrypted) before saving
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in query results by default (security!)
    },

    // Student's roll number (like a student ID)
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
    },

    // Which class/year the student is in
    class: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
    },

    // List of subjects the student is enrolled in
    // Each subject is an object with name and code
    subjects: [
      {
        name: {
          type: String,
          required: true,
        },
        code: {
          type: String,
          required: true,
        },
      },
    ],

    // Profile picture URL (optional)
    profilePicture: {
      type: String,
      default: '', // Empty string by default
    },

    // Whether this account is active or deactivated by admin
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    // This option automatically adds two fields:
    // createdAt: when the student registered
    // updatedAt: when the record was last updated
    timestamps: true,
  }
);

// ============================================================
// MIDDLEWARE: Hash password before saving
// ============================================================
// This function runs automatically BEFORE saving a student to DB.
// It encrypts the password so we never store plain text passwords.
//
// WHY HASH PASSWORDS?
// If someone hacks your database, they'll only see random
// encrypted strings like "$2a$10$xyz..." instead of real passwords.
// This protects your users even if data is stolen.
// ============================================================

studentSchema.pre('save', async function (next) {
  // Only hash if password was actually changed (don't re-hash on other updates)
  if (!this.isModified('password')) return next();

  // bcrypt.hash() encrypts the password
  // 12 is the "salt rounds" - higher = more secure but slower
  this.password = await bcrypt.hash(this.password, 12);
  next(); // Continue saving
});

// ============================================================
// METHOD: Compare entered password with stored hash
// ============================================================
// This method is called during login to check if the
// password the user typed matches the stored hashed password.
// ============================================================

studentSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare() checks if candidatePassword (what user typed)
  // matches this.password (hashed password in database)
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create and export the Student model
// mongoose.model('Student', studentSchema) creates a "Student" collection in MongoDB
const Student = mongoose.model('Student', studentSchema);
module.exports = Student;

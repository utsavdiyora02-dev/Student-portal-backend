// ============================================================
// FILE: backend/models/Attendance.js
// PURPOSE: Defines the structure of Attendance records in MongoDB
// ============================================================
//
// RELATIONSHIP BETWEEN MODELS:
// - One Student can have MANY Attendance records
// - Each Attendance record belongs to ONE Student
// - We link them using the student's ID (called a "reference" or "ref")
//
// Think of it like this:
// Student Table: [ {_id: "abc123", name: "John"} ]
// Attendance Table: [ {studentId: "abc123", subject: "Math", date: "2024-01-15", status: "present"} ]
//
// ============================================================

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    // Which student this attendance record belongs to
    // mongoose.Schema.Types.ObjectId is MongoDB's unique ID type
    // ref: 'Student' means this links to the Student model
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',   // This creates a relationship with the Student collection
      required: [true, 'Student reference is required'],
    },

    // Which subject this attendance is for
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },

    // Subject code (like "MATH101", "PHY201")
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
    },

    // The date this attendance was taken
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },

    // Was the student present or absent?
    status: {
      type: String,
      enum: ['present', 'absent', 'late'], // Only these 3 values are allowed
      required: [true, 'Status is required'],
    },

    // Which admin/teacher marked this attendance
    markedBy: {
      type: String,
      default: 'Admin',
    },

    // Optional notes (e.g., "Medical leave", "Holiday")
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ============================================================
// DATABASE INDEX: Speed up searches
// ============================================================
// An index is like a book's index - it makes finding data faster.
// We create a compound index on student + subject + date
// because we often search attendance by these three fields.
// ============================================================
attendanceSchema.index({ student: 1, subject: 1, date: 1 });
attendanceSchema.index({ student: 1, date: -1 }); // -1 means descending (newest first)

// ============================================================
// STATIC METHOD: Calculate attendance percentage for a student
// ============================================================
// Static methods are called on the MODEL itself (not an instance).
// Example: Attendance.calculatePercentage(studentId, subjectCode)
// ============================================================

attendanceSchema.statics.calculatePercentage = async function (studentId, subjectCode) {
  // MongoDB aggregation pipeline to calculate statistics
  // Think of it as a series of steps that transform data
  const result = await this.aggregate([
    {
      // Step 1: Filter - only get records for this student and subject
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        subjectCode: subjectCode,
      },
    },
    {
      // Step 2: Group - calculate totals
      $group: {
        _id: null, // Group everything together
        totalClasses: { $sum: 1 }, // Count total attendance records
        presentCount: {
          // Count how many times status is 'present' or 'late'
          $sum: {
            $cond: [
              { $in: ['$status', ['present', 'late']] },
              1, // Add 1 if present/late
              0, // Add 0 if absent
            ],
          },
        },
      },
    },
  ]);

  // If no records found, return 0%
  if (result.length === 0) {
    return { totalClasses: 0, presentCount: 0, percentage: 0 };
  }

  const { totalClasses, presentCount } = result[0];
  // Calculate percentage: (present/total) * 100, rounded to 1 decimal
  const percentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100 * 10) / 10 : 0;

  return { totalClasses, presentCount, percentage };
};

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;

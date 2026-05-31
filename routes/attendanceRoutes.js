// ============================================================
// FILE: backend/routes/attendanceRoutes.js
// PURPOSE: Handles attendance viewing for students
// ============================================================

const express = require('express');
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes here require the student to be logged in
// We apply the 'protect' middleware to all routes using router.use()
router.use(protect);

// ============================================================
// ROUTE: GET /api/attendance/my
// PURPOSE: Get all attendance records for the logged-in student
// ============================================================
router.get('/my', async (req, res) => {
  try {
    // req.user._id is the logged-in student's ID (set by protect middleware)
    const studentId = req.user._id;

    // Find all attendance records for this student
    // .sort({ date: -1 }) = sort by date, newest first
    const records = await Attendance.find({ student: studentId }).sort({ date: -1 });

    // Group records by subject for easier display
    // We'll calculate stats per subject
    const subjectMap = {};

    records.forEach((record) => {
      const key = record.subjectCode;

      // Initialize subject entry if not exists
      if (!subjectMap[key]) {
        subjectMap[key] = {
          subject: record.subject,
          subjectCode: record.subjectCode,
          totalClasses: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          records: [],
        };
      }

      // Update counters
      subjectMap[key].totalClasses++;
      if (record.status === 'present') subjectMap[key].presentCount++;
      else if (record.status === 'absent') subjectMap[key].absentCount++;
      else if (record.status === 'late') subjectMap[key].lateCount++;

      // Add individual record
      subjectMap[key].records.push({
        date: record.date,
        status: record.status,
        remarks: record.remarks,
      });
    });

    // Convert the map to an array and calculate percentages
    const subjectWiseAttendance = Object.values(subjectMap).map((subject) => {
      const attended = subject.presentCount + subject.lateCount; // Late counts as attended
      const percentage =
        subject.totalClasses > 0
          ? Math.round((attended / subject.totalClasses) * 100 * 10) / 10
          : 0;

      return {
        ...subject,
        attendedClasses: attended,
        percentage,
        // Color coding based on percentage
        status:
          percentage >= 75 ? 'good' : percentage >= 60 ? 'warning' : 'danger',
      };
    });

    // Calculate overall attendance across all subjects
    const totalClasses = records.length;
    const totalPresent = records.filter((r) => r.status === 'present' || r.status === 'late').length;
    const overallPercentage =
      totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100 * 10) / 10 : 0;

    res.status(200).json({
      success: true,
      data: {
        subjectWiseAttendance,
        overall: {
          totalClasses,
          totalPresent,
          overallPercentage,
        },
        totalRecords: records.length,
      },
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records.',
    });
  }
});

// ============================================================
// ROUTE: GET /api/attendance/summary
// PURPOSE: Get quick attendance summary (for dashboard)
// ============================================================
router.get('/summary', async (req, res) => {
  try {
    const studentId = req.user._id;
    const subjects = req.user.subjects;

    const summaryPromises = subjects.map(async (subject) => {
      const stats = await Attendance.calculatePercentage(studentId, subject.code);
      return {
        subject: subject.name,
        subjectCode: subject.code,
        ...stats,
      };
    });

    const summary = await Promise.all(summaryPromises);

    // Calculate overall
    const totalClasses = summary.reduce((sum, s) => sum + s.totalClasses, 0);
    const totalPresent = summary.reduce((sum, s) => sum + s.presentCount, 0);
    const overallPercentage =
      totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100 * 10) / 10 : 0;

    res.status(200).json({
      success: true,
      data: {
        subjects: summary,
        overall: {
          totalClasses,
          totalPresent,
          overallPercentage,
          subjectsEnrolled: subjects.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching summary.' });
  }
});

module.exports = router;

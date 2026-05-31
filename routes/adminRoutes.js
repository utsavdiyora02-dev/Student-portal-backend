// ============================================================
// FILE: backend/routes/adminRoutes.js
// PURPOSE: Admin panel - manage students and attendance
// ============================================================
//
// ADMIN CAPABILITIES:
// - Login with admin credentials
// - View all students
// - Add new students
// - Edit student details
// - Delete students
// - Mark attendance for any student
// - View attendance reports
//
// ALL routes (except /login) are protected by adminProtect middleware
// ============================================================

const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { adminProtect } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ROUTE: POST /api/admin/login
// PURPOSE: Admin login - returns JWT token for admin
// ============================================================
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    // Check credentials against environment variables
    // In production, you'd store admin in a separate collection with hashed password
    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials.',
      });
    }

    // Create admin JWT token
    const token = jwt.sign(
      {
        id: 'admin',
        role: 'admin',      // This marks it as an admin token
        username: username,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // Admin sessions expire in 8 hours
    );

    console.log(`✅ Admin logged in: ${username}`);

    res.status(200).json({
      success: true,
      token,
      admin: { username, role: 'admin' },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Admin login failed.' });
  }
});

// ============================================================
// Apply adminProtect to ALL routes below this line
// Any route defined after this requires admin token
// ============================================================
router.use(adminProtect);

// ============================================================
// STUDENT MANAGEMENT ROUTES
// ============================================================

// GET /api/admin/students - Get all students
router.get('/students', async (req, res) => {
  try {
    // Find all students, exclude password field
    // .lean() returns plain JS objects instead of Mongoose documents (faster)
    const students = await Student.find({}).select('-password').lean();

    // For each student, calculate their overall attendance percentage
    const studentsWithAttendance = await Promise.all(
      students.map(async (student) => {
        const records = await Attendance.find({ student: student._id });
        const total = records.length;
        const present = records.filter(
          (r) => r.status === 'present' || r.status === 'late'
        ).length;
        const overallPercentage =
          total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          ...student,
          attendanceStats: { total, present, overallPercentage },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: students.length,
      students: studentsWithAttendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching students.' });
  }
});

// GET /api/admin/students/:id - Get one student by ID
router.get('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-password');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.status(200).json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching student.' });
  }
});

// POST /api/admin/students - Add a new student (by admin)
router.post('/students', async (req, res) => {
  try {
    const { name, email, password, rollNumber, class: studentClass, subjects } = req.body;

    if (!name || !email || !password || !rollNumber || !studentClass) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, rollNumber, and class.',
      });
    }

    // Check for duplicates
    const exists = await Student.findOne({
      $or: [{ email: email.toLowerCase() }, { rollNumber }],
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Email or roll number already exists.',
      });
    }

    const student = await Student.create({
      name,
      email,
      password, // Will be hashed by pre-save middleware
      rollNumber,
      class: studentClass,
      subjects: subjects || [
        { name: 'Mathematics', code: 'MATH101' },
        { name: 'Physics', code: 'PHY101' },
        { name: 'Chemistry', code: 'CHEM101' },
      ],
    });

    // Don't return password in response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.status(201).json({
      success: true,
      message: 'Student created successfully.',
      student: studentResponse,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email or roll number already exists.' });
    }
    res.status(500).json({ success: false, message: 'Error creating student.' });
  }
});

// PUT /api/admin/students/:id - Update a student
router.put('/students/:id', async (req, res) => {
  try {
    const { name, email, rollNumber, class: studentClass, subjects, isActive } = req.body;

    // Find and update the student
    // { new: true } returns the updated document
    // { runValidators: true } runs schema validations on update
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { name, email, rollNumber, class: studentClass, subjects, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Student updated successfully.',
      student,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating student.' });
  }
});

// DELETE /api/admin/students/:id - Delete a student
router.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Also delete all attendance records for this student
    await Attendance.deleteMany({ student: req.params.id });

    res.status(200).json({
      success: true,
      message: `Student "${student.name}" and all their attendance records deleted.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting student.' });
  }
});

// ============================================================
// ATTENDANCE MANAGEMENT ROUTES
// ============================================================

// POST /api/admin/attendance - Mark attendance for a student
router.post('/attendance', async (req, res) => {
  try {
    const { studentId, subject, subjectCode, date, status, remarks } = req.body;

    if (!studentId || !subject || !subjectCode || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide studentId, subject, subjectCode, date, and status.',
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Check if attendance already marked for this date and subject
    const existingRecord = await Attendance.findOne({
      student: studentId,
      subjectCode,
      date: new Date(date),
    });

    if (existingRecord) {
      // Update existing record instead of creating duplicate
      existingRecord.status = status;
      existingRecord.remarks = remarks || '';
      existingRecord.markedBy = req.admin.username;
      await existingRecord.save();

      return res.status(200).json({
        success: true,
        message: 'Attendance updated.',
        attendance: existingRecord,
      });
    }

    // Create new attendance record
    const attendance = await Attendance.create({
      student: studentId,
      subject,
      subjectCode,
      date: new Date(date),
      status,
      remarks: remarks || '',
      markedBy: req.admin.username,
    });

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully.',
      attendance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error marking attendance.' });
  }
});

// POST /api/admin/attendance/bulk - Mark attendance for multiple students at once
router.post('/attendance/bulk', async (req, res) => {
  try {
    // attendanceData is an array of attendance records
    // Example: [{ studentId, subject, subjectCode, date, status }, ...]
    const { attendanceData } = req.body;

    if (!attendanceData || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of attendance records.',
      });
    }

    const results = { success: [], failed: [] };

    // Process each attendance record
    for (const record of attendanceData) {
      try {
        const { studentId, subject, subjectCode, date, status } = record;

        // Check for existing record (upsert = update if exists, insert if not)
        await Attendance.findOneAndUpdate(
          { student: studentId, subjectCode, date: new Date(date) },
          { student: studentId, subject, subjectCode, date: new Date(date), status, markedBy: req.admin.username },
          { upsert: true, new: true } // upsert: create if doesn't exist
        );

        results.success.push(studentId);
      } catch (err) {
        results.failed.push({ studentId: record.studentId, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${results.success.length} records. ${results.failed.length} failed.`,
      results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing bulk attendance.' });
  }
});

// GET /api/admin/attendance/:studentId - Get attendance report for one student
router.get('/attendance/:studentId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).select('-password');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const records = await Attendance.find({ student: req.params.studentId }).sort({ date: -1 });

    // Group by subject
    const subjectMap = {};
    records.forEach((record) => {
      if (!subjectMap[record.subjectCode]) {
        subjectMap[record.subjectCode] = {
          subject: record.subject,
          subjectCode: record.subjectCode,
          totalClasses: 0,
          presentCount: 0,
          absentCount: 0,
          records: [],
        };
      }
      subjectMap[record.subjectCode].totalClasses++;
      if (record.status === 'present' || record.status === 'late') {
        subjectMap[record.subjectCode].presentCount++;
      } else {
        subjectMap[record.subjectCode].absentCount++;
      }
      subjectMap[record.subjectCode].records.push(record);
    });

    const subjectStats = Object.values(subjectMap).map((s) => ({
      ...s,
      percentage:
        s.totalClasses > 0 ? Math.round((s.presentCount / s.totalClasses) * 100) : 0,
    }));

    res.status(200).json({
      success: true,
      student,
      attendanceReport: {
        subjectStats,
        totalRecords: records.length,
        recentRecords: records.slice(0, 20), // Last 20 records
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching attendance report.' });
  }
});

// GET /api/admin/dashboard - Admin dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ isActive: true });
    const totalAttendanceRecords = await Attendance.countDocuments();

    // Today's attendance count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        totalAttendanceRecords,
        todayAttendance,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats.' });
  }
});

module.exports = router;

// ============================================================
// FILE: frontend/js/api.js
// PURPOSE: All functions that communicate with the backend API
// ============================================================
//
// WHAT IS AN API CALL?
// When your frontend needs data (like student attendance),
// it sends an HTTP request to the backend.
// This file contains all those "fetch" calls in one place.
//
// WHY ONE FILE?
// If your backend URL changes (e.g., when you deploy),
// you only need to change ONE line here (API_BASE_URL).
//
// HOW DOES fetch() WORK?
// fetch(url, options) sends an HTTP request and returns a Promise.
// A Promise is JavaScript's way of handling async operations.
// We use async/await to make it read like normal code.
//
// ============================================================

// ============================================================
// CHANGE THIS URL TO YOUR DEPLOYED BACKEND URL WHEN DEPLOYING!
// ============================================================
const API_BASE_URL = "https://student-portal-backend-e7nd.onrender.com";

// ============================================================
// TOKEN MANAGEMENT
// The JWT token is stored in localStorage (browser storage)
// This persists across page refreshes.
// ============================================================

const TokenManager = {
  // Save token to localStorage
  save: (token, role = 'student') => {
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role);
  },

  // Get token from localStorage
  get: () => localStorage.getItem('token'),

  // Get user role
  getRole: () => localStorage.getItem('userRole'),

  // Remove token (logout)
  remove: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('studentData');
    localStorage.removeItem('adminData');
  },

  // Check if user is logged in
  isLoggedIn: () => !!localStorage.getItem('token'),
};

// ============================================================
// CORE HTTP REQUEST FUNCTION
// All API calls use this function to avoid repeating code
// ============================================================
async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  // Build headers (metadata about our request)
  const headers = {
    'Content-Type': 'application/json', // Tell server we're sending JSON
  };

  // Add authorization header if token exists
  const authToken = token || TokenManager.get();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`; // "Bearer " prefix is standard
  }

  // Build request options
  const options = {
    method,
    headers,
  };

  // Add body for POST/PUT requests (only if there's data to send)
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body); // Convert JS object to JSON string
  }

  // Make the actual HTTP request
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  // Parse the JSON response body
  const data = await response.json();

  // If response is not OK (status 200-299), throw an error
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// ============================================================
// AUTH API FUNCTIONS
// ============================================================

const AuthAPI = {
  // Sign up a new student
  signup: (userData) => apiRequest('/auth/signup', 'POST', userData),

  // Log in
  login: (credentials) => apiRequest('/auth/login', 'POST', credentials),

  // Get current user's profile
  getMe: () => apiRequest('/auth/me'),

  // Change password
  changePassword: (passwords) => apiRequest('/auth/change-password', 'PUT', passwords),
};

// ============================================================
// ATTENDANCE API FUNCTIONS
// ============================================================

const AttendanceAPI = {
  // Get all attendance for logged-in student
  getMyAttendance: () => apiRequest('/attendance/my'),

  // Get quick summary for dashboard
  getSummary: () => apiRequest('/attendance/summary'),
};

// ============================================================
// ADMIN API FUNCTIONS
// ============================================================

const AdminAPI = {
  // Admin login
  login: (credentials) => apiRequest('/admin/login', 'POST', credentials),

  // Dashboard stats
  getDashboard: () => apiRequest('/admin/dashboard'),

  // Student CRUD
  getAllStudents: () => apiRequest('/admin/students'),
  getStudent: (id) => apiRequest(`/admin/students/${id}`),
  createStudent: (data) => apiRequest('/admin/students', 'POST', data),
  updateStudent: (id, data) => apiRequest(`/admin/students/${id}`, 'PUT', data),
  deleteStudent: (id) => apiRequest(`/admin/students/${id}`, 'DELETE'),

  // Attendance
  markAttendance: (data) => apiRequest('/admin/attendance', 'POST', data),
  getStudentAttendance: (studentId) => apiRequest(`/admin/attendance/${studentId}`),
  markBulkAttendance: (data) => apiRequest('/admin/attendance/bulk', 'POST', data),
};

// Make available globally
window.API_BASE_URL = API_BASE_URL;
window.TokenManager = TokenManager;
window.AuthAPI = AuthAPI;
window.AttendanceAPI = AttendanceAPI;
window.AdminAPI = AdminAPI;

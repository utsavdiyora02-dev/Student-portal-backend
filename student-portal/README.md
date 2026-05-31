# 🎓 Student Attendance Portal — Complete Setup Guide

## For Beginners: What Did We Build?

We built a **full-stack web application** with:
- **Frontend**: HTML, CSS, JavaScript (what users see)
- **Backend**: Node.js + Express (the server that processes requests)
- **Database**: MongoDB Atlas (stores all data in the cloud)
- **Authentication**: JWT tokens (secure login system)

---

## 📁 Project Folder Structure

```
student-portal/
│
├── backend/                    ← Server-side code (Node.js)
│   ├── config/
│   │   └── database.js        ← MongoDB connection
│   ├── models/
│   │   ├── Student.js         ← Student database schema
│   │   └── Attendance.js      ← Attendance database schema
│   ├── middleware/
│   │   └── auth.js            ← JWT authentication middleware
│   ├── routes/
│   │   ├── authRoutes.js      ← /api/auth/* endpoints
│   │   ├── attendanceRoutes.js← /api/attendance/* endpoints
│   │   └── adminRoutes.js     ← /api/admin/* endpoints
│   ├── .env.example           ← Template for your config file
│   ├── server.js              ← Main server entry point
│   └── package.json           ← Node.js dependencies
│
└── frontend/                   ← Client-side code (Browser)
    ├── index.html             ← Login + Signup page
    ├── dashboard.html         ← Student dashboard
    ├── admin.html             ← Admin panel
    └── js/
        └── api.js             ← All API call functions
```

---

## 🚀 STEP-BY-STEP SETUP

### STEP 1: Install Required Software

1. **Install Node.js** (required to run the backend):
   - Go to https://nodejs.org
   - Download the "LTS" version
   - Install it (just click Next → Next → Finish)
   - Verify: Open terminal/command prompt, type: `node --version`
   - You should see something like: `v18.17.0`

2. **Install a Code Editor** (recommended: VS Code):
   - Go to https://code.visualstudio.com
   - Download and install

---

### STEP 2: Set Up MongoDB Atlas (Free Database)

MongoDB Atlas is a free cloud database service.

1. Go to https://www.mongodb.com/cloud/atlas
2. Click **"Try Free"** → Create an account
3. Choose **"Free"** plan (M0 Sandbox) → Click "Create"
4. Choose any cloud provider (AWS, Google, Azure) and region closest to you
5. Click **"Create Cluster"** (takes 1-3 minutes)
6. **Create a database user**:
   - Click **"Database Access"** in left menu
   - Click **"Add New Database User"**
   - Choose "Password" authentication
   - Enter username (e.g., `studentAdmin`) and password (e.g., `MyPass123`)
   - Select "Atlas admin" for role
   - Click **"Add User"**
7. **Allow network access**:
   - Click **"Network Access"** in left menu
   - Click **"Add IP Address"**
   - Click **"Allow Access From Anywhere"** (for development)
   - Click **"Confirm"**
8. **Get your connection string**:
   - Click **"Database"** in left menu
   - Click **"Connect"** on your cluster
   - Click **"Connect your application"**
   - Copy the connection string — it looks like:
     `mongodb+srv://studentAdmin:<password>@cluster0.abc123.mongodb.net/`

---

### STEP 3: Configure Environment Variables

1. Go to the `backend` folder
2. Find the file `.env.example`
3. **Copy it** and rename the copy to `.env` (exactly, with the dot)
4. Open `.env` in your code editor
5. Fill in your values:

```
MONGODB_URI=mongodb+srv://studentAdmin:MyPass123@cluster0.abc123.mongodb.net/student_attendance?retryWrites=true&w=majority

JWT_SECRET=myRandomSecretKey123456789abcdefghijklmnop

JWT_EXPIRES_IN=7d

PORT=5000

ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@123
```

> ⚠️ Replace `MyPass123` with YOUR actual MongoDB password
> ⚠️ Replace `cluster0.abc123` with YOUR actual cluster address

---

### STEP 4: Install Dependencies and Start Backend

Open your terminal/command prompt:

```bash
# Navigate to the backend folder
cd student-portal/backend

# Install all required packages (this reads package.json)
npm install

# Start the development server (auto-restarts on file changes)
npm run dev

# OR start without auto-restart:
npm start
```

You should see:
```
✅ MongoDB Connected: cluster0.abc123.mongodb.net
🚀 Server is running on port 5000
```

---

### STEP 5: Run the Frontend

**Option A: Simple (just open the HTML files)**
- Open `frontend/index.html` in your browser
- Done! The app will connect to `localhost:5000`

**Option B: Using VS Code Live Server (recommended)**
- Install "Live Server" extension in VS Code
- Right-click `frontend/index.html` → "Open with Live Server"
- It will open at `http://127.0.0.1:5500`

> ⚠️ **Important**: If using Live Server (port 5500), make sure `backend/server.js`
> has `http://127.0.0.1:5500` in the CORS allowed origins list. It already does!

---

## 🧪 TESTING THE APP

### Test Student Flow:
1. Open `http://localhost:5500/index.html` (or wherever your frontend is)
2. Click **Sign Up** tab
3. Create an account with your details
4. You'll be redirected to the dashboard automatically
5. You'll see 0% attendance — that's correct! Admin needs to mark it.

### Test Admin Flow:
1. Open `http://localhost:5500/admin.html`
2. Login with:
   - Username: `admin` (from your .env file)
   - Password: `Admin@123` (from your .env file)
3. You can:
   - View all students in "Students" section
   - Add new students
   - Go to "Mark Attendance" → select student → select subject → mark present/absent
4. Go back to the student's dashboard — the attendance will now show!

---

## 🌐 HOW THE APP WORKS (Flow Explanation)

```
Student Opens App
      ↓
Sign Up / Sign In (index.html)
      ↓ (Frontend sends username+password to backend)
Backend checks database
      ↓ (Creates JWT token)
Token saved in browser's localStorage
      ↓
Dashboard loads (dashboard.html)
      ↓ (Frontend sends token with every request)
Backend verifies token → returns student's data
      ↓
Attendance displays on screen
```

---

## 📡 API ENDPOINTS REFERENCE

### Authentication
| Method | URL | What it does |
|--------|-----|--------------|
| POST | `/api/auth/signup` | Create new student account |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user's profile |
| PUT | `/api/auth/change-password` | Change password |

### Student Attendance
| Method | URL | What it does |
|--------|-----|--------------|
| GET | `/api/attendance/my` | Get my attendance records |
| GET | `/api/attendance/summary` | Get quick summary |

### Admin
| Method | URL | What it does |
|--------|-----|--------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/students` | Get all students |
| POST | `/api/admin/students` | Add new student |
| PUT | `/api/admin/students/:id` | Update student |
| DELETE | `/api/admin/students/:id` | Delete student |
| POST | `/api/admin/attendance` | Mark attendance |
| GET | `/api/admin/attendance/:studentId` | Get student's report |
| GET | `/api/admin/dashboard` | Dashboard stats |

---

## 🚀 DEPLOYMENT (Making it Live on the Internet)

### Deploy Backend to Render.com (Free)

1. Push your code to GitHub (make sure `.env` is in `.gitignore`!)
2. Go to https://render.com → Create account
3. Click **"New Web Service"**
4. Connect your GitHub repo
5. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add **Environment Variables** (from your `.env` file):
   - `MONGODB_URI` = your MongoDB connection string
   - `JWT_SECRET` = your secret key
   - `PORT` = 5000
   - `ADMIN_USERNAME` = admin
   - `ADMIN_PASSWORD` = your admin password
7. Click **"Create Web Service"**
8. You'll get a URL like: `https://student-attendance.onrender.com`

### Deploy Frontend to Netlify (Free)

1. Go to https://netlify.com → Create account
2. Click **"Add new site"** → **"Deploy manually"**
3. Drag and drop your `frontend` folder
4. You'll get a URL like: `https://random-name.netlify.app`
5. **IMPORTANT**: Update `frontend/js/api.js`:
   ```javascript
   // Change this line:
   const API_BASE_URL = 'http://localhost:5000/api';
   // To your Render URL:
   const API_BASE_URL = 'https://student-attendance.onrender.com/api';
   ```
6. Also update CORS in `backend/server.js` to allow your Netlify domain

---

## 🔒 SECURITY FEATURES EXPLAINED

| Feature | What it does | Where |
|---------|-------------|-------|
| **Password Hashing** | Converts "password123" → random encrypted string | Student.js (bcryptjs) |
| **JWT Tokens** | Secure session tokens instead of storing passwords in browser | auth.js, authRoutes.js |
| **Protected Routes** | Non-logged-in users can't access /api/attendance/* | middleware/auth.js |
| **Input Validation** | Checks that required fields are provided | All route files |
| **.gitignore** | Prevents .env (with secrets) from being uploaded to GitHub | .gitignore |
| **No Plain Text Passwords** | Passwords excluded from database query results by default | Student.js (select: false) |

---

## ❓ COMMON ISSUES & FIXES

### "Cannot connect to MongoDB"
- Check your MONGODB_URI in .env file
- Make sure you replaced `<password>` with your actual password
- Make sure Network Access in MongoDB Atlas allows your IP

### "JWT is not defined"
- Make sure you ran `npm install` in the backend folder

### "CORS error in browser"
- Make sure your frontend URL is in the CORS origins list in server.js

### "401 Unauthorized"
- Your token expired — log out and log in again
- Or you're accessing admin routes with a student token

### Frontend shows "Could not connect to server"
- Make sure your backend is running (`npm run dev`)
- Make sure `API_BASE_URL` in api.js points to `http://localhost:5000/api`

---

## 📚 LEARNING RESOURCES

- **Node.js**: https://nodejs.org/en/learn
- **Express.js**: https://expressjs.com/en/guide/routing.html
- **MongoDB**: https://www.mongodb.com/docs/manual/
- **JWT**: https://jwt.io/introduction
- **REST APIs**: https://restfulapi.net/

---

*Built for learning purposes. Happy coding! 🎉*

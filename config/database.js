// ============================================================
// FILE: backend/config/database.js
// PURPOSE: Connects our Node.js app to MongoDB Atlas database
// ============================================================
//
// WHAT IS MONGOOSE?
// Mongoose is a library that helps us talk to MongoDB easily.
// Instead of writing raw database queries, we use JavaScript
// objects and methods. Think of it as a translator between
// your JavaScript code and the MongoDB database.
//
// ============================================================

const mongoose = require('mongoose'); // Import the mongoose library

// This function connects to MongoDB Atlas
const connectDB = async () => {
  try {
    // mongoose.connect() creates a connection to MongoDB
    // process.env.MONGODB_URI reads the connection string from our .env file
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options help avoid deprecation warnings
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // If connection is successful, log a message with the host name
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, log the error and stop the server
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit with failure code
  }
};

// Export this function so other files can use it
module.exports = connectDB;

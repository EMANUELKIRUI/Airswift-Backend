const mongoose = require('mongoose');

// Job Schema
const jobSchema = new mongoose.Schema({
  title: String
});

const Job = mongoose.model('Job', jobSchema);

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airswift');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Insert jobs
const insertJobs = async () => {
  try {
    await Job.insertMany([
      { title: "Cleaner" },
      { title: "Driver" },
      { title: "Housekeeping" }
    ]);
    console.log('Jobs inserted successfully');
  } catch (error) {
    console.error('Error inserting jobs:', error);
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await insertJobs();
  process.exit(0);
};

run();
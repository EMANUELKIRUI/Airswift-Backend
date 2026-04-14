const { Job } = require('./backend/models');

// Insert jobs
const insertJobs = async () => {
  try {
    await Job.bulkCreate([
      { title: "Cleaner", description: "Cleaning services", created_by: 1, status: 'active' },
      { title: "Driver", description: "Driving services", created_by: 1, status: 'active' },
      { title: "Housekeeping", description: "Housekeeping services", created_by: 1, status: 'active' }
    ]);
    console.log('Jobs inserted successfully');
  } catch (error) {
    console.error('Error inserting jobs:', error);
  }
};

// Run the script
const run = async () => {
  try {
    await insertJobs();
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
};

run();
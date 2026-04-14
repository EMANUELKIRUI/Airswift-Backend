const seedJobsWithCategories = async () => {
  try {
    // Import models locally to avoid circular dependency issues
    const { Job } = require('../models');
    const JobCategory = require('../models/JobCategory');
    
    // ✅ Check if jobs already exist
    const existingJobCount = await Job.count();
    if (existingJobCount > 0) {
      console.log('✅ Jobs already seeded - skipping seed');
      return;
    }

    // ✅ STEP 1: Create Categories
    const categories = [
      { name: 'Healthcare', description: 'Medical and healthcare roles' },
      { name: 'Construction', description: 'Construction and building trades' },
      { name: 'Food & Hospitality', description: 'Food service and hospitality' },
      { name: 'Transport & Logistics', description: 'Transport, delivery, and warehouse roles' },
      { name: 'Domestic & Cleaning Services', description: 'Cleaning and domestic services' },
      { name: 'Agriculture', description: 'Agricultural and farm work' },
      { name: 'Education', description: 'Teaching and education roles' },
      { name: 'Retail & Supermarket', description: 'Retail and supermarket positions' },
      { name: 'Security', description: 'Security and protective services' },
    ];

    // ✅ Create or find categories
    const categoryMap = {};
    for (const cat of categories) {
      const [category] = await JobCategory.findOrCreate({
        where: { name: cat.name },
        defaults: { description: cat.description },
      });
      categoryMap[cat.name] = category.id;
    }
    console.log('✅ Job categories created/found');

    // ✅ STEP 2: Create Jobs with Categories
    const jobs = [
      // Healthcare (sorted A-Z within category)
      { title: 'Caregiver', category_id: categoryMap['Healthcare'] },
      { title: 'Caregiving', category_id: categoryMap['Healthcare'] },
      { title: 'Nurse', category_id: categoryMap['Healthcare'] },

      // Construction (sorted A-Z)
      { title: 'Electrician', category_id: categoryMap['Construction'] },
      { title: 'Mason', category_id: categoryMap['Construction'] },

      // Food & Hospitality (sorted A-Z)
      { title: 'Chef', category_id: categoryMap['Food & Hospitality'] },
      { title: 'Hostess', category_id: categoryMap['Food & Hospitality'] },
      { title: 'Waiter / Waitress', category_id: categoryMap['Food & Hospitality'] },

      // Transport & Logistics (sorted A-Z)
      { title: 'Driver', category_id: categoryMap['Transport & Logistics'] },
      { title: 'Warehouse Staff', category_id: categoryMap['Transport & Logistics'] },

      // Domestic & Cleaning Services (sorted A-Z)
      { title: 'Cleaner', category_id: categoryMap['Domestic & Cleaning Services'] },
      { title: 'Housekeeping', category_id: categoryMap['Domestic & Cleaning Services'] },

      // Agriculture (sorted A-Z)
      { title: 'Farm Worker', category_id: categoryMap['Agriculture'] },

      // Education (sorted A-Z)
      { title: 'Teacher', category_id: categoryMap['Education'] },

      // Retail & Supermarket (sorted A-Z)
      { title: 'Supermarket Attendant', category_id: categoryMap['Retail & Supermarket'] },

      // Security (sorted A-Z)
      { title: 'Security Guard', category_id: categoryMap['Security'] },
    ];

    // ✅ Add required fields that Job model requires
    const jobsWithDefaults = jobs.map(job => ({
      ...job,
      description: `${job.title} position`,
      status: 'active',
      created_by: 0, // system seed
    }));

    // Bulk create jobs
    await Job.bulkCreate(jobsWithDefaults);
    console.log(`🔥 Successfully seeded ${jobsWithDefaults.length} jobs with categories`);
  } catch (error) {
    console.error('❌ Error seeding jobs:', error.message);
  }
};

module.exports = seedJobsWithCategories;

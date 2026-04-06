const mongoose = require('mongoose');
const Job = require('../models/JobMongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const uri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.DATABASE_URL ||
      'mongodb://localhost:27017/talex_dev';

    console.log('🔌 Connecting to MongoDB...');
    console.log('URI:', uri.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://***:***@'));
    
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected for seeding");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("\n💡 Tip: Make sure MongoDB is running or set MONGODB_URI environment variable");
    process.exit(1);
  }
};

const sampleJobs = [
  // 🇨🇦 CANADA JOBS
  {
    title: "Senior Full Stack Developer",
    description: "Toronto-based tech company seeking a Senior Full Stack Developer with 6+ years of experience. Build scalable web applications using modern tech stack. Competitive salary + benefits + relocation assistance available.",
    category: "Technology",
    location: "Toronto, Ontario",
    type: "Full-time",
    salaryMin: 120000,
    salaryMax: 160000,
    requiredExperience: 6,
    requiredEducation: "Bachelor's in Computer Science or equivalent",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS"],
    isRemote: false,
    requirements: "6+ years full stack development, strong problem-solving skills",
  },
  {
    title: "React Developer (Remote)",
    description: "Join our Vancouver team remotely! We're looking for a React specialist to build beautiful, responsive client applications. Work on impactful projects with cutting-edge technologies.",
    category: "Technology",
    location: "Vancouver, British Columbia",
    type: "Full-time",
    salaryMin: 90000,
    salaryMax: 130000,
    requiredExperience: 3,
    requiredEducation: "Bachelor's in CS or bootcamp graduate",
    skills: ["React", "JavaScript", "HTML", "CSS", "Git", "Webpack"],
    isRemote: true,
    requirements: "3+ years React experience, portfolio demonstrating projects",
  },
  {
    title: "DevOps Engineer",
    description: "Montreal startup needs a DevOps engineer to oversee our infrastructure. Manage AWS, Docker, Kubernetes deployments. Great work-life balance, startup equity.",
    category: "Technology",
    location: "Montreal, Quebec",
    type: "Full-time",
    salaryMin: 100000,
    salaryMax: 140000,
    requiredExperience: 4,
    requiredEducation: "Any degree or 5+ years experience",
    skills: ["AWS", "Docker", "Kubernetes", "Jenkins", "Terraform", "Linux"],
    isRemote: true,
    requirements: "4+ years DevOps experience, CI/CD pipeline expertise",
  },
  {
    title: "Data Analyst",
    description: "Calgary-based energy company seeking data analyst. Work with Python, SQL to analyze large datasets and generate insights. Contribute to business intelligence projects.",
    category: "Data & Analytics",
    location: "Calgary, Alberta",
    type: "Full-time",
    salaryMin: 75000,
    salaryMax: 110000,
    requiredExperience: 2,
    requiredEducation: "Bachelor's in Statistics, Math, or CS",
    skills: ["Python", "SQL", "Tableau", "Excel", "Statistics", "Data Visualization"],
    isRemote: false,
    requirements: "2+ years data analysis experience, strong SQL skills",
  },
  {
    title: "UI/UX Designer",
    description: "Design beautiful, user-centric interfaces for a fintech platform. Use Figma, conduct user research, and collaborate with product team. Based in Waterloo.",
    category: "Design",
    location: "Waterloo, Ontario",
    type: "Full-time",
    salaryMin: 80000,
    salaryMax: 115000,
    requiredExperience: 3,
    requiredEducation: "Design degree or equivalent portfolio",
    skills: ["Figma", "Design Thinking", "User Research", "Prototyping", "Adobe Creative Suite"],
    isRemote: true,
    requirements: "3+ years UX/UI design, strong portfolio, Figma expertise",
  },

  // 🇺🇸 USA JOBS
  {
    title: "Senior React Developer",
    description: "We are looking for a Senior React Developer with 5+ years of experience in building modern web applications. Must be proficient in React, TypeScript, and Node.js.",
    category: "Technology",
    location: "New York, NY",
    type: "Full-time",
    salaryMin: 120000,
    salaryMax: 160000,
    requiredExperience: 5,
    requiredEducation: "Bachelor's degree in Computer Science or equivalent",
    skills: ["React", "TypeScript", "Node.js", "JavaScript", "HTML", "CSS"],
    isRemote: true,
    requirements: "5+ years React experience, TypeScript proficiency required",
  },
  {
    title: "Full Stack Developer",
    description: "Join our San Francisco team as a Full Stack Developer. You'll work on both frontend and backend technologies using MERN stack. Competitive salary + stock options.",
    category: "Technology",
    location: "San Francisco, CA",
    type: "Full-time",
    salaryMin: 100000,
    salaryMax: 140000,
    requiredExperience: 3,
    requiredEducation: "Bachelor's in CS or bootcamp graduate",
    skills: ["React", "Node.js", "MongoDB", "Express", "JavaScript"],
    isRemote: false,
    requirements: "3+ years full stack development experience",
  },
  {
    title: "Cloud DevOps Engineer",
    description: "Austin tech startup hiring DevOps engineer to manage AWS infrastructure and CI/CD pipelines. Experience with Docker and Kubernetes required.",
    category: "Technology",
    location: "Austin, TX",
    type: "Full-time",
    salaryMin: 110000,
    salaryMax: 150000,
    requiredExperience: 4,
    requiredEducation: "Bachelor's in CS or IT",
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Python"],
    isRemote: true,
    requirements: "4+ years DevOps experience, hands-on AWS expertise",
  },
  {
    title: "Machine Learning Engineer",
    description: "Build ML models for recommendation systems. Work with Python, TensorFlow, and large datasets. Remote position, flexible hours.",
    category: "Data Science",
    location: "Boston, MA",
    type: "Full-time",
    salaryMin: 130000,
    salaryMax: 170000,
    requiredExperience: 4,
    requiredEducation: "Master's in CS, Math, or related field",
    skills: ["Python", "TensorFlow", "Machine Learning", "SQL", "Statistics", "PyTorch"],
    isRemote: true,
    requirements: "4+ years ML experience, published research preferred",
  },
  {
    title: "Product Designer",
    description: "Design user experiences for mobile and web products. Collaborate with cross-functional teams at a leading tech company in Los Angeles.",
    category: "Design",
    location: "Los Angeles, CA",
    type: "Full-time",
    salaryMin: 90000,
    salaryMax: 120000,
    requiredExperience: 3,
    requiredEducation: "Design degree or bootcamp",
    skills: ["Figma", "Sketch", "Adobe XD", "Prototyping", "User Research"],
    isRemote: true,
    requirements: "3+ years product design experience",
  },
  {
    title: "Senior Product Manager",
    description: "Lead product strategy and execution. Oversee feature development from ideation to launch. Experience in tech products required.",
    category: "Product",
    location: "Seattle, WA",
    type: "Full-time",
    salaryMin: 140000,
    salaryMax: 180000,
    requiredExperience: 5,
    requiredEducation: "Bachelor's degree required",
    skills: ["Product Strategy", "Agile", "Analytics", "SQL", "Data Analysis"],
    isRemote: false,
    requirements: "5+ years product management experience",
  },
  {
    title: "Junior Python Developer",
    description: "Entry-level position perfect for recent graduates. Build backend systems using Python and Django. Great mentorship and learning opportunities.",
    category: "Technology",
    location: "Chicago, IL",
    type: "Full-time",
    salaryMin: 70000,
    salaryMax: 90000,
    requiredExperience: 0,
    requiredEducation: "Bachelor's in CS or bootcamp graduate",
    skills: ["Python", "Django", "SQL", "Git", "REST APIs"],
    isRemote: false,
    requirements: "Recently graduated or bootcamp, eager to learn",
  },
  {
    title: "Cloud Solutions Architect",
    description: "Design and implement cloud solutions using AWS and Azure. Work with enterprise clients on complex infrastructure projects.",
    category: "Technology",
    location: "Denver, CO",
    type: "Full-time",
    salaryMin: 150000,
    salaryMax: 200000,
    requiredExperience: 7,
    requiredEducation: "Bachelor's in CS or IT",
    skills: ["AWS", "Azure", "Cloud Architecture", "Terraform", "Docker", "Enterprise Design"],
    isRemote: true,
    requirements: "7+ years cloud architecture experience, AWS Solutions Architect certification",
  },
  {
    title: "QA Automation Engineer",
    description: "Build and maintain automated test suites for web and mobile applications. Ensure product quality across platforms.",
    category: "Technology",
    location: "Miami, FL",
    type: "Full-time",
    salaryMin: 80000,
    salaryMax: 110000,
    requiredExperience: 3,
    requiredEducation: "Any engineering degree",
    skills: ["Selenium", "Python", "JavaScript", "TestNG", "CI/CD", "Git"],
    isRemote: true,
    requirements: "3+ years QA automation experience",
  },
  {
    title: "Healthcare Data Scientist",
    description: "Analyze healthcare data to improve patient outcomes. Work in a mission-driven organization making real impact.",
    category: "Data Science",
    location: "Cleveland, OH",
    type: "Full-time",
    salaryMin: 95000,
    salaryMax: 135000,
    requiredExperience: 2,
    requiredEducation: "Master's in Data Science or related field",
    skills: ["Python", "R", "SQL", "Statistics", "Machine Learning", "Healthcare IT"],
    isRemote: false,
    requirements: "2+ years healthcare data analysis experience",
  },
  {
    title: "Content Manager",
    description: "Manage digital content across platforms. Create marketing materials, manage social media. Great for creative professionals.",
    category: "Marketing",
    location: "Portland, OR",
    type: "Full-time",
    salaryMin: 60000,
    salaryMax: 85000,
    requiredExperience: 2,
    requiredEducation: "Bachelor's in Communications or Marketing",
    skills: ["Content Creation", "Social Media", "SEO", "Design Tools", "Analytics"],
    isRemote: true,
    requirements: "2+ years content management experience",
  },

  // 🌍 INTERNATIONAL JOBS
  {
    title: "Software Engineer (Visa Sponsorship)",
    description: "Singapore-based tech company offering visa sponsorship for talented engineers. Work on cutting-edge technologies with competitive compensation.",
    category: "Technology",
    location: "Singapore",
    type: "Full-time",
    salaryMin: 80000,
    salaryMax: 120000,
    requiredExperience: 2,
    requiredEducation: "Bachelor's in CS or equivalent",
    skills: ["JavaScript", "React", "Node.js", "Python", "SQL"],
    isRemote: false,
    requirements: "2+ years software development, visa sponsorship available",
  },
  {
    title: "Backend Developer - UK",
    description: "London-based fintech startup seeking backend engineer. Build scalable microservices using Python and Go.",
    category: "Technology",
    location: "London, UK",
    type: "Full-time",
    salaryMin: 70000,
    salaryMax: 110000,
    requiredExperience: 3,
    requiredEducation: "CS degree or bootcamp",
    skills: ["Python", "Go", "Microservices", "PostgreSQL", "Docker"],
    isRemote: true,
    requirements: "3+ years backend development, rightful work authorization",
  },
  {
    title: "Mobile Developer - Australia",
    description: "Sydney-based company seeks iOS/Android developer. Build cross-platform apps using React Native. Relocation support available.",
    category: "Technology",
    location: "Sydney, Australia",
    type: "Full-time",
    salaryMin: 85000,
    salaryMax: 125000,
    requiredExperience: 3,
    requiredEducation: "Bachelor's in CS",
    skills: ["React Native", "JavaScript", "iOS", "Android", "Firebase"],
    isRemote: false,
    requirements: "3+ years mobile development, migration support provided",
  },
  {
    title: "Business Analyst",
    description: "Toronto financial services firm seeking business analyst. Gather requirements, analyze processes, recommend improvements.",
    category: "Business",
    location: "Toronto, Ontario",
    type: "Full-time",
    salaryMin: 75000,
    salaryMax: 105000,
    requiredExperience: 2,
    requiredEducation: "Bachelor's degree required",
    skills: ["Business Analysis", "Excel", "SQL", "Agile", "JIRA", "Stakeholder Management"],
    isRemote: false,
    requirements: "2+ years business analysis experience",
  },
  {
    title: "Solutions Architect",
    description: "Work with enterprise clients to design and implement software solutions. Travel to client sites required (30%).",
    category: "Technology",
    location: "Chicago, IL",
    type: "Full-time",
    salaryMin: 130000,
    salaryMax: 165000,
    requiredExperience: 8,
    requiredEducation: "Bachelor's in CS or related field",
    skills: ["System Design", "Enterprise Software", "AWS", "Project Management", "Client Relations"],
    isRemote: false,
    requirements: "8+ years software development, strong communication skills",
  },
];

async function seedJobs() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Clear existing jobs
    const deletedCount = await Job.deleteMany({});
    console.log(`🗑️  Cleared ${deletedCount.deletedCount} existing jobs`);

    // Insert sample jobs
    const jobs = await Job.insertMany(sampleJobs);
    console.log(`\n✨ Successfully seeded ${jobs.length} test jobs!\n`);
    
    // Display summary
    const categories = [...new Set(sampleJobs.map(j => j.category))];
    const locations = [...new Set(sampleJobs.map(j => j.location))];
    const remoteCount = sampleJobs.filter(j => j.isRemote).length;
    
    console.log('📊 Job Summary:');
    console.log(`   • Total Jobs: ${jobs.length}`);
    console.log(`   • Categories: ${categories.join(', ')}`);
    console.log(`   • Remote Positions: ${remoteCount}`);
    console.log(`   • Locations: ${locations.length} cities across 🇨🇦 🇺🇸 and 🌍`);
    console.log(`   • Salary Range: $${Math.min(...sampleJobs.map(j => j.salaryMin)).toLocaleString()} - $${Math.max(...sampleJobs.map(j => j.salaryMax)).toLocaleString()}`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding jobs:', error.message);
    process.exit(1);
  }
}

seedJobs();
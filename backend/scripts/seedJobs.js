const mongoose = require('mongoose');
const Job = require('../models/JobMongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const uri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.DATABASE_URL ||
      'mongodb://localhost:27017/airswift_dev';

    await mongoose.connect(uri);
    console.log("MongoDB connected for seeding");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

const sampleJobs = [
  {
    title: "Senior React Developer",
    description: "We are looking for a Senior React Developer with 5+ years of experience in building modern web applications. Must be proficient in React, TypeScript, and Node.js.",
    category: "Technology",
    location: "New York",
    type: "Full-time",
    salaryMin: 120000,
    salaryMax: 160000,
    skills: ["React", "TypeScript", "Node.js", "JavaScript", "HTML", "CSS"],
    isRemote: true,
    requirements: "Bachelor's degree in Computer Science or equivalent experience",
  },
  {
    title: "Full Stack Developer",
    description: "Join our team as a Full Stack Developer. You'll work on both frontend and backend technologies using MERN stack.",
    category: "Technology",
    location: "San Francisco",
    type: "Full-time",
    salaryMin: 100000,
    salaryMax: 140000,
    skills: ["React", "Node.js", "MongoDB", "Express", "JavaScript"],
    isRemote: false,
    requirements: "3+ years of full stack development experience",
  },
  {
    title: "DevOps Engineer",
    description: "Looking for a DevOps Engineer to manage our cloud infrastructure and CI/CD pipelines. Experience with AWS and Docker required.",
    category: "Technology",
    location: "Austin",
    type: "Full-time",
    salaryMin: 110000,
    salaryMax: 150000,
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Python"],
    isRemote: true,
    requirements: "4+ years of DevOps experience",
  },
  {
    title: "Data Scientist",
    description: "We need a Data Scientist to analyze large datasets and build machine learning models. Python and SQL expertise required.",
    category: "Data Science",
    location: "Boston",
    type: "Full-time",
    salaryMin: 130000,
    salaryMax: 170000,
    skills: ["Python", "SQL", "Machine Learning", "Pandas", "TensorFlow", "Statistics"],
    isRemote: false,
    requirements: "PhD in Data Science or related field preferred",
  },
  {
    title: "UX/UI Designer",
    description: "Creative UX/UI Designer needed to design user-centered interfaces for our mobile and web applications.",
    category: "Design",
    location: "Los Angeles",
    type: "Full-time",
    salaryMin: 90000,
    salaryMax: 120000,
    skills: ["Figma", "Sketch", "Adobe XD", "Prototyping", "User Research"],
    isRemote: true,
    requirements: "3+ years of UX/UI design experience",
  },
  {
    title: "Product Manager",
    description: "Product Manager to lead product development from ideation to launch. Experience in tech products required.",
    category: "Product",
    location: "Seattle",
    type: "Full-time",
    salaryMin: 140000,
    salaryMax: 180000,
    skills: ["Product Strategy", "Agile", "Analytics", "SQL", "Stakeholder Management"],
    isRemote: false,
    requirements: "5+ years of product management experience",
  },
  {
    title: "Junior Python Developer",
    description: "Entry-level Python Developer position. Great opportunity for recent graduates to join our development team.",
    category: "Technology",
    location: "Chicago",
    type: "Full-time",
    salaryMin: 70000,
    salaryMax: 90000,
    skills: ["Python", "Django", "SQL", "Git", "Linux"],
    isRemote: false,
    requirements: "Bachelor's degree in Computer Science",
  },
  {
    title: "Cloud Architect",
    description: "Senior Cloud Architect to design and implement cloud solutions using AWS and Azure.",
    category: "Technology",
    location: "Denver",
    type: "Full-time",
    salaryMin: 150000,
    salaryMax: 200000,
    skills: ["AWS", "Azure", "Cloud Architecture", "Terraform", "Docker", "Kubernetes"],
    isRemote: true,
    requirements: "7+ years of cloud architecture experience",
  },
];

async function seedJobs() {
  try {
    // Connect to MongoDB
    await connectDB();

    console.log('Connected to MongoDB');

    // Clear existing jobs
    await Job.deleteMany({});
    console.log('Cleared existing jobs');

    // Insert sample jobs
    const jobs = await Job.insertMany(sampleJobs);
    console.log(`Seeded ${jobs.length} jobs successfully`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error seeding jobs:', error);
    process.exit(1);
  }
}

seedJobs();
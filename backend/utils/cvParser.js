const pdf = require("pdf-parse");
const fs = require("fs");

// Extract text from PDF CV
const extractCVText = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error("Failed to extract text from PDF: " + error.message);
  }
};

// Rule-based skill extraction
const extractSkills = (text) => {
  const skillsDB = [
    "react",
    "node",
    "express",
    "mongodb",
    "python",
    "java",
    "aws",
    "sql",
    "typescript",
    "javascript",
    "html",
    "css",
    "angular",
    "vue",
    "docker",
    "kubernetes",
    "git",
    "linux",
    "mysql",
    "postgresql",
  ];

  const found = skillsDB.filter((skill) =>
    text.toLowerCase().includes(skill.toLowerCase())
  );

  return found;
};

// Simple education extraction
const extractEducation = (text) => {
  const educationKeywords = ["bachelor", "master", "phd", "degree", "diploma", "certificate"];
  const lines = text.split('\n');
  for (let line of lines) {
    if (educationKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
      return line.trim();
    }
  }
  return "Not specified";
};

// Simple experience extraction
const extractExperience = (text) => {
  const experienceMatch = text.match(/\d+\+?\s*years?/i);
  return experienceMatch ? experienceMatch[0] : "Not specified";
};

module.exports = {
  extractCVText,
  extractSkills,
  extractEducation,
  extractExperience,
};
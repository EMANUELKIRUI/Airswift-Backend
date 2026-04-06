// Test script for AI Job Ranking
// No database dependencies - pure logic testing

// Mock data for testing
const mockJobs = [
  {
    _id: "1",
    title: "Senior React Developer",
    description: "React development position",
    category: "Technology",
    location: "New York",
    type: "Full-time",
    salaryMin: 120000,
    salaryMax: 160000,
    skills: ["React", "TypeScript", "Node.js"],
    isRemote: true,
    status: 'active',
    createdAt: new Date(),
    toObject: function() { return this; }
  },
  {
    _id: "2",
    title: "Full Stack Developer",
    description: "Full stack development",
    category: "Technology",
    location: "San Francisco",
    type: "Full-time",
    salaryMin: 100000,
    salaryMax: 140000,
    skills: ["React", "Node.js", "MongoDB"],
    isRemote: false,
    status: 'active',
    createdAt: new Date(),
    toObject: function() { return this; }
  },
  {
    _id: "3",
    title: "DevOps Engineer",
    description: "DevOps position",
    category: "Technology",
    location: "Austin",
    type: "Full-time",
    salaryMin: 110000,
    salaryMax: 150000,
    skills: ["AWS", "Docker", "Kubernetes"],
    isRemote: true,
    status: 'active',
    createdAt: new Date(),
    toObject: function() { return this; }
  }
];

const mockUser = {
  _id: "user1",
  name: "John Doe",
  skills: ["React", "Node.js", "JavaScript"],
  location: "New York",
  experience: "5+ years",
  isRemotePreferred: true,
  expectedSalary: 130000
};

// AI Job Ranking function
const rankJobs = (jobs, userProfile) => {
  return jobs.map((job) => {
    let score = 0;
    let matchReasons = [];

    // Skill match (highest weight)
    if (userProfile.skills && userProfile.skills.length > 0) {
      const skillMatches = job.skills.filter((skill) =>
        userProfile.skills.some(userSkill =>
          userSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );

      if (skillMatches.length > 0) {
        score += skillMatches.length * 25;
        matchReasons.push(`${skillMatches.length} skill match(es): ${skillMatches.join(', ')}`);
      }
    }

    // Location match
    if (userProfile.location && job.location) {
      if (job.location.toLowerCase().includes(userProfile.location.toLowerCase()) ||
          userProfile.location.toLowerCase().includes(job.location.toLowerCase())) {
        score += 15;
        matchReasons.push('Location match');
      }
    }

    // Remote preference
    if (userProfile.isRemotePreferred && job.isRemote) {
      score += 10;
      matchReasons.push('Remote work available');
    }

    // Experience level match (based on job type and user experience)
    if (userProfile.experience && job.type) {
      const userExpYears = extractYearsOfExperience(userProfile.experience);
      const jobLevel = getJobLevel(job.type);

      if (Math.abs(userExpYears - jobLevel) <= 2) {
        score += 10;
        matchReasons.push('Experience level match');
      }
    }

    // Salary compatibility
    if (userProfile.expectedSalary && job.salaryMin && job.salaryMax) {
      const expectedSalary = Number(userProfile.expectedSalary);
      if (expectedSalary >= job.salaryMin && expectedSalary <= job.salaryMax) {
        score += 5;
        matchReasons.push('Salary range match');
      }
    }

    return {
      ...job,
      matchScore: score,
      matchReasons: matchReasons.length > 0 ? matchReasons : ['General match'],
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
};

// Helper functions
const extractYearsOfExperience = (experienceString) => {
  const match = experienceString.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

const getJobLevel = (jobType) => {
  const levels = {
    'Entry-level': 0,
    'Junior': 1,
    'Mid-level': 3,
    'Senior': 5,
    'Lead': 7,
    'Principal': 10,
  };
  return levels[jobType] || 3; // Default to mid-level
};

// Test the ranking
console.log("🧠 Testing AI Job Ranking System");
console.log("=================================");

const rankedJobs = rankJobs(mockJobs, mockUser);

rankedJobs.forEach((job, index) => {
  console.log(`${index + 1}. ${job.title}`);
  console.log(`   Match Score: ${job.matchScore}`);
  console.log(`   Reasons: ${job.matchReasons.join(', ')}`);
  console.log('');
});

console.log("✅ Job ranking test completed!");
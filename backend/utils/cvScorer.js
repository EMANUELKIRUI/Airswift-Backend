/**
 * Real AI CV Scoring Algorithm
 * Scores CVs based on:
 * - Skills matching
 * - Years of experience
 * - Education level
 * - Keyword relevance
 */

const scoreCV = (cvData, jobData) => {
  let score = 0;
  const details = {
    skillsScore: 0,
    experienceScore: 0,
    educationScore: 0,
    keywordScore: 0
  };

  // 1. SKILLS MATCHING (40 points max)
  if (cvData.skills && jobData.requiredSkills) {
    const cvSkillsLower = cvData.skills.map(s => s.toLowerCase());
    const requiredSkillsLower = jobData.requiredSkills.map(s => s.toLowerCase());
    
    const matchedSkills = requiredSkillsLower.filter(skill => 
      cvSkillsLower.some(cvSkill => 
        cvSkill.includes(skill) || skill.includes(cvSkill)
      )
    );

    const skillsPercentage = requiredSkillsLower.length > 0 
      ? (matchedSkills.length / requiredSkillsLower.length) 
      : 0;
    
    details.skillsScore = Math.min(skillsPercentage * 40, 40);
    score += details.skillsScore;
  }

  // 2. EXPERIENCE MATCHING (30 points max)
  if (cvData.yearsOfExperience !== undefined && jobData.requiredExperience !== undefined) {
    const experienceGap = cvData.yearsOfExperience - jobData.requiredExperience;
    
    if (experienceGap >= 0) {
      // Candidate has at least required experience
      if (experienceGap <= 2) {
        details.experienceScore = 30; // Perfect match or slightly above
      } else {
        details.experienceScore = 30; // Still full points for exceeding
      }
    } else {
      // Candidate has less experience than required
      const percentage = (cvData.yearsOfExperience / jobData.requiredExperience);
      details.experienceScore = Math.max(percentage * 30, 0);
    }
    
    score += details.experienceScore;
  }

  // 3. EDUCATION LEVEL (15 points max)
  if (cvData.education && jobData.requiredEducation) {
    const educationLevels = {
      'high school': 1,
      'diploma': 2,
      'associate': 3,
      'bachelor': 4,
      'master': 5,
      'phd': 6,
      'doctorate': 6
    };

    const candidateEducationLevel = educationLevels[cvData.education.toLowerCase()] || 0;
    const requiredEducationLevel = educationLevels[jobData.requiredEducation.toLowerCase()] || 0;

    if (candidateEducationLevel >= requiredEducationLevel) {
      details.educationScore = 15;
    } else {
      const percentage = candidateEducationLevel / Math.max(requiredEducationLevel, 1);
      details.educationScore = percentage * 15;
    }
    
    score += details.educationScore;
  }

  // 4. KEYWORD MATCHING (15 points max)
  if (cvData.text && jobData.description) {
    const cvTextLower = cvData.text.toLowerCase();
    const jobDescLower = jobData.description.toLowerCase();
    
    // Extract keywords from job description
    const keywordList = jobDescLower
      .split(/\s+/)
      .filter(word => word.length > 5); // Only significant words
    
    const matchedKeywords = keywordList.filter(keyword => 
      cvTextLower.includes(keyword)
    );

    const keywordPercentage = keywordList.length > 0 
      ? (matchedKeywords.length / keywordList.length) 
      : 0;
    
    details.keywordScore = Math.min(keywordPercentage * 15, 15);
    score += details.keywordScore;
  }

  return {
    totalScore: Math.min(Math.round(score), 100),
    scores: details,
    breakdown: {
      skills: `${details.skillsScore.toFixed(1)}/40`,
      experience: `${details.experienceScore.toFixed(1)}/30`,
      education: `${details.educationScore.toFixed(1)}/15`,
      keywords: `${details.keywordScore.toFixed(1)}/15`
    }
  };
};

/**
 * Batch score multiple CVs against a job
 * Used for ranking applicants
 */
const batchScoreCVs = (applications, jobData) => {
  return applications
    .map(app => ({
      ...app,
      scoreDetails: scoreCV(
        {
          skills: app.skills || [],
          yearsOfExperience: app.yearsOfExperience || 0,
          education: app.education || '',
          text: app.cvText || ''
        },
        jobData
      )
    }))
    .map(app => ({
      ...app,
      score: app.scoreDetails.totalScore
    }))
    .sort((a, b) => b.score - a.score);
};

/**
 * Get score insights for frontend display
 */
const getScoreInsights = (score) => {
  if (score >= 80) {
    return {
      level: 'Excellent',
      color: 'green',
      description: 'Strong candidate match',
      recommendation: 'Highly recommended for interview'
    };
  } else if (score >= 60) {
    return {
      level: 'Good',
      color: 'blue',
      description: 'Good candidate match',
      recommendation: 'Consider for interview'
    };
  } else if (score >= 40) {
    return {
      level: 'Fair',
      color: 'yellow',
      description: 'Moderate candidate match',
      recommendation: 'May require additional review'
    };
  } else {
    return {
      level: 'Poor',
      color: 'red',
      description: 'Low candidate match',
      recommendation: 'Not recommended'
    };
  }
};

module.exports = {
  scoreCV,
  batchScoreCVs,
  getScoreInsights
};

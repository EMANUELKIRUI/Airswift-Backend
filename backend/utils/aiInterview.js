const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateInterviewQuestions = async (jobTitle, jobDescription, candidateSkills = []) => {
  try {
    const prompt = `
Generate 5 professional interview questions for a ${jobTitle} position.

Job Description: ${jobDescription}
Candidate Skills: ${candidateSkills.join(', ')}

Questions should be:
- Technical and behavioral mix
- Progressive difficulty
- Relevant to the job requirements
- Professional and clear

Return as JSON array of questions.
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const questions = JSON.parse(response.output_text.trim());
    return questions;
  } catch (error) {
    console.error('Error generating interview questions:', error);
    return [
      "Can you tell me about your experience with this role?",
      "What are your strengths and weaknesses?",
      "Why are you interested in this position?",
      "Describe a challenging project you worked on.",
      "Where do you see yourself in 5 years?"
    ];
  }
};

const scoreInterviewResponse = async (question, response, jobRequirements) => {
  try {
    const prompt = `
Score this interview response on a scale of 1-10.

Question: ${question}
Response: ${response}
Job Requirements: ${jobRequirements}

Consider:
- Relevance to the question
- Technical accuracy
- Communication skills
- Experience level
- Enthusiasm

Return only a number (1-10).
`;

    const response_score = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const score = parseInt(response_score.output_text.trim());
    return Math.max(1, Math.min(10, score)); // Ensure 1-10 range
  } catch (error) {
    console.error('Error scoring interview response:', error);
    return 5; // Default neutral score
  }
};

const generateOverallInterviewScore = (questionScores) => {
  if (!questionScores || questionScores.length === 0) return 0;

  const average = questionScores.reduce((sum, score) => sum + score, 0) / questionScores.length;
  return Math.round((average / 10) * 100); // Convert to 0-100 scale
};

module.exports = {
  generateInterviewQuestions,
  scoreInterviewResponse,
  generateOverallInterviewScore,
};
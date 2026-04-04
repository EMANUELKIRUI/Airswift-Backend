const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate AI interview question or response
 * @param {Array} conversation - Previous conversation history
 * @param {string} prompt - The prompt for AI
 * @returns {string} AI response
 */
async function askAI(conversation, prompt) {
  try {
    const messages = [
      {
        role: 'system',
        content: `You are an expert interviewer conducting a professional job interview.
        Ask relevant, technical questions based on the job role.
        Keep responses conversational and natural.
        Evaluate candidate responses and provide follow-up questions.
        Be encouraging and professional.`
      },
      ...conversation.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error);
    return 'I apologize, but I\'m having trouble processing your response. Could you please repeat that?';
  }
}

/**
 * Analyze candidate's voice response (placeholder for future speech-to-text integration)
 * @param {string} transcript - Speech-to-text transcript
 * @param {Array} conversation - Conversation history
 * @returns {Object} Analysis result
 */
async function analyzeVoiceResponse(transcript, conversation) {
  try {
    const prompt = `Analyze this candidate response in the context of the interview: "${transcript}"
    Previous conversation: ${JSON.stringify(conversation.slice(-3))}

    Provide a brief analysis of:
    1. Content quality (1-10)
    2. Communication skills (1-10)
    3. Technical knowledge (1-10)
    4. Next question suggestion

    Format as JSON with keys: contentScore, communicationScore, technicalScore, nextQuestion`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    return analysis;
  } catch (error) {
    console.error('Voice analysis error:', error);
    return {
      contentScore: 5,
      communicationScore: 5,
      technicalScore: 5,
      nextQuestion: 'Can you elaborate on your previous answer?'
    };
  }
}

/**
 * Generate voice interview summary
 * @param {Array} conversation - Full conversation history
 * @param {string} jobRole - The job role being interviewed for
 * @returns {Object} Interview summary
 */
async function generateInterviewSummary(conversation, jobRole) {
  try {
    const prompt = `Summarize this job interview for the role of ${jobRole}.
    Conversation history: ${JSON.stringify(conversation)}

    Provide:
    1. Overall assessment (1-10)
    2. Key strengths
    3. Areas for improvement
    4. Hiring recommendation
    5. Detailed feedback

    Format as JSON with keys: overallScore, strengths, improvements, recommendation, feedback`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.4,
    });

    const summary = JSON.parse(response.choices[0].message.content);
    return summary;
  } catch (error) {
    console.error('Summary generation error:', error);
    return {
      overallScore: 5,
      strengths: ['Unable to analyze'],
      improvements: ['Unable to analyze'],
      recommendation: 'Review manually',
      feedback: 'AI analysis unavailable'
    };
  }
}

module.exports = {
  askAI,
  analyzeVoiceResponse,
  generateInterviewSummary
};
const pdfParse = require("pdf-parse");
const axios = require("axios");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const extractTextFromPDF = async (url) => {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const data = await pdfParse(response.data);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
};

const analyzeCV = async (cvText, jobDescription) => {
  try {
    const prompt = `
Extract skills from this CV and match with job requirements. Return only valid JSON.

CV Content:
${cvText}

Job Description:
${jobDescription}

Return JSON format:
{
  "skills": ["skill1", "skill2", "skill3"],
  "matchScore": 85
}
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const content = response.output_text.trim();
    return JSON.parse(content);
  } catch (error) {
    console.error("Error analyzing CV:", error);
    // Return default values if AI fails
    return {
      skills: [],
      matchScore: 0,
    };
  }
};

module.exports = {
  extractTextFromPDF,
  analyzeCV,
};
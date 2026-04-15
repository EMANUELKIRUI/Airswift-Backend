const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parseCVWithAI = async (text) => {
  const prompt = `
Extract the following details from this CV:

- Full Name
- Email
- Phone Number
- Skills (as a list)
- Years of Experience

Return ONLY JSON in this format:

{
  "name": "",
  "email": "",
  "phone": "",
  "skills": [],
  "experience": ""
}

CV TEXT:
${text}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const result = response.choices[0].message.content;

  try {
    return JSON.parse(result);
  } catch (err) {
    console.error("AI parse error:", result);
    return {};
  }
};

module.exports = { parseCVWithAI };
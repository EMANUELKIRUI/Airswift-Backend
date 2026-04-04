require('dotenv').config();
const { askAIInterview, scoreCV, autonomousRecruiter } = require('./controllers/interviewController');

// Mock request/response objects
const createMockReq = (body = {}, user = { id: 1 }) => ({
  body,
  user,
  ip: '127.0.0.1',
  get: (header) => 'test-agent'
});

const createMockRes = () => {
  const res = {
    json: (data) => {
      console.log('Response:', JSON.stringify(data, null, 2));
      return res;
    },
    status: (code) => {
      console.log(`Status: ${code}`);
      return res;
    }
  };
  return res;
};

async function testAIEndpoints() {
  try {
    console.log('🧪 Testing AI Interview Bot...');

    const interviewReq = createMockReq({
      messages: [
        { role: 'user', content: 'Hello, I want to apply for a software developer position.' }
      ]
    });

    const interviewRes = createMockRes();
    await askAIInterview(interviewReq, interviewRes);

    console.log('\n🧪 Testing CV AI Scorer...');

    const cvReq = createMockReq({
      cvText: `
        John Doe
        Software Developer

        Experience:
        - 3 years React development
        - 2 years Node.js backend
        - 1 year Python automation

        Skills:
        - JavaScript, TypeScript
        - React, Vue.js
        - Node.js, Express
        - MongoDB, PostgreSQL
        - Git, Docker

        Education:
        - Bachelor's in Computer Science
      `,
      jobRole: 'Frontend Developer'
    });

    const cvRes = createMockRes();
    await scoreCV(cvReq, cvRes);

    console.log('\n🧪 Testing Autonomous Recruiter AI...');

    const recruiterReq = createMockReq({
      jobDescription: 'Senior Frontend Developer with React experience',
      applications: [
        {
          id: 1,
          name: 'John Doe',
          cv: '3 years React, JavaScript, Node.js',
          skills: ['React', 'JavaScript']
        },
        {
          id: 2,
          name: 'Jane Smith',
          cv: '5 years Vue.js, TypeScript, Python',
          skills: ['Vue.js', 'TypeScript']
        }
      ]
    });

    const recruiterRes = createMockRes();
    await autonomousRecruiter(recruiterReq, recruiterRes);

    console.log('\n🎉 All AI endpoints tested successfully!');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }
}

testAIEndpoints();
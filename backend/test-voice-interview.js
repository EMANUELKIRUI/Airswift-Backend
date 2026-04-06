const io = require('socket.io-client');

console.log('🗣️ Testing Voice Interview System...\n');

// Connect to the server
const socket = io('https://talex-backend-fjt3.onrender.com', {
  transports: ['websocket', 'polling']
});

let testSessionId = null;

socket.on('connect', () => {
  console.log('✅ Connected to server');

  // Test 1: Start Voice Interview
  console.log('🎤 Test 1: Starting voice interview...');
  socket.emit('start-voice-interview', {
    jobRole: 'Software Engineer',
    candidateName: 'John Doe'
  });
});

socket.on('voice-interview-started', (data) => {
  console.log('✅ Voice interview started!');
  console.log('Session ID:', data.sessionId);
  console.log('First Question:', data.firstQuestion);
  testSessionId = data.sessionId;

  // Test 2: Send voice response
  setTimeout(() => {
    console.log('\n🎤 Test 2: Sending voice response...');
    socket.emit('voice-response', {
      sessionId: testSessionId,
      transcript: 'I have 5 years of experience in Node.js development, working on backend APIs and real-time applications.',
      audioData: null // In real implementation, this would be audio blob
    });
  }, 1000);
});

socket.on('voice-response-processed', (data) => {
  console.log('✅ Voice response processed!');
  console.log('Analysis:', data.analysis);
  console.log('Next Question:', data.nextQuestion);

  // Test 3: Send another response
  setTimeout(() => {
    console.log('\n🎤 Test 3: Sending second response...');
    socket.emit('voice-response', {
      sessionId: testSessionId,
      transcript: 'I enjoy working with React for frontend development and have built several SPAs using modern JavaScript frameworks.',
      audioData: null
    });
  }, 1000);
});

socket.on('voice-response-processed', (data) => {
  if (data.conversationLength >= 4) { // After a few exchanges
    // Test 4: End interview
    setTimeout(() => {
      console.log('\n🎤 Test 4: Ending voice interview...');
      socket.emit('end-voice-interview', {
        sessionId: testSessionId
      });
    }, 1000);
  }
});

socket.on('voice-interview-completed', (data) => {
  console.log('✅ Voice interview completed!');
  console.log('Summary Score:', data.summary.overallScore);
  console.log('Recommendation:', data.summary.recommendation);
  console.log('Duration:', Math.round(data.duration / 1000), 'seconds');

  // Test 5: Check status
  setTimeout(() => {
    console.log('\n🎤 Test 5: Checking interview status...');
    socket.emit('get-voice-interview-status', {
      sessionId: testSessionId
    });
  }, 500);
});

socket.on('voice-interview-status', (data) => {
  console.log('✅ Interview status retrieved!');
  console.log('Status:', data.status);
  console.log('Conversation Length:', data.conversationLength);

  // All tests completed
  setTimeout(() => {
    console.log('\n🎉 All voice interview tests completed!');
    socket.disconnect();
    process.exit(0);
  }, 1000);
});

socket.on('voice-interview-error', (error) => {
  console.error('❌ Voice interview error:', error.message);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.log('Make sure the server is running on port 5000');
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('❌ Test timeout - voice interview system may not be working');
  socket.disconnect();
  process.exit(1);
}, 30000);
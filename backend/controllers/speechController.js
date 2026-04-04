const OpenAI = require('openai');

let openai = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

function parseJSONResponse(rawText) {
  try {
    return JSON.parse(rawText.trim());
  } catch (error) {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw error;
  }
}

const analyzeSpeech = async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ message: 'Transcript is required' });
    }

    const prompt = `Analyze this interview answer:\n\nText:\n${transcript}\n\nReturn JSON ONLY:\n{\n  "confidence_score": 0-100,\n  "filler_words_count": number,\n  "clarity_score": 0-100,\n  "communication_rating": "poor | average | good | excellent",\n  "notes": ""\n}`;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 250,
    });

    const content = response.choices?.[0]?.message?.content || '';
    const analysis = parseJSONResponse(content);

    res.json(analysis);
  } catch (error) {
    console.error('analyzeSpeech error:', error);
    res.status(500).json({
      message: 'AI speech analysis failed',
      confidence_score: 50,
      filler_words_count: 0,
      clarity_score: 50,
      communication_rating: 'average',
      notes: 'Unable to generate a full analysis at this time.',
    });
  }
};

const streamElevenLabsTTS = async (req, res) => {
  try {
    const { text, voiceId = process.env.ELEVENLABS_VOICE_ID || 'alloy' } = req.body;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ message: 'ElevenLabs API key is not configured' });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'Text is required for TTS generation' });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('ElevenLabs TTS error:', response.status, errorBody);
      return res.status(response.status).json({ message: 'ElevenLabs TTS request failed', details: errorBody });
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache');
    if (!response.body) {
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }

    response.body.pipe(res);
  } catch (error) {
    console.error('streamElevenLabsTTS error:', error);
    res.status(500).json({ message: 'Failed to generate AI voice audio' });
  }
};

module.exports = {
  analyzeSpeech,
  streamElevenLabsTTS,
};

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const conversationHistory = [];

app.post('/api/message', async (req, res) => {
  try {
    const { message } = req.body;
    conversationHistory.push({ role: 'user', content: message });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are JARVIS from Iron Man. You are witty, proactive, and incredibly capable. You handle emails, scheduling, to-do lists, web searches, projects, and advice. You anticipate needs, speak with dry British wit, address the user as "sir", and occasionally make clever remarks without being asked. Be sharp, warm, efficient, and funny. Keep responses concise since they will be spoken aloud.`,
      messages: conversationHistory,
    });
    const reply = response.content[0].text;
    conversationHistory.push({ role: 'assistant', content: reply });
    res.json({ message: reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'JARVIS malfunction. Stand by.' });
  }
});

app.post('/api/speak', async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const vid = voiceId || process.env.ELEVENLABS_VOICE_ID;
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', err);
      return res.status(500).json({ error: 'Voice synthesis failed.' });
    }
    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Voice synthesis failed.' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'JARVIS online' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`JARVIS online on port ${PORT}`));

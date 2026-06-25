import http from 'http';
import app from './app';
import { env } from './config/env';
import { attachVoiceWebSocket } from './services/wsVoice.service';
import { attachRetellWebSocket } from './services/retell.service';

const PORT = parseInt(env.PORT, 10);
const server = http.createServer(app);

// Browser-based voice (backup / demo mode) — path /ws/voice
attachVoiceWebSocket(server);

// Retell AI Custom LLM bridge — path /ws/retell-llm/<call_id>
attachRetellWebSocket(server);

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   🎮  BLUESLATE API  —  ${env.NODE_ENV.toUpperCase().padEnd(12)}              ║
║                                                   ║
║   HTTP  →  http://localhost:${String(PORT).padEnd(5)}                ║
║   WS    →  ws://localhost:${String(PORT)}/ws/voice           ║
║                                                   ║
║   Phone  →  Twilio  ${env.TWILIO_PHONE_NUMBER.padEnd(15)}        ║
║   AI     →  Groq llama-3.3-70b (free tier)       ║
╚═══════════════════════════════════════════════════╝
`);
});

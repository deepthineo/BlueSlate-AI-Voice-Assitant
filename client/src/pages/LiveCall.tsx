import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, Phone, Volume2, Loader2 } from 'lucide-react';
import { useLocationStore } from '../hooks/useLocation';
import { cn, timeAgo } from '../lib/utils';
import TopBar from '../components/layout/TopBar';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  ts: Date;
}

type CallState = 'idle' | 'connecting' | 'active' | 'thinking' | 'speaking' | 'ended';

// Web Speech API types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// In dev, Vite proxies /ws → ws://localhost:3001 so we use a relative path.
// In production, VITE_WS_URL is set to wss://your-server.
const WS_URL = import.meta.env.VITE_WS_URL || '';

export default function LiveCall() {
  const { currentLocation, setCurrentLocation, setLocations } = useLocationStore();
  const [state, setState] = useState<CallState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [micActive, setMicActive] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [callerName, setCallerName] = useState('');

  // If currentLocation is null (e.g. after page refresh before App.tsx effect fires),
  // fetch it directly here so the button becomes clickable immediately.
  useEffect(() => {
    if (currentLocation) return;
    setLocationLoading(true);
    import('../lib/api').then(({ default: api }) =>
      api.get('/locations')
        .then((res) => {
          const locs = (res.data.locations ?? []) as import('../types').FranchiseLocation[];
          if (locs.length > 0) {
            setLocations(locs);
            setCurrentLocation(locs[0]);
          }
        })
        .catch(() => {})
        .finally(() => setLocationLoading(false))
    );
  }, [currentLocation]);

  const wsRef = useRef<WebSocket | null>(null);
  const recogRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pollRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speak text via browser TTS
  // Chrome's speechSynthesis.onend is unreliable — use a polling fallback
  const speak = useCallback((text: string, onDone?: () => void) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      v.name.includes('Google') || v.name.includes('Neural') || v.name.includes('Natural')
    );
    if (preferred) utter.voice = preferred;

    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      if (pollRef.current) clearInterval(pollRef.current);
      setState('active');
      onDone?.();
    };

    utter.onend = finish;
    utter.onerror = finish;

    // Fallback poll: Chrome sometimes skips onend entirely
    pollRef.current = window.setInterval(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        finish();
      }
    }, 150);

    synthRef.current = utter;
    setState('speaking');
    window.speechSynthesis.speak(utter);
  }, []);

  // Start listening via Web Speech Recognition (Chrome/Edge — free)
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition not supported. Please use Chrome or Edge.');
      return;
    }

    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = true;
    recog.lang = 'en-US';

    recog.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setInterimText(interim);
      if (final.trim()) {
        setInterimText('');
        setMicActive(false);
        const text = final.trim();
        setMessages((prev) => [...prev, { role: 'user', text, ts: new Date() }]);
        // Send to server via WebSocket
        wsRef.current?.send(JSON.stringify({ type: 'user_speech', text }));
        setState('thinking');
      }
    };

    recog.onend = () => {
      setMicActive(false);
      setInterimText('');
      // If no speech was captured and we're still in active state, restart automatically
      // so user doesn't need to click mic again after AI finishes speaking
    };

    recog.onerror = (e) => {
      console.warn('[Speech] Error:', e.error);
      setMicActive(false);
      setInterimText('');
      if (e.error === 'no-speech') {
        // Restart listening silently — user probably hadn't started speaking yet
        setTimeout(() => startListening(), 300);
      } else if (e.error !== 'aborted') {
        setError(`Microphone error: ${e.error}`);
      }
    };

    recogRef.current = recog;
    recog.start();
    setMicActive(true);
    setState('active');
  }, []);

  // Connect WebSocket and start call
  const startCall = useCallback(() => {
    if (!currentLocation) return;
    setState('connecting');
    setMessages([]);
    setError('');

    const base = WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
    const nameParam = callerName.trim() ? `&callerName=${encodeURIComponent(callerName.trim())}` : '';
    const ws = new WebSocket(`${base}/ws/voice?locationId=${currentLocation.id}&sessionId=${sessionId}${nameParam}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as {
        type: string;
        text?: string;
        greeting?: string;
        agentName?: string;
        final?: boolean;
        message?: string;
      };

      if (msg.type === 'ready') {
        setState('speaking');
        const greeting = msg.greeting ?? 'Hello!';
        setMessages([{ role: 'assistant', text: greeting, ts: new Date() }]);
        speak(greeting, () => {
          setState('active');
          // Auto-start listening after greeting
          setTimeout(startListening, 300);
        });
      }

      if (msg.type === 'thinking') {
        setState('thinking');
      }

      if (msg.type === 'ai_response' && msg.text) {
        setMessages((prev) => [...prev, { role: 'assistant', text: msg.text!, ts: new Date() }]);
        speak(msg.text, () => {
          if (!msg.final) {
            setTimeout(startListening, 400);
          } else {
            setState('ended');
          }
        });
      }

      if (msg.type === 'error') {
        setError(msg.message ?? 'Connection error');
        setState('idle');
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection failed. Is the server running?');
      setState('idle');
    };

    ws.onclose = () => {
      if (state !== 'ended') {
        setState('ended');
      }
    };
  }, [currentLocation, sessionId, speak, startListening, state]);

  // End call
  const endCall = useCallback(() => {
    window.speechSynthesis.cancel();
    if (pollRef.current) clearInterval(pollRef.current);
    recogRef.current?.abort();
    wsRef.current?.send(JSON.stringify({ type: 'end_call' }));
    wsRef.current?.close();
    wsRef.current = null;
    setState('ended');
    setMicActive(false);
    setInterimText('');
  }, []);

  // Manual mic toggle
  const toggleMic = useCallback(() => {
    if (state !== 'active') return;
    if (micActive) {
      recogRef.current?.stop();
      setMicActive(false);
    } else {
      startListening();
    }
  }, [state, micActive, startListening]);

  const stateLabel: Record<CallState, string> = {
    idle: 'Ready to call',
    connecting: 'Connecting…',
    active: 'Listening…',
    thinking: 'AI is thinking…',
    speaking: 'AI is speaking…',
    ended: 'Call ended',
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Live Voice Call" subtitle="Browser-based AI call — no phone needed, 100% free" back />

      <div className="flex-1 flex flex-col items-center justify-start p-6 gap-6 overflow-auto">
        {/* Call status card */}
        <div className="w-full max-w-2xl card text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={cn(
              'w-3 h-3 rounded-full',
              state === 'idle' || state === 'ended' ? 'bg-gray-500' :
              state === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              state === 'thinking' ? 'bg-yellow-400 animate-pulse' :
              state === 'speaking' ? 'bg-blue-400 animate-pulse' :
              'bg-emerald-400 animate-pulse'
            )} />
            <span className="text-sm font-medium text-gray-300">{stateLabel[state]}</span>
          </div>

          {currentLocation && (
            <p className="text-xs text-slate-500 mb-4">
              AI Agent: <span className="text-slate-300 font-medium">{currentLocation.ai_config?.agent_name ?? 'Alex'}</span>
            </p>
          )}

          {/* Caller name — so lead is never "Unknown Caller" */}
          {(state === 'idle' || state === 'ended') && (
            <div className="mb-5 max-w-xs mx-auto">
              <input
                className="input text-center text-sm"
                placeholder="Your name (optional)"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {(state === 'idle' || state === 'ended') && (
              <>
                <button
                  onClick={startCall}
                  disabled={!currentLocation || locationLoading}
                  className="btn-primary gap-3 px-8 py-3 text-base"
                >
                  {locationLoading
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Connecting…</>
                    : <><Phone className="w-5 h-5" /> {state === 'ended' ? 'Call Again' : 'Start Call'}</>
                  }
                </button>
                {!currentLocation && !locationLoading && (
                  <p className="mt-3 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                    Server not reachable. Make sure <code className="font-mono">npm run dev</code> is running in <code className="font-mono">/server</code>.
                  </p>
                )}
              </>
            )}

            {state !== 'idle' && state !== 'ended' && state !== 'connecting' && (
              <>
                <button
                  onClick={toggleMic}
                  disabled={state !== 'active'}
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                    micActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  )}
                  title={micActive ? 'Stop listening' : 'Start listening'}
                >
                  {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={endCall}
                  className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
                  title="End call"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </>
            )}

            {state === 'connecting' && (
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            )}
          </div>

          {/* Interim speech text */}
          {interimText && (
            <p className="mt-4 text-sm text-gray-400 italic">"{interimText}…"</p>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Conversation transcript */}
        {messages.length > 0 && (
          <div className="w-full max-w-2xl card">
            <div className="flex items-center gap-2 mb-4">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-300">Live Transcript</h3>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-3', msg.role === 'assistant' ? '' : 'flex-row-reverse')}>
                  <div className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                    msg.role === 'assistant'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  )}>
                    {msg.role === 'assistant' ? 'AI' : 'You'}
                  </div>
                  <div className={cn(
                    'max-w-sm px-4 py-2.5 rounded-2xl text-sm',
                    msg.role === 'assistant'
                      ? 'bg-brand-600/20 text-gray-200 rounded-tl-sm'
                      : 'bg-gray-700 text-gray-200 rounded-tr-sm'
                  )}>
                    <p>{msg.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{timeAgo(msg.ts)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Call ended — check leads */}
        {state === 'ended' && messages.length > 1 && (
          <div className="w-full max-w-2xl card border-emerald-600/30">
            <p className="text-sm text-emerald-400 font-medium">Call complete!</p>
            <p className="text-xs text-gray-500 mt-1">
              Lead is being extracted and scored. Check the{' '}
              <a href="/leads" className="text-brand-400 hover:text-brand-300">Leads tab</a>
              {' '}in about 10–15 seconds.
            </p>
          </div>
        )}

        {/* Instructions for first-time users */}
        {state === 'idle' && (
          <div className="w-full max-w-2xl card bg-gray-900/50">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">How it works</h3>
            <ol className="space-y-2 text-sm text-gray-400">
              <li className="flex gap-2"><span className="text-brand-400 font-bold">1.</span> Click <strong className="text-gray-300">Start Call</strong> — your browser will ask for microphone permission</li>
              <li className="flex gap-2"><span className="text-brand-400 font-bold">2.</span> The AI greets you and starts listening automatically</li>
              <li className="flex gap-2"><span className="text-brand-400 font-bold">3.</span> Speak naturally — ask about programs, pricing, enrollment</li>
              <li className="flex gap-2"><span className="text-brand-400 font-bold">4.</span> Click <strong className="text-gray-300">End Call</strong> to finish — your lead is extracted within 15 seconds</li>
            </ol>
            <p className="text-xs text-gray-600 mt-3">
              Uses Chrome/Edge built-in speech recognition. No phone number or credits required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

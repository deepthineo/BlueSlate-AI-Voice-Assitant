import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap, Phone, Users, TrendingUp, Brain, Shield, ChevronRight,
  CheckCircle, ArrowRight, Building2, Mic, X,
  BarChart3, PhoneCall, Sparkles, Play, PhoneOff,
} from 'lucide-react';
import TryBlueSlate from '../components/TryBlueSlate';

// Fallback replies if the API is unreachable
function getFallbackReply(turnCount: number): string {
  if (turnCount >= 2) return "I'd love to get you more details — can I grab your name so our team can follow up with you directly?";
  return "Great question! I'm having a brief connection issue. For full details on BlueSlate, our team at support@blueslate.ai can help — or sign up free and explore the dashboard yourself!";
}

// ── Demo call widget — real voice conversation ──────────────────
const DEMO_BUSINESS = 'Your Franchise';
const DEMO_GREETING = "Hi there! Thanks for calling — I'm Alex, your AI receptionist. How can I help you today?";
// Use `|| '/api'` (not `??`): VITE_API_URL is "" in dev, which `??` won't catch.
// "/api" is proxied by Vite to localhost:3001; in prod it's the full Render URL.
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api');
// Real Twilio line visitors can dial to reach the live AI. Override in Vercel via VITE_DEMO_PHONE.
const DEMO_PHONE = (import.meta.env.VITE_DEMO_PHONE as string | undefined) ?? '+1 570 747 4386';

function DemoCallWidget({ autoStart }: { autoStart?: boolean }) {
  const [phase, setPhase] = useState<'idle' | 'ringing' | 'active' | 'ended'>('idle');
  const [captions, setCaptions] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [callerName, setCallerName] = useState('');
  const [duration, setDuration] = useState(0);
  const [micError, setMicError] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiSpeakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const turnRef = useRef(0);
  const endedRef = useRef(false);
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [micReady, setMicReady] = useState(false); // true after AI finishes + 800ms grace

  useEffect(() => { turnRef.current = turnCount; }, [turnCount]);

  // Duration timer
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Auto-start demo when parent requests it
  useEffect(() => {
    if (autoStart && phase === 'idle') startDemo();
  }, [autoStart]);

  // When AI finishes speaking: show mic as "not ready" for 800ms, then enable
  // This also acts as watchdog — aiSpeaking stuck > 12s forces release
  useEffect(() => {
    if (aiSpeakTimeoutRef.current) clearTimeout(aiSpeakTimeoutRef.current);
    if (aiSpeaking) {
      setMicReady(false);
      // 12s hard watchdog
      aiSpeakTimeoutRef.current = setTimeout(() => {
        setAiSpeaking(false);
      }, 12000);
    } else {
      // 800ms grace after AI stops — button becomes visibly ready
      const t = setTimeout(() => setMicReady(true), 800);
      return () => clearTimeout(t);
    }
    return () => { if (aiSpeakTimeoutRef.current) clearTimeout(aiSpeakTimeoutRef.current); };
  }, [aiSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endedRef.current = true;
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      try { recognitionRef.current?.abort(); } catch {}
    };
  }, []);

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // Human voice via ElevenLabs (backend), falls back to browser TTS
  async function speakAI(text: string, onDone?: () => void) {
    if (endedRef.current) return;

    // Try ElevenLabs via backend first
    try {
      const res = await fetch(`${API_BASE}/demo/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); if (!endedRef.current) onDone?.(); };
        audio.onerror = () => { URL.revokeObjectURL(url); speakBrowser(text, onDone); };
        audio.play().catch(() => speakBrowser(text, onDone));
        return;
      }
    } catch {
      // backend unavailable — fall through
    }
    speakBrowser(text, onDone);
  }

  // Browser TTS fallback — with timeout so onDone always fires
  function speakBrowser(text: string, onDone?: () => void) {
    if (endedRef.current || !window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US'; utter.rate = 0.95; utter.pitch = 1.1; utter.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === 'Samantha') ||
                  voices.find(v => v.name.includes('Zira')) ||
                  voices.find(v => v.lang === 'en-US' && !v.name.toLowerCase().includes('male')) ||
                  voices.find(v => v.lang.startsWith('en'));
    if (voice) utter.voice = voice;

    // Safety timeout: if onend never fires (browser bug), release after estimated duration
    const estimatedMs = Math.max(3000, text.length * 65);
    let fired = false;
    const release = () => { if (!fired) { fired = true; if (!endedRef.current) onDone?.(); } };
    const timeout = setTimeout(release, estimatedMs + 2000);

    utter.onend = () => { clearTimeout(timeout); release(); };
    utter.onerror = () => { clearTimeout(timeout); release(); };

    const speak = () => {
      const voices2 = window.speechSynthesis.getVoices();
      const v2 = voices2.find(v => v.name === 'Samantha') ||
                 voices2.find(v => v.name.includes('Zira')) ||
                 voices2.find(v => v.lang === 'en-US' && !v.name.toLowerCase().includes('male')) ||
                 voices2.find(v => v.lang.startsWith('en'));
      if (v2) utter.voice = v2;
      window.speechSynthesis.speak(utter);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', speak, { once: true });
    } else {
      speak();
    }
  }

  async function handleUserSpeech(text: string) {
    if (endedRef.current || !text.trim()) return;
    const newTurn = turnRef.current + 1;
    setTurnCount(newTurn);
    setCaptions(prev => [...prev, { role: 'user', text }]);
    setAiSpeaking(true);
    setMicError('');
    const nameMatch = text.match(/(?:i'm|my name is|this is|it's)\s+([A-Z][a-z]+)/i);
    if (nameMatch && !callerName) setCallerName(nameMatch[1]);

    // Capture history snapshot before this turn, then fetch AI reply
    const prevHistory = [...historyRef.current];
    let reply = getFallbackReply(newTurn);

    try {
      const res = await fetch(`${API_BASE}/demo/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: prevHistory }),
        signal: AbortSignal.timeout(9000),
      });
      if (res.ok) {
        const data = await res.json() as { reply?: string };
        if (data.reply) reply = data.reply;
      }
    } catch {
      // server unreachable — use fallback
    }

    // Append both turns to history for context in subsequent messages
    historyRef.current.push({ role: 'user', content: text });
    historyRef.current.push({ role: 'assistant', content: reply });

    if (endedRef.current) return;
    setCaptions(prev => [...prev, { role: 'ai', text: reply }]);
    speakAI(reply, () => {
      setAiSpeaking(false);
      if (newTurn >= 3 && !endedRef.current) {
        endedRef.current = true;
        setTimeout(() => setPhase('ended'), 900);
      }
    });
  }

  function startListening() {
    if (listening || !micReady || endedRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicError('Use Chrome or Edge for voice input.'); return; }
    try { recognitionRef.current?.abort(); } catch {}
    setMicError('');
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const transcript = (e.results[0][0].transcript ?? '').trim();
      if (transcript.length < 1) return; // ignore empty
      handleUserSpeech(transcript);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error === 'not-allowed') setMicError('Microphone blocked. Click the lock icon in your browser address bar and allow mic access, then refresh.');
      else if (e.error === 'no-speech') setMicError('No speech detected — tap mic and speak clearly.');
      else if (e.error === 'network') setMicError('Network error with speech recognition. Try again.');
      else setMicError(`Mic error: ${e.error}. Try again.`);
    };
    try {
      rec.start();
    } catch (err) {
      setListening(false);
      setMicError('Could not start microphone. Please allow mic access in your browser.');
    }
  }

  function startDemo() {
    endedRef.current = false;
    historyRef.current = [{ role: 'assistant', content: DEMO_GREETING }];
    setPhase('ringing');
    setTimeout(() => {
      setPhase('active');
      setAiSpeaking(true);
      setCaptions([{ role: 'ai', text: DEMO_GREETING }]);
      speakAI(DEMO_GREETING, () => setAiSpeaking(false));
    }, 2000);
  }

  function endCall() {
    endedRef.current = true;
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    try { recognitionRef.current?.abort(); } catch {}
    setPhase('ended');
  }

  // ── Idle ──────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-5">
        <button onClick={startDemo}
          className="w-24 h-24 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', animation: 'callPulse 2s ease-in-out infinite' }}>
          <Phone className="w-10 h-10 text-white fill-white" />
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-base">Call Your AI Receptionist</p>
          <p className="text-xs text-gray-500 mt-1">Alex answers for your franchise — 24/7</p>
        </div>
        {/* Primary CTA */}
        <button onClick={startDemo}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}>
          <Play className="w-4 h-4 fill-white" /> Try a Demo — No Login Needed
        </button>
        <p className="text-xs text-gray-600">← Experience it yourself. No account needed.</p>

        {/* Or preview the full product */}
        <div className="flex items-center gap-3 w-full max-w-xs mt-1">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-gray-500 font-medium">OR</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <Link to="/demo-dashboard"
          className="flex flex-col items-center gap-1 px-6 py-3 rounded-2xl border transition-all hover:scale-105 active:scale-95"
          style={{ borderColor: 'rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.08)' }}>
          <span className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wide">
            <BarChart3 className="w-3.5 h-3.5" /> Preview the dashboard
          </span>
          <span className="text-white font-bold text-sm">See leads &amp; calls in action</span>
        </Link>
        <p className="text-xs text-gray-600 text-center">When you sign up, your AI gets its own phone number to answer real calls 24/7.</p>
      </div>
    );
  }

  // ── Ringing ────────────────────────────────────────────────────
  if (phase === 'ringing') {
    return (
      <div className="rounded-3xl overflow-hidden w-72"
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex flex-col items-center pt-10 pb-8 px-6 gap-5">
          <div className="relative">
            <span className="absolute inset-[-12px] rounded-full animate-ping opacity-20" style={{ background: '#7c3aed' }} />
            <span className="absolute inset-[-22px] rounded-full animate-ping opacity-10" style={{ background: '#7c3aed', animationDelay: '0.5s' }} />
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 30px rgba(124,58,237,0.5)' }}>
              <Mic className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">Your Franchise</p>
            <p className="text-gray-400 text-sm mt-0.5">AI Receptionist · Alex</p>
            <p className="text-purple-400 text-xs mt-3 tracking-widest uppercase animate-pulse">Connecting…</p>
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400"
                style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Lead captured ──────────────────────────────────────────────
  if (phase === 'ended') {
    return (
      <div className="rounded-2xl overflow-hidden w-72"
        style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 0 40px rgba(16,185,129,0.08)' }}>
        <div className="px-5 py-3.5 border-b flex items-center gap-2"
          style={{ borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.06)' }}>
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-bold text-emerald-300">Lead captured automatically</span>
        </div>
        <div className="p-5 space-y-2.5">
          {[
            { label: 'Caller', value: callerName || 'Demo Visitor' },
            { label: 'Interested in', value: 'Your Services' },
            { label: 'Outcome', value: 'Qualified', highlight: true },
            { label: 'Lead Score', value: '72 / 100', score: true },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{row.label}</span>
              <span className={row.score ? 'text-amber-300 font-bold' : row.highlight ? 'text-emerald-300 font-medium' : 'text-gray-200'}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 pt-1">
          <p className="text-xs text-gray-600 mb-3">Happened in under 60 seconds — zero staff needed.</p>
          <Link to="/sign-up"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
            Set this up for my franchise <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Active call — voice only ────────────────────────────────────
  const lastCaption = captions[captions.length - 1];
  const canSpeak = micReady && !aiSpeaking && !listening && !endedRef.current;

  return (
    <div className="rounded-3xl overflow-hidden w-72"
      style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #080810 100%)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 0 60px rgba(124,58,237,0.15)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-xs text-emerald-400 font-semibold">Live Call</span>
        </div>
        <span className="text-emerald-400 font-mono text-sm font-bold tabular-nums">{fmt(duration)}</span>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center pt-2 pb-3">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2.5"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: aiSpeaking ? '0 0 28px rgba(124,58,237,0.6)' : '0 0 14px rgba(124,58,237,0.3)' }}>
          <Mic className="w-7 h-7 text-white" />
        </div>
        <p className="text-white font-bold text-sm">{DEMO_BUSINESS}</p>
        <p className="text-gray-500 text-xs mt-0.5">Alex · AI Receptionist</p>
        <div className="mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa' }}>
          Sign up to use YOUR franchise name
        </div>
      </div>

      {/* Waveform */}
      <div className="flex justify-center items-end gap-[3px] h-8 px-5 mb-3">
        {(aiSpeaking || listening)
          ? [3,7,11,9,14,10,6,12,8,13,7,10,5,9,6].map((h, i) => (
              <div key={i} className="w-[3px] rounded-full"
                style={{
                  height: `${h}px`,
                  background: listening ? '#22c55e' : '#a78bfa',
                  animation: `waveBar 0.4s ease-in-out ${(i * 0.055).toFixed(2)}s infinite alternate`,
                  transformOrigin: 'bottom',
                }} />
            ))
          : [2,3,2,3,2,3,2,3,2,3,2,3,2,3,2].map((h, i) => (
              <div key={i} className="w-[3px] rounded-full"
                style={{ height: `${h}px`, background: 'rgba(255,255,255,0.1)' }} />
            ))
        }
      </div>

      {/* Caption */}
      <div className="mx-4 mb-4 rounded-2xl min-h-[76px] flex flex-col justify-center px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {aiSpeaking ? (
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400"
                style={{ animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite` }} />)}
            </div>
            <span className="text-xs text-gray-400">Alex is speaking…</span>
          </div>
        ) : listening ? (
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ animation: `bounce 1.0s ease-in-out ${i * 0.15}s infinite` }} />)}
            </div>
            <span className="text-xs text-emerald-400">Listening to you…</span>
          </div>
        ) : lastCaption ? (
          <>
            <p className="text-[10px] font-semibold mb-1"
              style={{ color: lastCaption.role === 'ai' ? '#a78bfa' : '#6ee7b7' }}>
              {lastCaption.role === 'ai' ? 'Alex (AI)' : 'You'}
            </p>
            <p className="text-sm text-gray-200 leading-relaxed">{lastCaption.text}</p>
          </>
        ) : (
          <p className="text-xs text-gray-600 text-center">Tap the mic and speak naturally</p>
        )}
      </div>

      {micError && <p className="text-[10px] text-amber-400 text-center px-4 mb-2">{micError}</p>}

      {/* Mic button */}
      <div className="flex flex-col items-center pb-2">
        <button onClick={startListening} disabled={!canSpeak}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
          style={
            listening
              ? { background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 0 24px rgba(220,38,38,0.5)', animation: 'callPulse 1s ease-in-out infinite' }
              : canSpeak
                ? { background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 20px rgba(34,197,94,0.4)', animation: 'callPulse 2s ease-in-out infinite' }
                : { background: 'rgba(255,255,255,0.07)' }
          }>
          <Mic className="w-7 h-7 text-white" />
        </button>
        <p className="text-xs mt-2 font-medium"
          style={{ color: listening ? '#f87171' : canSpeak ? '#4ade80' : aiSpeaking ? '#a78bfa' : '#64748b' }}>
          {listening ? 'Listening… speak now'
            : canSpeak ? 'Tap mic — speak naturally'
            : aiSpeaking ? 'Alex is speaking…'
            : !micReady && !aiSpeaking ? 'Getting ready…'
            : ''}
        </p>
      </div>

      {/* End call */}
      <div className="flex justify-center px-4 pt-1 pb-5">
        <button onClick={endCall}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 0 14px rgba(220,38,38,0.3)' }}>
          <PhoneOff className="w-4 h-4" /> End Call
        </button>
      </div>
    </div>
  );
}

// ── "Alex calls you" tab — no signup, just leave a number ───────
function CallMeTab() {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.length < 8) { setErrMsg('Enter a valid phone number.'); setState('error'); return; }
    setState('sending'); setErrMsg('');
    try {
      const res = await fetch(`${API_BASE}/demo/callback-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Something went wrong.');
      }
      setState('done');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <p className="text-white font-bold text-sm">You're on the list!</p>
        <p className="text-xs text-gray-500 max-w-[16rem]">Alex will call <span className="text-gray-300 font-medium">{phone}</span> within 24 hours. No account needed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col items-center gap-3 py-4 w-full">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
        <Phone className="w-7 h-7 text-white fill-white" />
      </div>
      <p className="text-white font-bold text-sm">Want Alex to call you?</p>
      <p className="text-xs text-gray-500 max-w-[16rem] text-center">Leave your number — no signup. Alex will call you back to show you how it works.</p>
      <input
        type="tel" value={phone} onChange={e => { setPhone(e.target.value); if (state === 'error') setState('idle'); }}
        placeholder="+1 555 123 4567"
        className="w-full max-w-[16rem] px-3 py-2.5 rounded-xl text-sm text-white bg-white/[0.04] border border-white/10 focus:border-purple-500/50 outline-none"
      />
      {state === 'error' && <p className="text-[11px] text-red-400">{errMsg}</p>}
      <button type="submit" disabled={state === 'sending'}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
        {state === 'sending' ? 'Sending…' : <>Request a callback <ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="text-[10px] text-gray-600 text-center">We'll call you within 24 hours.</p>
    </form>
  );
}

// ── 3-tab live demo: Browser / Call us / We call you ────────────
function DemoTabs({ autoStart }: { autoStart?: boolean }) {
  const [tab, setTab] = useState<'browser' | 'call' | 'callme'>('browser');
  const dialHref = `tel:${DEMO_PHONE.replace(/[^\d+]/g, '')}`;

  const tabs = [
    { key: 'browser' as const, label: 'Browser', sub: 'Mic + text' },
    { key: 'call' as const, label: 'Call Alex', sub: 'Live · free' },
    { key: 'callme' as const, label: 'Alex calls you', sub: 'We dial you' },
  ];

  return (
    <div className="rounded-3xl overflow-hidden w-[22rem] max-w-full"
      style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #080810 100%)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 0 60px rgba(124,58,237,0.15)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">Alex</span>
          <span className="text-xs text-gray-500">· AI Receptionist</span>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          Online
        </span>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 border-b border-white/10">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex flex-col items-center gap-0.5 py-2.5 transition-colors relative"
            style={{ background: tab === t.key ? 'rgba(124,58,237,0.10)' : 'transparent' }}>
            <span className={`text-xs font-semibold ${tab === t.key ? 'text-purple-300' : 'text-gray-400'}`}>{t.label}</span>
            <span className="text-[10px] text-gray-600">{t.sub}</span>
            {tab === t.key && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-purple-500" />}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="p-5 flex flex-col items-center">
        {tab === 'browser' && (
          <div className="w-full flex flex-col items-center">
            <p className="text-xs text-purple-300 font-semibold uppercase tracking-wide mb-3 self-start">Live Voice Demo</p>
            <DemoCallWidget autoStart={autoStart} />
          </div>
        )}

        {tab === 'call' && (
          <div className="flex flex-col items-center gap-3 py-2 text-center w-full">
            <p className="text-xs text-gray-500 max-w-[17rem]">
              Talk to Alex live, right here — free, no app, works on any phone or computer. Tap the mic and ask anything.
            </p>
            {/* Browser-based live call: works for everyone, no Twilio, no signup */}
            <DemoCallWidget autoStart />
            <details className="w-full max-w-[17rem] mt-1">
              <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400">Prefer a real phone call?</summary>
              <p className="text-[10px] text-gray-600 mt-1.5">
                Our dialable line <a href={dialHref} className="text-purple-400 hover:text-purple-300">{DEMO_PHONE}</a> is in pilot and currently answers verified numbers only. The live call above works for everyone right now.
              </p>
            </details>
          </div>
        )}

        {tab === 'callme' && <CallMeTab />}
      </div>
    </div>
  );
}

// ── Main Landing Page ───────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [demoAutoStart, setDemoAutoStart] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const stats = [
    { value: '< 2s', label: 'AI response time' },
    { value: '100%', label: 'Calls answered' },
    { value: '60s', label: 'Lead extracted after call' },
    { value: '$0', label: 'Setup cost' },
  ];

  const features = [
    {
      icon: Phone,
      color: '#60a5fa',
      bg: 'rgba(59,130,246,0.1)',
      title: 'Never Miss a Call',
      desc: 'Your AI receptionist answers every inbound call 24/7 — weekends, evenings, holidays. No voicemail, no missed leads.',
    },
    {
      icon: Brain,
      color: '#a78bfa',
      bg: 'rgba(139,92,246,0.1)',
      title: 'Knows Your Business',
      desc: 'Paste your website URL. In 30 seconds, your AI knows your services, pricing, programs, and FAQs. No training required.',
    },
    {
      icon: Users,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.1)',
      title: 'Auto-Captures Leads',
      desc: 'After every call, AI extracts the caller\'s name, interest, and intent. Scored 0–100. Ready in your dashboard in under 60 seconds.',
    },
    {
      icon: PhoneCall,
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.1)',
      title: 'Outbound Follow-Ups',
      desc: 'Reach out to warm leads with a single click. Your AI calls them back with a personalized pitch based on what they asked about.',
    },
    {
      icon: BarChart3,
      color: '#f472b6',
      bg: 'rgba(244,114,182,0.1)',
      title: 'Real-Time Dashboard',
      desc: 'See every call, every lead, every outcome. Know what programs prospects ask about most. Make smarter decisions.',
    },
    {
      icon: Shield,
      color: '#6ee7b7',
      bg: 'rgba(110,231,183,0.1)',
      title: 'Multi-Location Ready',
      desc: 'Manage all your franchise locations from one dashboard. Each gets its own AI agent trained on its specific knowledge.',
    },
  ];

  const howItWorks = [
    {
      step: '01',
      icon: Building2,
      title: 'Connect Your Franchise',
      desc: 'Sign up and paste your franchise website URL. Our AI scrapes and learns your business in under 30 seconds.',
    },
    {
      step: '02',
      icon: Phone,
      title: 'Assign a Phone Number',
      desc: 'We give you a local phone number. Route your existing calls to it, or publish it as your inquiry line.',
    },
    {
      step: '03',
      icon: TrendingUp,
      title: 'Watch Leads Appear',
      desc: 'Every call answered, every lead captured automatically. Your dashboard fills up while you focus on running the business.',
    },
  ];

  const earlyAccessPerks = [
    {
      icon: Phone,
      title: 'Be among the first',
      desc: "We're onboarding early franchise partners now. Your feedback shapes the product directly.",
    },
    {
      icon: Sparkles,
      title: 'Free forever',
      desc: 'No credit card. No trial limits. No hidden fees. BlueSlate is completely free — no monetization, ever.',
    },
    {
      icon: Shield,
      title: 'Your data, your AI',
      desc: 'Your knowledge base and lead data belong to you. We never sell or share franchise data.',
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#09090d', color: '#e2e8f0' }}>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrollY > 40 ? 'rgba(9,9,13,0.92)' : 'transparent',
          backdropFilter: scrollY > 40 ? 'blur(12px)' : 'none',
          borderBottom: scrollY > 40 ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 16px rgba(124,58,237,0.4)' }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Blueslate</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
              AI
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Free Access</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/sign-in"
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="text-sm font-semibold text-white px-4 py-2 rounded-xl transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-6 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20 blur-[120px]"
            style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)' }} />
          <div className="absolute top-20 right-0 w-96 h-96 rounded-full opacity-10 blur-[80px]"
            style={{ background: '#6366f1' }} />
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Announcement badge — clickable, goes to sign-up */}
          <div className="flex justify-center mb-6">
            <Link
              to="/sign-up"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all hover:scale-105 cursor-pointer"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-purple-300 font-medium">Now with Outbound AI Calling</span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left: copy */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
                Your Franchise's
                <span
                  className="block"
                  style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  AI Receptionist
                </span>
                Never Sleeps.
              </h1>

              <p className="text-lg text-gray-400 max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
                BlueSlate answers every inbound call, books trials, captures leads automatically,
                and follows up with outbound calls — while you run your business.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-8">
                <Link
                  to="/sign-up"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-white font-bold text-base transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                    boxShadow: '0 0 30px rgba(124,58,237,0.4)',
                  }}
                >
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => document.getElementById('try')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-base transition-all hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                >
                  <Play className="w-4 h-4 text-purple-400" /> Try on My Website
                </button>
              </div>

              {/* Trust row */}
              <div className="flex items-center gap-4 justify-center lg:justify-start text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> No credit card required</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Setup in 10 minutes</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Cancel anytime</span>
              </div>

              {/* Customer entry point */}
              <p className="text-xs text-gray-600 mt-1 text-center lg:text-left">
                Called a BlueSlate franchise?{' '}
                <Link to="/sign-up?role=customer" className="text-emerald-400 hover:underline font-medium">
                  Check your inquiry status →
                </Link>
              </p>
            </div>

            {/* Right: live demo widget — 3 tabs */}
            <div id="demo" className="flex-shrink-0 flex flex-col items-center gap-4">
              <DemoTabs autoStart={demoAutoStart} />
            </div>
          </div>

          {/* Stats bar */}
          <div
            className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="text-center py-5 px-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Try BlueSlate: no-signup website scan + AI playground ── */}
      <TryBlueSlate />

      {/* ── How It Works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-white mb-3">Up and running in 10 minutes</h2>
            <p className="text-gray-400">No technical setup. No developers needed. Just paste your URL.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {howItWorks.map((step) => (
              <div
                key={step.step}
                className="relative p-6 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-5xl font-black mb-4" style={{ color: 'rgba(124,58,237,0.2)' }}>{step.step}</div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <step.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-white mb-3">Everything a franchise needs to win on the phone</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Built specifically for franchise businesses. Not a generic chatbot.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 cursor-default"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: f.bg }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Early Access ───────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-5"
              style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-purple-300 font-semibold">Early Access — Open Now</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-3">Built for franchise owners. Free for everyone.</h2>
            <p className="text-gray-400 max-w-xl mx-auto">We're not a subscription. We're not a trial. BlueSlate is free — full stop.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {earlyAccessPerks.map((p) => (
              <div
                key={p.title}
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <p.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-5"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-semibold">100% Free — Always</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-3">Free for every franchise owner. Forever.</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              BlueSlate is completely free — no credit card, no trial limits, no hidden fees, no paid plans.
              We built this for franchise owners and we're keeping it that way.
            </p>
          </div>

          {/* Single plan card */}
          <div
            className="relative p-8 rounded-3xl text-center"
            style={{
              background: 'linear-gradient(145deg, rgba(124,58,237,0.1) 0%, rgba(99,102,241,0.06) 100%)',
              border: '1px solid rgba(124,58,237,0.35)',
              boxShadow: '0 0 60px rgba(124,58,237,0.12)',
            }}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="text-sm font-bold px-5 py-1.5 rounded-full text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
                Everything included
              </span>
            </div>

            <div className="mt-4 mb-6">
              <span className="text-7xl font-black text-white">$0</span>
              <span className="text-gray-400 text-lg ml-2">/ month</span>
              <p className="text-emerald-400 font-semibold mt-2">Free forever — no paid plans, ever</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left max-w-lg mx-auto">
              {[
                'AI voice receptionist (24/7)',
                'Unlimited inbound calls',
                'Outbound AI follow-up calls',
                'Automatic lead capture',
                'Lead scoring (0–100)',
                'Knowledge base builder',
                'Real-time dashboard',
                'Multi-location support',
                'Custom AI name & personality',
                'No credit card ever needed',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  {f}
                </div>
              ))}
            </div>

            <Link
              to="/sign-up"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-white font-bold text-base transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}
            >
              Get Started — It's Free <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-xs text-gray-600 mt-4">No credit card · No trial period · Setup in 10 minutes</p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="p-12 rounded-3xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(99,102,241,0.1) 100%)', border: '1px solid rgba(124,58,237,0.25)' }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-72 h-72 rounded-full blur-[80px] opacity-30"
                style={{ background: '#7c3aed', transform: 'translate(-30%, -30%)' }} />
            </div>
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-5">
                <Mic className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Your AI agent is waiting to be activated</span>
              </div>
              <h2 className="text-3xl font-black text-white mb-4">
                Stop missing calls.<br />Start capturing every lead.
              </h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Free forever. No credit card. No paid plans. Setup in 10 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/sign-up"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 30px rgba(124,58,237,0.5)' }}
                >
                  Start Free — No Card Needed <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-400">Blueslate</span>
          </div>
          <p className="text-xs text-gray-600">© 2026 NeoAistriq / Fractal KX. Built for franchise growth.</p>
          <div className="flex gap-4 text-xs text-gray-600">
            <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <a href="mailto:support@blueslate.ai" className="hover:text-gray-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

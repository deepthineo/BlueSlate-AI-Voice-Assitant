import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  Zap, Building2, Globe, Bot, Phone, CheckCircle, ArrowRight,
  Loader2, Sparkles, ChevronRight, Mic, Play, X,
  AlertCircle,
} from 'lucide-react';
import api from '../lib/api';
import { useLocationStore } from '../hooks/useLocation';

const WS_URL = import.meta.env.VITE_WS_URL ?? '';

// ── Step components ─────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: (data: { businessName: string; businessType: string }) => void }) {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const types = ['Fitness / Gym', 'Youth Sports', 'Tutoring / Education', 'Food & Beverage', 'Retail', 'Home Services', 'Other'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-2">Welcome to Blueslate</h2>
        <p className="text-gray-400">Let's set up your AI receptionist in 5 minutes. First — tell us about your franchise.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Franchise / Business Name</label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. XP League Frisco"
            className="w-full px-4 py-3 rounded-xl text-gray-200 placeholder-gray-600 outline-none transition-all focus:ring-1"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: businessName ? '0 0 0 1px rgba(124,58,237,0.5)' : 'none',
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Business Type</label>
          <div className="grid grid-cols-2 gap-2">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setBusinessType(t)}
                className="px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                style={{
                  background: businessType === t ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                  border: businessType === t ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.07)',
                  color: businessType === t ? '#c4b5fd' : '#9ca3af',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        disabled={!businessName.trim() || !businessType}
        onClick={() => onNext({ businessName: businessName.trim(), businessType })}
        className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function StepKnowledge({
  locationId,
  onNext,
}: {
  locationId: string;
  onNext: () => void;
}) {
  const [mode, setMode] = useState<'url' | 'manual'>('url');
  const [url, setUrl] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'scraping' | 'done' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [kbId, setKbId] = useState('');
  const pollRef = useRef<number | null>(null);

  async function startScrape() {
    setStatus('scraping');
    setStatusMsg(mode === 'url' ? 'Fetching your website…' : 'Processing your content…');
    try {
      const body = mode === 'url'
        ? { sourceUrl: url }
        : { sourceUrl: `manual://${Date.now()}`, manualContent, manualTitle: 'My Business' };

      const res = await api.post('/knowledge/scrape', body);
      const id: string = res.data.knowledgeBase?.id ?? '';
      setKbId(id);

      if (id) {
        setStatusMsg('AI is reading and understanding your content…');
        pollRef.current = window.setInterval(async () => {
          try {
            const kb = await api.get(`/knowledge/${id}`);
            const kbStatus: string = kb.data.knowledgeBase?.status;
            if (kbStatus === 'active') {
              clearInterval(pollRef.current!);
              setStatus('done');
              setStatusMsg('Your AI now knows your business!');
            } else if (kbStatus === 'failed') {
              clearInterval(pollRef.current!);
              setStatus('error');
              setStatusMsg('Scrape failed. Try entering your content manually.');
            }
          } catch { /* retry */ }
        }, 2500);
      } else {
        setStatus('done');
      }
    } catch {
      setStatus('error');
      setStatusMsg('Something went wrong. Try again or enter content manually.');
    }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-2">Train your AI agent</h2>
        <p className="text-gray-400">Your AI needs to know your services, pricing, hours, and FAQs to answer calls correctly.</p>
      </div>

      {status === 'done' ? (
        <div
          className="p-5 rounded-2xl flex items-start gap-4"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-300 mb-1">Knowledge base ready!</p>
            <p className="text-sm text-gray-400">Your AI has been trained on your business. It now knows your services, pricing, hours, and FAQs.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden p-1 gap-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['url', 'manual'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={mode === m
                  ? { background: 'rgba(124,58,237,0.3)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.4)' }
                  : { color: '#6b7280' }
                }
              >
                {m === 'url' ? 'Paste Website URL' : 'Enter Manually'}
              </button>
            ))}
          </div>

          {mode === 'url' ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Your franchise website URL</label>
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourfranchise.com"
                  className="flex-1 px-4 py-3 rounded-xl text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">We'll scan your website and extract all relevant business info automatically.</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Business information</label>
              <textarea
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="Describe your services, programs, pricing, hours, location, and any FAQs your customers ask about..."
                rows={6}
                className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-red-300">{statusMsg}</span>
            </div>
          )}

          {status === 'scraping' && (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin flex-shrink-0" />
              <p className="text-sm text-purple-300">{statusMsg}</p>
            </div>
          )}

          <button
            disabled={status === 'scraping' || (mode === 'url' ? !url.trim() : !manualContent.trim())}
            onClick={startScrape}
            className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
          >
            {status === 'scraping' ? <><Loader2 className="w-4 h-4 animate-spin" /> Training AI…</> : <><Sparkles className="w-4 h-4" /> Train AI Agent</>}
          </button>
        </>
      )}

      <div className="flex gap-3">
        {status === 'done' && (
          <button
            onClick={onNext}
            className="flex-1 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
          >
            Next Step <ArrowRight className="w-4 h-4" />
          </button>
        )}
        {status !== 'scraping' && (
          <button
            onClick={onNext}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

function StepAgentConfig({
  locationId,
  businessName,
  onNext,
}: {
  locationId: string;
  businessName: string;
  onNext: () => void;
}) {
  const [agentName, setAgentName] = useState('Alex');
  const [greeting, setGreeting] = useState(`Hi! Thanks for calling ${businessName}! I'm Alex, your virtual assistant. How can I help you today?`);
  const [maxTurns, setMaxTurns] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/locations/${locationId}`, {
        ai_config: {
          agent_name: agentName,
          greeting,
          farewell: `Thanks so much for calling ${businessName}! We look forward to seeing you. Have a great day!`,
          max_turns: maxTurns,
        },
      });
      setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-2">Configure your AI agent</h2>
        <p className="text-gray-400">Give your AI receptionist a name and personality. Callers will interact with this agent.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Agent name</label>
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Alex"
            className="w-full px-4 py-3 rounded-xl text-gray-200 placeholder-gray-600 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <p className="text-xs text-gray-600 mt-1">This name is used during calls: "Hi, I'm {agentName}…"</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Opening greeting</label>
          <textarea
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Max conversation turns: <span className="text-purple-400 font-bold">{maxTurns}</span></label>
          <input
            type="range"
            min={5}
            max={20}
            value={maxTurns}
            onChange={(e) => setMaxTurns(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>5 (quick)</span>
            <span>20 (detailed)</span>
          </div>
        </div>
      </div>

      {/* Greeting preview */}
      <div className="p-4 rounded-2xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-medium text-purple-300">Preview — what callers will hear</span>
        </div>
        <p className="text-sm text-gray-300 italic">"{greeting}"</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={async () => { await save(); onNext(); }}
          disabled={saving}
          className="flex-1 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {saving ? 'Saving…' : saved ? 'Saved! Continue' : 'Save & Continue'}
          {!saving && <ArrowRight className="w-4 h-4" />}
        </button>
        <button
          onClick={onNext}
          className="px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// Use `|| '/api'` (not `??`): VITE_API_URL is "" in dev, which `??` won't catch.
const TEST_API_BASE = ((import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api');

function StepTestCall({ locationId, onNext }: { locationId: string; onNext: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'ringing' | 'active' | 'ended'>('idle');
  const [lastAI, setLastAI] = useState('');
  const [lastUser, setLastUser] = useState('');
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [duration, setDuration] = useState(0);
  const [micError, setMicError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const recRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endedRef = useRef(false);
  const micBlockedUntil = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => () => {
    endedRef.current = true;
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    try { recRef.current?.abort(); } catch {}
    wsRef.current?.close();
  }, []);

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  async function speakAI(text: string, onDone?: () => void) {
    if (endedRef.current) return;
    try {
      const res = await fetch(`${TEST_API_BASE}/demo/tts`, {
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
    } catch { /* fall through */ }
    speakBrowser(text, onDone);
  }

  function speakBrowser(text: string, onDone?: () => void) {
    if (endedRef.current || !window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US'; utter.rate = 1.0; utter.pitch = 1.15;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === 'Samantha') ||
                  voices.find(v => v.name.includes('Zira')) ||
                  voices.find(v => v.lang === 'en-US' && !v.name.toLowerCase().includes('male')) ||
                  voices.find(v => v.lang.startsWith('en'));
    if (voice) utter.voice = voice;
    utter.onend = () => { if (!endedRef.current) onDone?.(); };
    utter.onerror = () => { if (!endedRef.current) onDone?.(); };
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.speak(utter), { once: true });
    } else {
      window.speechSynthesis.speak(utter);
    }
  }

  function startListening() {
    if (listening || aiSpeaking || endedRef.current) return;
    if (Date.now() < micBlockedUntil.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicError('Use Chrome or Edge for voice input.'); return; }
    try { recRef.current?.abort(); } catch {}
    setMicError('');
    const rec = new SR();
    recRef.current = rec;
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const result = e.results[0][0];
      if (result.confidence < 0.45 || result.transcript.trim().length < 2) return;
      const text = result.transcript.trim();
      setLastUser(text);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'user_speech', text }));
      }
      setAiSpeaking(true);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error === 'not-allowed') setMicError('Mic blocked — allow microphone in browser settings.');
      else if (e.error === 'no-speech') setMicError('Nothing heard. Tap mic and try again.');
    };
    try { rec.start(); } catch {}
  }

  function startCall() {
    endedRef.current = false;
    setPhase('ringing');

    const wsUrl = WS_URL
      ? `${WS_URL}/ws/voice?locationId=${locationId}&callerName=Owner+Test&sessionId=onboarding-${Date.now()}`
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/voice?locationId=${locationId}&callerName=Owner+Test&sessionId=onboarding-${Date.now()}`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setTimeout(() => {
          setPhase('active');
          setAiSpeaking(true);
        }, 1500);
      };

      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as { type: string; text?: string };
          if (msg.type === 'ai_response' && msg.text) {
            setLastAI(msg.text);
            speakAI(msg.text, () => {
              micBlockedUntil.current = Date.now() + 1500;
              setAiSpeaking(false);
            });
          }
        } catch { /* ignore */ }
      };

      socket.onerror = () => {
        // WS not available — simulate local greeting
        setTimeout(() => {
          setPhase('active');
          const greeting = "Hi! I'm your AI agent. Go ahead and ask me anything about your business.";
          setLastAI(greeting);
          setAiSpeaking(true);
          speakAI(greeting, () => { micBlockedUntil.current = Date.now() + 1500; setAiSpeaking(false); });
        }, 1500);
      };

      socket.onclose = () => {
        if (!endedRef.current) setPhase('ended');
      };
    } catch {
      setTimeout(() => {
        setPhase('active');
        const greeting = "Hi! I'm your AI agent. Tap the mic and ask me about your services.";
        setLastAI(greeting);
        setAiSpeaking(true);
        speakAI(greeting, () => { micBlockedUntil.current = Date.now() + 1500; setAiSpeaking(false); });
      }, 1500);
    }
  }

  function endCall() {
    endedRef.current = true;
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    try { recRef.current?.abort(); } catch {}
    if (wsRef.current) { try { wsRef.current.send(JSON.stringify({ type: 'end_call' })); wsRef.current.close(); } catch {} }
    setPhase('ended');
  }

  const canSpeak = !aiSpeaking && !listening && phase === 'active' && !endedRef.current;
  const lastCaption = lastUser
    ? { role: 'user' as const, text: lastUser }
    : lastAI
      ? { role: 'ai' as const, text: lastAI }
      : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-white mb-2">Test your AI agent</h2>
        <p className="text-gray-400">Call your AI. Ask about your services, pricing, or booking — it knows your actual business.</p>
      </div>

      {/* ── Idle ── */}
      {phase === 'idle' && (
        <div className="p-8 rounded-2xl text-center"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px dashed rgba(124,58,237,0.3)' }}>
          <Mic className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <p className="text-gray-300 font-medium mb-2">Voice call with your AI</p>
          <p className="text-sm text-gray-500 mb-5">Your AI will answer using your actual knowledge base. Speak naturally — no typing needed.</p>
          <button onClick={startCall}
            className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 mx-auto transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            <Phone className="w-4 h-4" /> Start Voice Test
          </button>
        </div>
      )}

      {/* ── Ringing ── */}
      {phase === 'ringing' && (
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a0f 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col items-center py-10 gap-4">
            <div className="relative">
              <span className="absolute inset-[-12px] rounded-full animate-ping opacity-20" style={{ background: '#7c3aed' }} />
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 30px rgba(124,58,237,0.5)' }}>
                <Mic className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-bold">Your AI Receptionist</p>
              <p className="text-purple-400 text-xs mt-2 tracking-widest uppercase animate-pulse">Connecting…</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Active / Ended call ── */}
      {(phase === 'active' || phase === 'ended') && (
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #080810 100%)', border: '1px solid rgba(255,255,255,0.09)' }}>

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-1.5">
              {phase === 'active' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">Live Test Call</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-semibold">Call ended</span>
                </>
              )}
            </div>
            {phase === 'active' && (
              <span className="text-emerald-400 font-mono text-sm font-bold tabular-nums">{fmt(duration)}</span>
            )}
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center pt-2 pb-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: aiSpeaking ? '0 0 28px rgba(124,58,237,0.6)' : '0 0 12px rgba(124,58,237,0.3)' }}>
              <Mic className="w-6 h-6 text-white" />
            </div>
            <p className="text-white font-bold text-sm">Your AI Receptionist</p>
            <p className="text-gray-500 text-xs mt-0.5">Trained on your knowledge base</p>
          </div>

          {/* Waveform */}
          <div className="flex justify-center items-end gap-[3px] h-7 px-5 mb-3">
            {(aiSpeaking || listening)
              ? [3,7,11,9,14,10,6,12,8,13,7,10,5,9,6].map((h, i) => (
                  <div key={i} className="w-[3px] rounded-full"
                    style={{ height: `${h}px`, background: listening ? '#22c55e' : '#a78bfa',
                      animation: `waveBar 0.4s ease-in-out ${(i * 0.055).toFixed(2)}s infinite alternate`,
                      transformOrigin: 'bottom' }} />
                ))
              : [2,3,2,3,2,3,2,3,2,3,2,3,2,3,2].map((h, i) => (
                  <div key={i} className="w-[3px] rounded-full"
                    style={{ height: `${h}px`, background: 'rgba(255,255,255,0.1)' }} />
                ))
            }
          </div>

          {/* Caption */}
          <div className="mx-4 mb-4 rounded-2xl min-h-[72px] flex flex-col justify-center px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {aiSpeaking ? (
              <div className="flex items-center gap-2">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400"
                  style={{ animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite` }} />)}
                <span className="text-xs text-gray-400 ml-1">AI is speaking…</span>
              </div>
            ) : listening ? (
              <div className="flex items-center gap-2">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{ animation: `bounce 1.0s ease-in-out ${i * 0.15}s infinite` }} />)}
                <span className="text-xs text-emerald-400 ml-1">Listening…</span>
              </div>
            ) : lastCaption ? (
              <>
                <p className="text-[10px] font-semibold mb-1"
                  style={{ color: lastCaption.role === 'ai' ? '#a78bfa' : '#6ee7b7' }}>
                  {lastCaption.role === 'ai' ? 'AI' : 'You'}
                </p>
                <p className="text-sm text-gray-200 leading-relaxed">{lastCaption.text}</p>
              </>
            ) : (
              <p className="text-xs text-gray-600 text-center">Tap the mic to speak to your AI</p>
            )}
          </div>

          {micError && <p className="text-[10px] text-amber-400 text-center px-4 mb-2">{micError}</p>}

          {/* Controls */}
          {phase === 'active' && (
            <div className="flex flex-col items-center pb-2">
              <button onClick={startListening} disabled={!canSpeak}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                style={listening
                  ? { background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 0 24px rgba(220,38,38,0.5)', animation: 'callPulse 1s ease-in-out infinite' }
                  : canSpeak
                    ? { background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 20px rgba(34,197,94,0.4)', animation: 'callPulse 2s ease-in-out infinite' }
                    : { background: 'rgba(255,255,255,0.07)' }
                }>
                <Mic className="w-6 h-6 text-white" />
              </button>
              <p className="text-xs mt-2" style={{ color: listening ? '#f87171' : canSpeak ? '#4ade80' : '#4b5563' }}>
                {listening ? 'Listening…' : canSpeak ? 'Tap to speak' : aiSpeaking ? 'AI is speaking…' : ''}
              </p>
            </div>
          )}

          <div className="flex justify-center px-4 pt-1 pb-5">
            {phase === 'active' ? (
              <button onClick={endCall}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                <X className="w-3.5 h-3.5" /> End Call
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle className="w-4 h-4" /> Lead would be captured automatically
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {phase === 'ended' && (
          <button onClick={onNext}
            className="flex-1 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            Go to my dashboard <ArrowRight className="w-4 h-4" />
          </button>
        )}
        <button onClick={onNext}
          className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {phase === 'idle' ? 'Skip test — go to dashboard' : 'Done — go to dashboard'}
        </button>
      </div>
    </div>
  );
}

function StepDone({ businessName }: { businessName: string }) {
  const navigate = useNavigate();

  const checklist = [
    'Franchise location created',
    'AI agent trained on your business',
    'Agent name and greeting configured',
    'Test conversation completed',
  ];

  return (
    <div className="space-y-6 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}
      >
        <Zap className="w-10 h-10 text-white" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-white mb-2">You're live, {businessName.split(' ')[0]}!</h2>
        <p className="text-gray-400">Your AI receptionist is ready to answer calls and capture leads automatically.</p>
      </div>

      <div className="text-left space-y-2 p-5 rounded-2xl" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
        {checklist.map((item) => (
          <div key={item} className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-gray-300">{item}</span>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl text-left" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <p className="text-sm font-semibold text-purple-300 mb-1">Next step to go live on the phone</p>
        <p className="text-xs text-gray-400">Go to <strong className="text-gray-300">Settings → Phone Number</strong> to connect a Twilio number. Then your AI will answer real calls.</p>
      </div>

      <button
        onClick={() => navigate('/')}
        className="w-full py-4 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}
      >
        Open my dashboard <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ── Main Onboarding component ────────────────────────────────────
type Step = 'welcome' | 'knowledge' | 'agent' | 'test' | 'done';

const STEPS: Step[] = ['welcome', 'knowledge', 'agent', 'test', 'done'];
const STEP_LABELS = ['Business', 'Knowledge', 'Agent', 'Test', 'Done'];

export default function Onboarding() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { setCurrentLocation, setLocations } = useLocationStore();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [businessName, setBusinessName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [creating, setCreating] = useState(false);

  // Expose clerk token
  useEffect(() => {
    if (isSignedIn) {
      window.__clerk = { session: { getToken: () => getToken() } };
    }
  }, [isSignedIn, getToken]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#09090d' }}>
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) { navigate('/'); return null; }

  const stepIndex = STEPS.indexOf(currentStep);

  async function handleWelcomeNext({ businessName: name, businessType }: { businessName: string; businessType: string }) {
    setBusinessName(name);
    setCreating(true);
    try {
      const res = await api.post('/locations', {
        name,
        address: '',
        timezone: 'America/Chicago',
        website_url: '',
        ai_config: {
          agent_name: 'Alex',
          greeting: `Hi! Thanks for calling ${name}! I'm Alex, your virtual assistant. How can I help you today?`,
          farewell: `Thanks for calling ${name}! Have a great day!`,
          max_turns: 10,
          business_type: businessType,
        },
      });
      const loc = res.data.location;
      setLocationId(loc.id);
      setCurrentLocation(loc);
      setLocations([loc]);
      setCurrentStep('knowledge');
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  function next() {
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) setCurrentStep(nextStep);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#09090d' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white text-sm">Blueslate</span>
        </div>

        {/* Step progress */}
        <div className="hidden sm:flex items-center gap-1">
          {STEPS.slice(0, -1).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all"
                style={i < stepIndex
                  ? { background: '#7c3aed', color: '#fff' }
                  : i === stepIndex
                    ? { background: 'rgba(124,58,237,0.3)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.5)' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#4b5563' }
                }
              >
                {i < stepIndex ? <CheckCircle className="w-3 h-3" /> : i + 1}
              </div>
              <span className="text-xs hidden md:block" style={{ color: i === stepIndex ? '#a78bfa' : '#4b5563' }}>
                {STEP_LABELS[i]}
              </span>
              {i < STEPS.length - 2 && <ChevronRight className="w-3 h-3 text-gray-700" />}
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/')}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Skip setup
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center py-12 px-6">
        <div className="w-full max-w-lg">
          {/* Background glow */}
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none"
            style={{ background: '#7c3aed' }} />

          <div
            className="relative rounded-3xl p-8"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Step icons row */}
            <div className="flex items-center gap-3 mb-8">
              {[Building2, Globe, Bot, Phone, CheckCircle].map((Icon, i) => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full transition-all duration-500"
                  style={{ background: i <= stepIndex ? '#7c3aed' : 'rgba(255,255,255,0.08)' }}
                />
              ))}
            </div>

            {creating && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Creating your location…</p>
                </div>
              </div>
            )}

            {!creating && currentStep === 'welcome' && (
              <StepWelcome onNext={handleWelcomeNext} />
            )}
            {!creating && currentStep === 'knowledge' && locationId && (
              <StepKnowledge locationId={locationId} onNext={next} />
            )}
            {!creating && currentStep === 'agent' && locationId && (
              <StepAgentConfig locationId={locationId} businessName={businessName} onNext={next} />
            )}
            {!creating && currentStep === 'test' && locationId && (
              <StepTestCall locationId={locationId} onNext={next} />
            )}
            {!creating && currentStep === 'done' && (
              <StepDone businessName={businessName} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

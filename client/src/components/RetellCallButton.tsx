import { useEffect, useRef, useState } from 'react';
import { Mic, PhoneOff, Loader2, Phone } from 'lucide-react';
import { RetellWebClient } from 'retell-client-js-sdk';
import api from '../lib/api';

// ──────────────────────────────────────────────────────────────
// "Talk to AI" — starts an in-browser voice conversation with the
// SAME Retell agent assigned to the inbound phone number.
// The browser asks our backend for a short-lived access token
// (/api/retell/web-call), then joins the call over WebRTC.
//
// Works on desktop + mobile browsers (Chrome, Edge, Safari).
// Reusable across pages — drop <RetellCallButton /> anywhere.
// ──────────────────────────────────────────────────────────────

type CallState = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

interface Props {
  /** Optionally bind the call to a specific location's KB (defaults to demo). */
  locationId?: string;
  /** Compact pill vs. full card. */
  variant?: 'card' | 'pill';
  className?: string;
}

export default function RetellCallButton({ locationId, variant = 'card', className = '' }: Props) {
  const [state, setState] = useState<CallState>('idle');
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState<Array<{ role: string; content: string }>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clientRef = useRef<RetellWebClient | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Lazily create one Retell web client and wire its events.
  function getClient(): RetellWebClient {
    if (clientRef.current) return clientRef.current;
    const client = new RetellWebClient();
    client.on('call_started', () => { setState('active'); setErrMsg(''); });
    client.on('call_ended', () => { setState('ended'); setAiSpeaking(false); });
    client.on('agent_start_talking', () => setAiSpeaking(true));
    client.on('agent_stop_talking', () => setAiSpeaking(false));
    // Live transcript — Retell sends the rolling conversation (last few lines).
    client.on('update', (update: any) => {
      const t = update?.transcript;
      if (Array.isArray(t)) {
        setTranscript(
          t
            .filter((u: any) => u && typeof u.content === 'string' && u.content.trim())
            .map((u: any) => ({ role: u.role === 'agent' ? 'agent' : 'user', content: u.content }))
        );
      }
    });
    client.on('error', (e: unknown) => {
      const msg = e instanceof Error ? e.message
        : (typeof e === 'object' && e && 'message' in e ? String((e as any).message) : 'Call failed. Please try again.');
      setErrMsg(msg);
      setState('error');
      setAiSpeaking(false);
      try { client.stopCall(); } catch { /* noop */ }
    });
    clientRef.current = client;
    return client;
  }

  // Call-duration timer.
  useEffect(() => {
    if (state === 'active') {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  // Stop the call if the component unmounts mid-call.
  useEffect(() => () => { try { clientRef.current?.stopCall(); } catch { /* noop */ } }, []);

  // Keep the transcript scrolled to the latest line.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript]);

  async function startCall() {
    setState('connecting');
    setErrMsg('');
    setTranscript([]);
    try {
      // 1) Get a short-lived access token from our backend (keeps the API key server-side).
      const { data } = await api.post('/retell/web-call', locationId ? { locationId } : {});
      if (!data?.accessToken) throw new Error('Voice assistant is not available right now.');
      // 2) Join the call.
      await getClient().startCall({ accessToken: data.accessToken });
      // 'call_started' flips state to 'active'
    } catch (e: any) {
      const apiMsg = e?.response?.data?.error;
      setErrMsg(apiMsg || (e instanceof Error ? e.message : 'Could not start the call. Allow mic access and try again.'));
      setState('error');
    }
  }

  function endCall() {
    try { clientRef.current?.stopCall(); } catch { /* noop */ }
    setState('ended');
  }

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  const inCall = state === 'connecting' || state === 'active';

  // ── Pill variant (compact, for nav/headers) ──
  if (variant === 'pill') {
    return (
      <button
        onClick={inCall ? endCall : startCall}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 ${className}`}
        style={{ background: inCall ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
        {state === 'connecting' ? <Loader2 className="w-4 h-4 animate-spin" />
          : inCall ? <PhoneOff className="w-4 h-4" />
          : <Mic className="w-4 h-4" />}
        {state === 'connecting' ? 'Connecting…' : state === 'active' ? `End · ${fmt(seconds)}` : 'Talk to AI'}
      </button>
    );
  }

  // ── Card variant (default) ──
  return (
    <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
      {/* Mic orb */}
      <button onClick={inCall ? endCall : startCall} aria-label={inCall ? 'End call' : 'Talk to AI'}
        className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ background: inCall ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 30px rgba(124,58,237,0.45)' }}>
        {state === 'active' && (
          <span className="absolute inset-[-10px] rounded-full animate-ping opacity-20" style={{ background: aiSpeaking ? '#a78bfa' : '#7c3aed' }} />
        )}
        {state === 'connecting' ? <Loader2 className="w-8 h-8 text-white animate-spin" />
          : inCall ? <PhoneOff className="w-8 h-8 text-white" />
          : <Phone className="w-8 h-8 text-white fill-white" />}
      </button>

      {/* Status line */}
      <div>
        {state === 'idle' && <p className="text-white font-bold text-sm">Talk to AI</p>}
        {state === 'connecting' && <p className="text-purple-300 font-bold text-sm">Connecting…</p>}
        {state === 'active' && (
          <p className="font-bold text-sm" style={{ color: aiSpeaking ? '#a78bfa' : '#4ade80' }}>
            {aiSpeaking ? 'AI is speaking…' : 'Listening — just talk'} · {fmt(seconds)}
          </p>
        )}
        {state === 'ended' && <p className="text-gray-400 font-bold text-sm">Call ended</p>}
        {state === 'error' && <p className="text-red-400 text-sm max-w-[16rem]">{errMsg}</p>}
        {(state === 'idle' || state === 'ended' || state === 'error') && (
          <p className="text-xs text-gray-500 mt-1">Free, no signup. Works on phone &amp; desktop.</p>
        )}
      </div>

      {/* Live transcript — appears during/after the call */}
      {(inCall || transcript.length > 0) && (
        <div className="w-full max-w-[20rem] mt-2 rounded-xl border border-white/10 bg-black/30 p-3 text-left max-h-44 overflow-y-auto">
          {transcript.length === 0 ? (
            <p className="text-[11px] text-gray-500 italic">Transcript will appear here as you talk…</p>
          ) : (
            <div className="space-y-1.5">
              {transcript.map((t, i) => (
                <div key={i} className="text-xs leading-snug">
                  <span className={t.role === 'agent' ? 'text-purple-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                    {t.role === 'agent' ? 'Alex' : 'You'}:
                  </span>{' '}
                  <span className="text-gray-200">{t.content}</span>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      )}

      {(state === 'ended' || state === 'error') && (
        <button onClick={startCall} className="text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2">
          Start again
        </button>
      )}
    </div>
  );
}

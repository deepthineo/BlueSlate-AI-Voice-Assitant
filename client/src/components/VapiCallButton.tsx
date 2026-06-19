import { useEffect, useRef, useState } from 'react';
import { Mic, PhoneOff, Loader2, Phone } from 'lucide-react';
import { getVapi, VAPI_ASSISTANT_ID, isVapiConfigured } from '../lib/vapi';

// ──────────────────────────────────────────────────────────────
// "Talk to AI" — starts an in-browser voice conversation with the
// SAME Vapi assistant assigned to the inbound phone number.
// Works on desktop + mobile browsers (Chrome, Edge, Safari) since
// the Vapi Web SDK uses WebRTC, not the Web Speech API.
//
// Reusable across pages — drop <VapiCallButton /> anywhere.
// ──────────────────────────────────────────────────────────────

type CallState = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

interface Props {
  /** Override the default assistant (defaults to VITE_VAPI_ASSISTANT_ID). */
  assistantId?: string;
  /** Compact pill vs. full card. */
  variant?: 'card' | 'pill';
  className?: string;
}

export default function VapiCallButton({ assistantId, variant = 'card', className = '' }: Props) {
  const [state, setState] = useState<CallState>('idle');
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const id = assistantId ?? VAPI_ASSISTANT_ID;

  // Wire up Vapi event listeners once.
  useEffect(() => {
    const vapi = getVapi();
    if (!vapi) return;

    const onStart = () => { setState('active'); setErrMsg(''); };
    const onEnd = () => { setState('ended'); setAiSpeaking(false); };
    const onSpeechStart = () => setAiSpeaking(true);
    const onSpeechEnd = () => setAiSpeaking(false);
    const onError = (e: unknown) => {
      const msg = e instanceof Error ? e.message : (typeof e === 'object' && e && 'message' in e ? String((e as any).message) : 'Call failed. Please try again.');
      setErrMsg(msg);
      setState('error');
      setAiSpeaking(false);
    };

    vapi.on('call-start', onStart);
    vapi.on('call-end', onEnd);
    vapi.on('speech-start', onSpeechStart);
    vapi.on('speech-end', onSpeechEnd);
    vapi.on('error', onError);

    return () => {
      vapi.off('call-start', onStart);
      vapi.off('call-end', onEnd);
      vapi.off('speech-start', onSpeechStart);
      vapi.off('speech-end', onSpeechEnd);
      vapi.off('error', onError);
    };
  }, []);

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
  useEffect(() => () => { getVapi()?.stop().catch(() => {}); }, []);

  async function startCall() {
    const vapi = getVapi();
    if (!vapi || !id) { setErrMsg('Voice assistant is not configured yet.'); setState('error'); return; }
    setState('connecting');
    setErrMsg('');
    try {
      await vapi.start(id);
      // 'call-start' event flips state to 'active'
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Could not start the call. Allow mic access and try again.');
      setState('error');
    }
  }

  function endCall() {
    getVapi()?.stop().catch(() => {});
    setState('ended');
  }

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // Unconfigured build — render nothing (callers can show phone-only).
  if (!isVapiConfigured) return null;

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

      {(state === 'ended' || state === 'error') && (
        <button onClick={startCall} className="text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2">
          Start again
        </button>
      )}
    </div>
  );
}

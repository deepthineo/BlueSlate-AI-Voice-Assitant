import { useEffect, useState, useRef } from 'react';
import {
  PhoneOutgoing, Phone, CheckCircle, X, Loader2, AlertCircle,
  Clock, TrendingUp, Users, PhoneCall, Play, StopCircle,
} from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import api from '../lib/api';
import { useLocationStore } from '../hooks/useLocation';
import { formatDuration, timeAgo, statusBadgeColor } from '../lib/utils';
import type { Call } from '../types';

// ── Quick Dial Modal ─────────────────────────────────────────────
function QuickDialModal({
  locationId,
  onClose,
  onCallStarted,
}: {
  locationId: string;
  onClose: () => void;
  onCallStarted: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'calling' | 'ringing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function dial() {
    if (!phone.trim()) return;
    setStatus('calling');
    try {
      await api.post('/voice/outbound', {
        toPhone: phone.trim(),
        locationId,
        context: [name && `Calling ${name}`, reason].filter(Boolean).join('. '),
      });
      setStatus('ringing');
      setTimeout(() => { setStatus('done'); onCallStarted(); }, 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to initiate call. Check that your Twilio number is configured.');
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-md rounded-3xl p-7 relative"
        style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/10 transition-all">
          <X className="w-4 h-4" />
        </button>

        {status === 'idle' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
                <PhoneOutgoing className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Quick Dial</h3>
                <p className="text-xs text-gray-500">Your AI agent will call and introduce itself</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone number <span className="text-red-400">*</span></label>
                <input
                  ref={inputRef}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && dial()}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-xl text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Contact name <span className="text-gray-500">(optional)</span></label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full px-4 py-3 rounded-xl text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Context for AI <span className="text-gray-500">(optional)</span></label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Previously asked about Fortnite coaching"
                  className="w-full px-4 py-3 rounded-xl text-gray-200 placeholder-gray-600 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>

            <div
              className="mt-4 p-3 rounded-xl text-xs text-gray-500 flex items-start gap-2"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}
            >
              <Phone className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
              Your AI will introduce itself from your Twilio number, have a natural conversation, and log the outcome automatically.
            </div>

            <button
              disabled={!phone.trim()}
              onClick={dial}
              className="mt-5 w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
            >
              <PhoneOutgoing className="w-4 h-4" /> Start AI Call
            </button>
          </>
        )}

        {status === 'calling' && (
          <div className="text-center py-8">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Initiating call…</p>
            <p className="text-sm text-gray-500 mt-1">Connecting your AI agent to {phone}</p>
          </div>
        )}

        {status === 'ringing' && (
          <div className="text-center py-8">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(124,58,237,0.3)' }} />
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
                <Phone className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-white font-semibold">Ringing {phone}…</p>
            <p className="text-sm text-gray-500 mt-1">AI agent will speak when they answer</p>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-white font-semibold">Call in progress!</p>
            <p className="text-sm text-gray-400 mt-1 mb-6">Your AI is handling the conversation. The lead will appear in your dashboard when the call ends.</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
              Close &amp; Watch Dashboard
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-white font-semibold mb-2">Call failed</p>
            <p className="text-sm text-red-300 mb-5">{errorMsg}</p>
            <p className="text-xs text-gray-500 mb-5">Make sure your Twilio number is configured in Settings → Location Phone.</p>
            <div className="flex gap-3">
              <button onClick={() => setStatus('idle')} className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-300 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Try Again
              </button>
              <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Campaigns page ──────────────────────────────────────────
export default function Campaigns() {
  const { currentLocation } = useLocationStore();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialOpen, setDialOpen] = useState(false);

  useEffect(() => {
    if (!currentLocation) return;
    setLoading(true);
    api.get('/calls?pageSize=50')
      .then((res) => {
        const all: Call[] = res.data.calls ?? [];
        setCalls(all.filter((c) => c.direction === 'outbound'));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentLocation]);

  function reload() {
    if (!currentLocation) return;
    api.get('/calls?pageSize=50').then((res) => {
      const all: Call[] = res.data.calls ?? [];
      setCalls(all.filter((c) => c.direction === 'outbound'));
    }).catch(console.error);
  }

  const connected = calls.filter((c) => c.status === 'completed').length;
  const noAnswer = calls.filter((c) => c.status === 'no_answer').length;
  const inProgress = calls.filter((c) => c.status === 'in_progress').length;
  const connectRate = calls.length > 0 ? Math.round((connected / calls.length) * 100) : 0;

  const kpis = [
    { label: 'Total Dials', value: calls.length, icon: PhoneOutgoing, color: '#a78bfa', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Connected', value: connected, icon: CheckCircle, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    { label: 'No Answer', value: noAnswer, icon: PhoneCall, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    { label: 'Connect Rate', value: `${connectRate}%`, icon: TrendingUp, color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
  ];

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Outbound Campaigns"
        subtitle="AI-powered follow-up calls"
        action={
          <button
            onClick={() => setDialOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 20px rgba(124,58,237,0.25)' }}
          >
            <PhoneOutgoing className="w-4 h-4" /> New Outbound Call
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: kpi.bg }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <p className="text-2xl font-black text-white">{loading ? '—' : kpi.value}</p>
              <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* How outbound calls work — shown when empty */}
        {!loading && calls.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'rgba(124,58,237,0.06)', border: '1px dashed rgba(124,58,237,0.3)' }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <PhoneOutgoing className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Start following up on warm leads</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
              Your AI agent will call your prospects, introduce itself naturally, and move the conversation toward booking — all while you focus on running your franchise.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
              {[
                { step: '1', text: 'You click "New Outbound Call"' },
                { step: '2', text: 'AI calls the number and speaks naturally' },
                { step: '3', text: 'Outcome + lead auto-logged to dashboard' },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold"
                    style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>{s.step}</div>
                  <p className="text-xs text-gray-500">{s.text}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setDialOpen(true)}
              className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 mx-auto transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
            >
              <Play className="w-4 h-4" /> Make Your First Outbound Call
            </button>
          </div>
        )}

        {/* Call list */}
        {calls.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300">Outbound Call History</h2>
              {inProgress > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  <span className="text-emerald-300">{inProgress} in progress</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['To', 'Status', 'Duration', 'Summary', 'Time'].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call) => (
                    <tr key={call.id} className="border-b border-gray-800/50 last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs text-gray-300">{call.to_number ?? call.from_number}</td>
                      <td className="py-3 pr-4">
                        <span className={`badge ${statusBadgeColor(call.status)}`}>{call.status.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 pr-4 text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {call.duration_sec ? formatDuration(call.duration_sec) : '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-400 max-w-xs truncate">
                        {call.summary ?? <span className="text-gray-600">—</span>}
                      </td>
                      <td className="py-3 text-gray-500 text-xs whitespace-nowrap">{timeAgo(call.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tips card */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" /> Best practices for outbound AI calls
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: 'Call warm leads first', desc: 'Start with leads scored 60+ from your inbound calls — they already know your brand.' },
              { title: 'Add context for the AI', desc: 'Tell the AI what the contact asked about. It creates a personalized, relevant opening.' },
              { title: 'Best time: 10am–12pm', desc: 'Outbound connect rates are highest mid-morning on weekdays. Avoid evenings.' },
            ].map((tip) => (
              <div key={tip.title} className="p-3 rounded-xl" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
                <p className="text-xs font-semibold text-purple-300 mb-1">{tip.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dialOpen && currentLocation && (
        <QuickDialModal
          locationId={currentLocation.id}
          onClose={() => setDialOpen(false)}
          onCallStarted={() => { setDialOpen(false); setTimeout(reload, 3000); }}
        />
      )}
    </div>
  );
}

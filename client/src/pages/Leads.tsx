import { useEffect, useState } from 'react';
import { TrendingUp, Phone, PhoneCall, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import api from '../lib/api';
import { useLocationStore } from '../hooks/useLocation';
import { cn, timeAgo, scoreBg, statusBadgeColor } from '../lib/utils';
import type { Lead, LeadStats } from '../types';

const STATUS_OPTIONS = ['all', 'new', 'contacted', 'qualified', 'booked', 'converted', 'dead'];

// ── Outbound call modal ─────────────────────────────────────────
function OutboundCallModal({
  lead,
  locationId,
  onClose,
  onCallStarted,
}: {
  lead: Lead;
  locationId: string;
  onClose: () => void;
  onCallStarted: () => void;
}) {
  const [status, setStatus] = useState<'idle' | 'calling' | 'ringing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function startCall() {
    setStatus('calling');
    try {
      await api.post('/voice/outbound', {
        toPhone: lead.phone,
        locationId,
        leadId: lead.id,
        context: lead.core_interest ? `Lead is interested in: ${lead.core_interest}` : '',
      });
      setStatus('ringing');
      setTimeout(() => {
        setStatus('done');
        onCallStarted();
      }, 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start call');
      setStatus('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-md rounded-3xl p-7 relative"
        style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {status === 'idle' && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <PhoneCall className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Call this lead</h3>
                <p className="text-sm text-gray-500">AI agent will call on your behalf</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-gray-500 mb-3">Call details</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Calling</span>
                    <span className="text-gray-200 font-medium">{lead.name ?? 'Unknown Caller'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Phone</span>
                    <span className="text-gray-200 font-mono">{lead.phone ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Interest</span>
                    <span className="text-gray-200">{lead.core_interest ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Prior outcome</span>
                    <span className="text-gray-200 capitalize">{lead.call_outcome ?? '—'}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl text-xs text-gray-400" style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}>
                Your AI agent will call this lead, mention their prior inquiry, and try to book a free trial or gather contact info.
              </div>
            </div>

            {!lead.phone ? (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-300">No phone number on file for this lead</span>
              </div>
            ) : (
              <button
                onClick={startCall}
                className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
              >
                <Phone className="w-4 h-4" /> Start AI Call
              </button>
            )}
          </>
        )}

        {status === 'calling' && (
          <div className="text-center py-6">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="font-semibold text-white mb-1">Initiating call…</p>
            <p className="text-sm text-gray-500">Connecting to Twilio…</p>
          </div>
        )}

        {status === 'ringing' && (
          <div className="text-center py-6">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(124,58,237,0.3)' }} />
              <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }}>
                <Phone className="w-7 h-7 text-purple-400" />
              </div>
            </div>
            <p className="font-semibold text-white mb-1">Calling {lead.name ?? lead.phone}…</p>
            <p className="text-sm text-gray-500">AI agent dialing — ringing now</p>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="font-bold text-white mb-2">Call initiated!</p>
            <p className="text-sm text-gray-400 mb-5">Your AI agent is calling {lead.name ?? lead.phone}. The call and any new lead data will appear in Call History.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Close
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="font-bold text-white mb-2">Call failed</p>
            <p className="text-sm text-gray-400 mb-5">{errorMsg}</p>
            <div className="flex gap-2">
              <button onClick={() => setStatus('idle')} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-300"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Try again
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Leads page ─────────────────────────────────────────────
export default function Leads() {
  const { currentLocation } = useLocationStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updating, setUpdating] = useState(false);
  const [callModalLead, setCallModalLead] = useState<Lead | null>(null);

  async function load() {
    try {
      const params = selectedStatus !== 'all' ? `?status=${selectedStatus}` : '';
      const [leadsRes, statsRes] = await Promise.all([
        api.get(`/leads${params}`),
        api.get('/leads/stats'),
      ]);
      setLeads(leadsRes.data.leads ?? []);
      setStats(statsRes.data.stats ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (currentLocation) load(); }, [selectedStatus, currentLocation?.id]);

  async function updateStatus(lead: Lead, status: string) {
    setUpdating(true);
    try {
      const res = await api.patch(`/leads/${lead.id}`, { status });
      setLeads((prev) => prev.map((l) => l.id === lead.id ? res.data.lead : l));
      setSelectedLead(res.data.lead);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Leads" subtitle="Auto-extracted from every call — scored and ready to action" />

      {/* Outbound call modal */}
      {callModalLead && currentLocation && (
        <OutboundCallModal
          lead={callModalLead}
          locationId={currentLocation.id}
          onClose={() => setCallModalLead(null)}
          onCallStarted={() => {
            // Mark as contacted
            updateStatus(callModalLead, 'contacted');
          }}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: list */}
        <div className={cn('flex flex-col border-r border-gray-800', selectedLead ? 'w-96 flex-shrink-0' : 'flex-1')}>
          {/* Stats strip */}
          {stats && (
            <div className="flex gap-4 px-4 py-3 border-b border-gray-800 bg-gray-900/50">
              {[
                { label: 'Total', value: stats.total },
                { label: 'New', value: stats.new },
                { label: 'Booked', value: stats.booked },
                { label: 'Hot', value: stats.hot },
                { label: 'Avg Score', value: stats.avgScore },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Status filter */}
          <div className="flex gap-1 px-3 py-2.5 border-b border-gray-800 overflow-x-auto">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  selectedStatus === s
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Leads list */}
          <div className="flex-1 overflow-y-auto">
            {loading && <p className="text-sm text-gray-500 text-center py-8">Loading…</p>}
            {!loading && leads.length === 0 && (
              <div className="text-center py-12">
                <TrendingUp className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No leads yet</p>
                <p className="text-xs text-gray-600 mt-1">Leads are extracted automatically after calls</p>
              </div>
            )}
            {leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors',
                  selectedLead?.id === lead.id && 'bg-gray-800/70'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{lead.name ?? 'Unknown Caller'}</p>
                    <p className="text-xs text-gray-500 font-mono">{lead.phone ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{lead.core_interest ?? lead.call_outcome ?? '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`badge ${scoreBg(lead.score)}`}>{lead.score}</span>
                    <span className={`badge ${statusBadgeColor(lead.status)}`}>{lead.status}</span>
                    <span className="text-xs text-gray-600">{timeAgo(lead.created_at)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel: detail */}
        {selectedLead && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl space-y-5">
              {/* Lead header + action buttons */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedLead.name ?? 'Unknown Caller'}</h2>
                  <p className="text-sm text-gray-400 font-mono mt-0.5">{selectedLead.phone ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge text-base px-3 py-1 ${scoreBg(selectedLead.score)}`}>
                    {selectedLead.score}
                  </span>
                  {/* Call Lead button */}
                  <button
                    onClick={() => setCallModalLead(selectedLead)}
                    disabled={!selectedLead.phone}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
                    title={selectedLead.phone ? 'Call this lead with AI agent' : 'No phone number on file'}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Call
                  </button>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Outcome', value: selectedLead.call_outcome ?? '—' },
                  { label: 'Status', value: selectedLead.status },
                  { label: 'Interest', value: selectedLead.core_interest ?? '—' },
                ].map((item) => (
                  <div key={item.label} className="card">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-sm font-medium text-gray-200 mt-0.5 truncate capitalize">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Status update */}
              <div className="card">
                <label className="label">Update Status</label>
                <div className="flex gap-2 flex-wrap">
                  {['new', 'contacted', 'qualified', 'booked', 'converted', 'dead'].map((s) => (
                    <button
                      key={s}
                      disabled={updating || selectedLead.status === s}
                      onClick={() => updateStatus(selectedLead, s)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                        selectedLead.status === s
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Score reasoning */}
              {selectedLead.score_reason && (
                <div className="card">
                  <p className="text-xs text-gray-500 mb-1">Score Reasoning</p>
                  <p className="text-sm text-gray-300">{selectedLead.score_reason}</p>
                </div>
              )}

              {/* Raw extraction */}
              {selectedLead.raw_extraction && Object.keys(selectedLead.raw_extraction).length > 0 && (
                <div className="card">
                  <p className="text-xs text-gray-500 mb-3">AI Extraction Details</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(selectedLead.raw_extraction)
                      .filter(([, v]) => v !== null && v !== undefined && v !== '')
                      .map(([k, v]) => (
                        <div key={k}>
                          <p className="text-xs text-gray-600 capitalize">{k.replace(/_/g, ' ')}</p>
                          <p className="text-gray-300 mt-0.5 text-xs">
                            {Array.isArray(v) ? v.join(', ') : String(v)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Call transcript */}
              {selectedLead.calls?.transcript && (
                <div className="card">
                  <p className="text-xs text-gray-500 mb-3">Call Transcript</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedLead.calls.transcript.split('\n').map((line, i) => {
                      const isAgent = line.startsWith('Agent:');
                      return (
                        <p key={i} className={cn('text-xs', isAgent ? 'text-brand-400' : 'text-gray-300')}>
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Next action */}
              {selectedLead.notes && (
                <div className="card border-brand-600/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-brand-400 font-semibold">Recommended Next Action</span>
                    <button
                      onClick={() => setCallModalLead(selectedLead)}
                      disabled={!selectedLead.phone}
                      className="ml-auto flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-40"
                    >
                      <Phone className="w-3 h-3" /> Call now
                    </button>
                  </div>
                  <p className="text-sm text-gray-300">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

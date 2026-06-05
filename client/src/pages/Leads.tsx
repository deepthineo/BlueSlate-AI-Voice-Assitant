import { useEffect, useState } from 'react';
import { Search, ChevronRight, Phone, TrendingUp, Filter } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import api from '../lib/api';
import { useLocationStore } from '../hooks/useLocation';
import { cn, timeAgo, scoreBg, statusBadgeColor } from '../lib/utils';
import type { Lead, LeadStats } from '../types';

const STATUS_OPTIONS = ['all', 'new', 'contacted', 'qualified', 'booked', 'converted', 'dead'];

export default function Leads() {
  const { currentLocation } = useLocationStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updating, setUpdating] = useState(false);

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
            <div className="max-w-2xl space-y-6">
              {/* Lead header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedLead.name ?? 'Unknown Caller'}</h2>
                  <p className="text-sm text-gray-400 font-mono mt-0.5">{selectedLead.phone ?? '—'}</p>
                </div>
                <span className={`badge text-base px-3 py-1 ${scoreBg(selectedLead.score)}`}>
                  Score: {selectedLead.score}
                </span>
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
                    <p className="text-sm font-medium text-gray-200 mt-0.5 truncate">{item.value}</p>
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
                  <p className="text-xs text-brand-400 mb-1">Recommended Next Action</p>
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

import { useEffect, useState } from 'react';
import { Phone, Clock, Smile, Frown, Meh } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import api from '../lib/api';
import { useLocationStore } from '../hooks/useLocation';
import { statusBadgeColor, formatDuration, formatDateTime, timeAgo } from '../lib/utils';
import type { Call } from '../types';

export default function Calls() {
  const { currentLocation } = useLocationStore();
  const [calls, setCalls] = useState<Call[]>([]);
  const [selected, setSelected] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentLocation) return;
    api.get('/calls?pageSize=50')
      .then((res) => setCalls(res.data.calls ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentLocation?.id]);

  async function loadFull(call: Call) {
    const res = await api.get(`/calls/${call.id}`);
    setSelected(res.data.call);
  }

  function SentimentIcon({ score }: { score: number | null }) {
    if (score === null) return <Meh className="w-4 h-4 text-gray-500" />;
    if (score >= 0.3) return <Smile className="w-4 h-4 text-emerald-400" />;
    if (score <= -0.3) return <Frown className="w-4 h-4 text-red-400" />;
    return <Meh className="w-4 h-4 text-yellow-400" />;
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Calls" subtitle="Every inbound call — transcribed and analyzed" />

      <div className="flex-1 flex overflow-hidden">
        {/* Call list */}
        <div className="w-96 flex-shrink-0 border-r border-gray-800 overflow-y-auto">
          {loading && <p className="text-sm text-gray-500 text-center py-8">Loading…</p>}
          {!loading && calls.length === 0 && (
            <div className="text-center py-12">
              <Phone className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No calls yet</p>
            </div>
          )}
          {calls.map((call) => (
            <button
              key={call.id}
              onClick={() => loadFull(call)}
              className={`w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${selected?.id === call.id ? 'bg-gray-800/70' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-mono text-gray-200">{call.from_number}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{call.summary ?? 'No summary'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge ${statusBadgeColor(call.status)}`}>{call.status}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDuration(call.duration_sec)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <SentimentIcon score={call.sentiment_score} />
                  <span className="text-xs text-gray-600">{timeAgo(call.started_at)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Call detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Phone className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">Select a call to view details</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-white font-mono">{selected.from_number}</p>
                  <p className="text-sm text-gray-400">{formatDateTime(selected.started_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${statusBadgeColor(selected.status)}`}>{selected.status}</span>
                  <span className="text-sm text-gray-400">{formatDuration(selected.duration_sec)}</span>
                </div>
              </div>

              {selected.summary && (
                <div className="card">
                  <p className="text-xs text-gray-500 mb-1">Summary</p>
                  <p className="text-sm text-gray-300">{selected.summary}</p>
                  {selected.sentiment_score !== null && (
                    <p className="text-xs text-gray-500 mt-2">
                      Sentiment: {selected.sentiment_score >= 0 ? '+' : ''}{(selected.sentiment_score * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              )}

              {selected.transcript && (
                <div className="card">
                  <p className="text-xs text-gray-500 mb-3">Transcript</p>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selected.transcript.split('\n').filter(Boolean).map((line, i) => {
                      const isAgent = line.startsWith('Agent:');
                      return (
                        <div key={i} className={`flex gap-3 ${isAgent ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isAgent ? 'bg-brand-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                            {isAgent ? 'AI' : 'C'}
                          </div>
                          <div className={`max-w-xs px-3 py-2 rounded-xl text-xs ${isAgent ? 'bg-brand-600/20 text-brand-300 text-right' : 'bg-gray-800 text-gray-300'}`}>
                            {line.replace(/^(Agent|Caller): /, '')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

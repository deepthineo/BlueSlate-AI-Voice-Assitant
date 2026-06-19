import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import TopBar from '../components/layout/TopBar';
import api from '../lib/api';
import type { LeadStats, CallStats } from '../types';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

export default function Analytics() {
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [callStats, setCallStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/leads/stats'), api.get('/calls/stats?days=30')]).then(([l, c]) => {
      setLeadStats(l.data.stats);
      setCallStats(c.data.stats);
      setLoading(false);
    });
  }, []);

  const funnelData = leadStats ? [
    { name: 'Total Leads', value: leadStats.total },
    { name: 'Qualified', value: leadStats.qualified },
    { name: 'Booked', value: leadStats.booked },
    { name: 'Converted', value: leadStats.converted },
  ] : [];

  const outcomeData = leadStats
    ? Object.entries(leadStats.outcomeBreakdown).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    : [];

  const callBreakdown = callStats ? [
    { name: 'Completed', value: callStats.completed },
    { name: 'Failed', value: callStats.failed },
    { name: 'No Answer', value: callStats.noAnswer },
  ] : [];

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Analytics" subtitle="30-day performance intelligence" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-12">Loading…</p>
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Calls', value: callStats?.total ?? 0, color: 'text-blue-400' },
                { label: 'Avg Call Duration', value: callStats ? `${Math.floor((callStats.avgDurationSec ?? 0) / 60)}m ${(callStats.avgDurationSec ?? 0) % 60}s` : '—', color: 'text-purple-400' },
                { label: 'Leads Captured', value: leadStats?.total ?? 0, color: 'text-emerald-400' },
                { label: 'Avg Lead Score', value: leadStats?.avgScore ?? 0, color: 'text-yellow-400' },
              ].map((kpi) => (
                <div key={kpi.label} className="card text-center">
                  <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-sm text-gray-400 mt-1">{kpi.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conversion Funnel */}
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Lead Conversion Funnel</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Call Outcomes Pie */}
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Call Outcomes</h3>
                {callBreakdown.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={callBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                        {callBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
                )}
              </div>

              {/* Lead Outcomes */}
              <div className="card lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Lead Outcomes Breakdown</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={outcomeData}>
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {outcomeData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

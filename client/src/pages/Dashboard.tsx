import { useEffect, useState } from 'react';
import { Phone, Users, TrendingUp, Star, ArrowUpRight, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import TopBar from '../components/layout/TopBar';
import api from '../lib/api';
import { formatDateTime, formatDuration, statusBadgeColor, scoreBg, timeAgo } from '../lib/utils';
import type { Lead, Call, LeadStats, CallStats } from '../types';

interface DashboardData {
  leadStats: LeadStats | null;
  callStats: CallStats | null;
  recentLeads: Lead[];
  recentCalls: Call[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    leadStats: null,
    callStats: null,
    recentLeads: [],
    recentCalls: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [leadStatsRes, callStatsRes, leadsRes, callsRes] = await Promise.all([
          api.get('/leads/stats'),
          api.get('/calls/stats'),
          api.get('/leads?pageSize=5'),
          api.get('/calls?pageSize=5'),
        ]);
        setData({
          leadStats: leadStatsRes.data.stats ?? null,
          callStats: callStatsRes.data.stats ?? null,
          recentLeads: leadsRes.data.leads ?? [],
          recentCalls: callsRes.data.calls ?? [],
        });
      } catch (err) {
        console.error('Dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { leadStats, callStats, recentLeads, recentCalls } = data;

  const kpis = [
    {
      label: 'Total Calls',
      value: callStats?.total ?? '—',
      sub: `${callStats?.completed ?? 0} completed`,
      icon: Phone,
      iconColor: '#3B82F6',
      iconBg: 'bg-blue-50',
      accent: '#3b82f6',
    },
    {
      label: 'Leads Captured',
      value: leadStats?.total ?? '—',
      sub: `${leadStats?.last7Days ?? 0} this week`,
      icon: Users,
      iconColor: '#0EA98B',
      iconBg: 'bg-brand-teal/10',
      accent: '#0EA98B',
    },
    {
      label: 'Hot Leads',
      value: leadStats?.hot ?? '—',
      sub: `score ≥ 70`,
      icon: TrendingUp,
      iconColor: '#10b981',
      iconBg: 'bg-emerald-50',
      accent: '#10b981',
    },
    {
      label: 'Avg Call Score',
      value: `${(callStats?.avgSentiment ?? 0) >= 0 ? '+' : ''}${((callStats?.avgSentiment ?? 0) * 100).toFixed(0)}`,
      sub: 'sentiment',
      icon: Star,
      iconColor: '#f59e0b',
      iconBg: 'bg-amber-50',
      accent: '#f59e0b',
    },
  ];

  const outcomeData = leadStats?.outcomeBreakdown
    ? Object.entries(leadStats.outcomeBreakdown).map(([k, v]) => ({ name: k.replace('_', ' '), value: v }))
    : [];

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Dashboard" subtitle="XP League Frisco — real-time overview" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="relative overflow-hidden rounded-card p-5 bg-white border border-neutral-border shadow-card"
            >
              {/* Background accent blob */}
              <div
                className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 blur-xl"
                style={{ background: kpi.accent }}
              />
              <div className={`w-10 h-10 rounded-button flex items-center justify-center mb-4 relative ${kpi.iconBg}`}>
                <kpi.icon className="w-5 h-5" style={{ color: kpi.iconColor }} />
              </div>
              <p className="text-3xl font-bold text-neutral-ink tracking-tight relative">
                {loading ? <span className="text-neutral-gray">—</span> : kpi.value}
              </p>
              <p className="text-sm font-medium text-neutral-gray mt-1 relative">{kpi.label}</p>
              <p className="text-xs mt-0.5 relative text-neutral-gray">{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Call Outcome Chart */}
          <div className="card">
            <h2 className="text-sm font-semibold text-neutral-ink mb-4">Lead Outcomes</h2>
            {outcomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={outcomeData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12 }}
                    labelStyle={{ color: '#111827' }}
                    itemStyle={{ color: '#0EA98B' }}
                  />
                  <Bar dataKey="value" fill="#0EA98B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-neutral-gray text-sm">No data yet</div>
            )}
          </div>

          {/* Recent Leads */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-ink">Recent Leads</h2>
              <a href="/leads" className="text-xs text-brand-teal hover:text-brand-teal-dark flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-3">
              {recentLeads.length === 0 && !loading && (
                <p className="text-sm text-neutral-gray text-center py-6">No leads yet. Make a test call!</p>
              )}
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-neutral-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-ink truncate">{lead.name ?? 'Unknown Caller'}</p>
                    <p className="text-xs text-neutral-gray truncate">{lead.core_interest ?? lead.call_outcome ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`badge ${scoreBg(lead.score)}`}>{lead.score}</span>
                    <span className={`badge ${statusBadgeColor(lead.status)}`}>{lead.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Calls */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-ink">Recent Calls</h2>
            <a href="/calls" className="text-xs text-brand-teal hover:text-brand-teal-dark flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-border">
                  {['From', 'Status', 'Duration', 'Summary', 'Time'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-neutral-gray pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCalls.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center text-neutral-gray py-6">No calls yet</td>
                  </tr>
                )}
                {recentCalls.map((call) => (
                  <tr key={call.id} className="border-b border-neutral-border/50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-neutral-ink">{call.from_number}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`badge ${statusBadgeColor(call.status)}`}>{call.status}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-neutral-gray">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(call.duration_sec)}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-neutral-gray max-w-xs truncate">{call.summary ?? '—'}</td>
                    <td className="py-2.5 text-neutral-gray text-xs whitespace-nowrap">{timeAgo(call.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

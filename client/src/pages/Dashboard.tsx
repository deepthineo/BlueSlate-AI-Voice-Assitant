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
      iconColor: '#60a5fa',
      iconBg: 'rgba(59,130,246,0.12)',
      glow: 'rgba(59,130,246,0.08)',
      accent: '#3b82f6',
    },
    {
      label: 'Leads Captured',
      value: leadStats?.total ?? '—',
      sub: `${leadStats?.last7Days ?? 0} this week`,
      icon: Users,
      iconColor: '#a78bfa',
      iconBg: 'rgba(139,92,246,0.12)',
      glow: 'rgba(139,92,246,0.08)',
      accent: '#8b5cf6',
    },
    {
      label: 'Hot Leads',
      value: leadStats?.hot ?? '—',
      sub: `score ≥ 70`,
      icon: TrendingUp,
      iconColor: '#34d399',
      iconBg: 'rgba(52,211,153,0.12)',
      glow: 'rgba(52,211,153,0.08)',
      accent: '#10b981',
    },
    {
      label: 'Avg Call Score',
      value: `${(callStats?.avgSentiment ?? 0) >= 0 ? '+' : ''}${((callStats?.avgSentiment ?? 0) * 100).toFixed(0)}`,
      sub: 'sentiment',
      icon: Star,
      iconColor: '#fbbf24',
      iconBg: 'rgba(251,191,36,0.12)',
      glow: 'rgba(251,191,36,0.08)',
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
        {/* Talk to your AI — quick entry to the live voice assistant */}
        <a
          href="/live-call"
          className="flex items-center justify-between gap-4 rounded-2xl p-5 border transition-all hover:scale-[1.01]"
          style={{ borderColor: 'rgba(124,58,237,0.4)', background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(147,51,234,0.06))' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
              <Phone className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <p className="text-white font-bold">Talk to your AI receptionist</p>
              <p className="text-sm text-gray-400">Test it live in your browser — free, no phone needed.</p>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-1 text-purple-300 font-semibold text-sm">
            Start <ArrowUpRight className="w-4 h-4" />
          </span>
        </a>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="relative overflow-hidden rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: `1px solid rgba(255,255,255,0.07)`,
                boxShadow: `0 1px 4px rgba(0,0,0,0.5), 0 0 40px ${kpi.glow}`,
              }}
            >
              {/* Background accent blob */}
              <div
                className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 blur-xl"
                style={{ background: kpi.accent }}
              />
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 relative"
                style={{ background: kpi.iconBg }}
              >
                <kpi.icon className="w-5 h-5" style={{ color: kpi.iconColor }} />
              </div>
              <p className="text-3xl font-bold text-white tracking-tight relative">
                {loading ? <span className="text-gray-600">—</span> : kpi.value}
              </p>
              <p className="text-sm font-medium text-gray-400 mt-1 relative">{kpi.label}</p>
              <p className="text-xs mt-0.5 relative" style={{ color: '#475569' }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Call Outcome Chart */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Lead Outcomes</h2>
            {outcomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={outcomeData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#13131c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#a78bfa' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
            )}
          </div>

          {/* Recent Leads */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300">Recent Leads</h2>
              <a href="/leads" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-3">
              {recentLeads.length === 0 && !loading && (
                <p className="text-sm text-gray-600 text-center py-6">No leads yet. Make a test call!</p>
              )}
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{lead.name ?? 'Unknown Caller'}</p>
                    <p className="text-xs text-gray-500 truncate">{lead.core_interest ?? lead.call_outcome ?? '—'}</p>
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
            <h2 className="text-sm font-semibold text-gray-300">Recent Calls</h2>
            <a href="/calls" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['From', 'Status', 'Duration', 'Summary', 'Time'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCalls.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-600 py-6">No calls yet</td>
                  </tr>
                )}
                {recentCalls.map((call) => (
                  <tr key={call.id} className="border-b border-gray-800/50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-gray-300">{call.from_number}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`badge ${statusBadgeColor(call.status)}`}>{call.status}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(call.duration_sec)}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 max-w-xs truncate">{call.summary ?? '—'}</td>
                    <td className="py-2.5 text-gray-500 text-xs whitespace-nowrap">{timeAgo(call.started_at)}</td>
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

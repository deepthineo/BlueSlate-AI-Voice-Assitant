import { Link } from 'react-router-dom';
import {
  Phone, Users, TrendingUp, Star, ArrowUpRight, Clock, ArrowRight, Sparkles, PhoneCall,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDuration, statusBadgeColor, scoreBg, timeAgo } from '../lib/utils';

// ──────────────────────────────────────────────────────────────
// Public, no-login sample dashboard.
// Lets a prospective business owner SEE the full product — populated
// with realistic data — before signing up. All data below is static
// sample data; no API calls, no auth.
// ──────────────────────────────────────────────────────────────

const DEMO_PHONE = (import.meta.env.VITE_DEMO_PHONE as string | undefined) ?? '+1 570 747 4386';

const kpis = [
  { label: 'Total Calls', value: '128', sub: '119 completed', icon: Phone, iconColor: '#60a5fa', iconBg: 'rgba(59,130,246,0.12)', glow: 'rgba(59,130,246,0.08)', accent: '#3b82f6' },
  { label: 'Leads Captured', value: '94', sub: '23 this week', icon: Users, iconColor: '#a78bfa', iconBg: 'rgba(139,92,246,0.12)', glow: 'rgba(139,92,246,0.08)', accent: '#8b5cf6' },
  { label: 'Hot Leads', value: '31', sub: 'score ≥ 70', icon: TrendingUp, iconColor: '#34d399', iconBg: 'rgba(52,211,153,0.12)', glow: 'rgba(52,211,153,0.08)', accent: '#10b981' },
  { label: 'Avg Call Score', value: '+64', sub: 'sentiment', icon: Star, iconColor: '#60a5fa', iconBg: 'rgba(96,165,250,0.12)', glow: 'rgba(96,165,250,0.08)', accent: '#3b82f6' },
];

const outcomeData = [
  { name: 'booked trial', value: 38 },
  { name: 'qualified', value: 29 },
  { name: 'info sent', value: 17 },
  { name: 'not interested', value: 10 },
];

const recentLeads = [
  { id: '1', name: 'Priya Sharma', core_interest: 'Kids coding program — age 9', score: 88, status: 'hot' },
  { id: '2', name: 'Marcus Reed', core_interest: 'Weekend robotics class', score: 76, status: 'hot' },
  { id: '3', name: 'Anita Desai', core_interest: 'Summer camp pricing', score: 61, status: 'warm' },
  { id: '4', name: 'Jordan Lee', core_interest: 'Free trial booking', score: 54, status: 'warm' },
  { id: '5', name: 'Unknown Caller', core_interest: 'General inquiry', score: 28, status: 'cold' },
];

const recentCalls = [
  { id: '1', from_number: '+1 415 555 0142', status: 'completed', duration_sec: 184, summary: 'Booked a free trial for Saturday 10am', started_at: minutesAgo(8) },
  { id: '2', from_number: '+91 98765 43210', status: 'completed', duration_sec: 142, summary: 'Asked about pricing, sent info via SMS', started_at: minutesAgo(41) },
  { id: '3', from_number: '+1 312 555 0199', status: 'completed', duration_sec: 96, summary: 'Wanted weekend class schedule', started_at: minutesAgo(95) },
  { id: '4', from_number: '+1 570 555 0107', status: 'completed', duration_sec: 211, summary: 'Qualified lead — interested in 2 kids enrolling', started_at: minutesAgo(160) },
  { id: '5', from_number: '+91 91234 56789', status: 'missed', duration_sec: 0, summary: '—', started_at: minutesAgo(220) },
];

// Static relative timestamps (computed once at module load; fine for a sample page).
function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

export default function DemoDashboard() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Demo banner */}
      <div className="bg-gradient-to-r from-purple-600/20 to-fuchsia-600/20 border-b border-purple-500/20 px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span className="text-purple-200 font-medium">Sample dashboard — this is what you'll see for your own franchise.</span>
        </div>
        <Link to="/sign-up"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
          Set this up for my business <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Header */}
      <header className="h-14 border-b border-white/[0.05] flex items-center justify-between px-5 flex-shrink-0 gap-3">
        <div className="min-w-0">
          <h1 className="font-semibold text-white text-sm leading-tight">Dashboard</h1>
          <p className="text-xs text-gray-500 truncate">XP League Frisco — real-time overview (demo data)</p>
        </div>
        <a href={`tel:${DEMO_PHONE.replace(/[^\d+]/g, '')}`}
          className="hidden sm:flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 hover:border-purple-500/40 transition-colors">
          <PhoneCall className="w-3.5 h-3.5 text-purple-300" />
          <span className="text-xs text-gray-300 font-mono">{DEMO_PHONE}</span>
        </a>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-6xl w-full mx-auto">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="relative overflow-hidden rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: `0 1px 4px rgba(0,0,0,0.5), 0 0 40px ${kpi.glow}`,
              }}>
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 blur-xl" style={{ background: kpi.accent }} />
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 relative" style={{ background: kpi.iconBg }}>
                <kpi.icon className="w-5 h-5" style={{ color: kpi.iconColor }} />
              </div>
              <p className="text-3xl font-bold text-white tracking-tight relative">{kpi.value}</p>
              <p className="text-sm font-medium text-gray-400 mt-1 relative">{kpi.label}</p>
              <p className="text-xs mt-0.5 relative" style={{ color: '#475569' }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Outcomes */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Lead Outcomes</h2>
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
          </div>

          {/* Recent Leads */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300">Recent Leads</h2>
              <span className="text-xs text-gray-600 flex items-center gap-1">Sample <ArrowUpRight className="w-3 h-3" /></span>
            </div>
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{lead.name}</p>
                    <p className="text-xs text-gray-500 truncate">{lead.core_interest}</p>
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
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">Recent Calls</h2>
            <span className="text-xs text-gray-600 flex items-center gap-1">Sample <ArrowUpRight className="w-3 h-3" /></span>
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
                {recentCalls.map((call) => (
                  <tr key={call.id} className="border-b border-gray-800/50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-gray-300">{call.from_number}</td>
                    <td className="py-2.5 pr-4"><span className={`badge ${statusBadgeColor(call.status)}`}>{call.status}</span></td>
                    <td className="py-2.5 pr-4 text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(call.duration_sec)}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400 max-w-xs truncate">{call.summary}</td>
                    <td className="py-2.5 text-gray-500 text-xs whitespace-nowrap">{timeAgo(call.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom CTA — call live + sign up */}
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(147,51,234,0.06))', border: '1px solid rgba(124,58,237,0.25)' }}>
          <div>
            <p className="text-white font-bold text-lg">Want this for your franchise?</p>
            <p className="text-sm text-gray-400 mt-0.5">Call our live AI to hear it, then set up your own in minutes.</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <a href={`tel:${DEMO_PHONE.replace(/[^\d+]/g, '')}`}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-purple-200 border transition-all hover:scale-105"
              style={{ borderColor: 'rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.08)' }}>
              <PhoneCall className="w-4 h-4" /> {DEMO_PHONE}
            </a>
            <Link to="/sign-up"
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { Zap, Users, Phone, TrendingUp, Activity, LogOut } from 'lucide-react';
import api from '../lib/api';
import { useRole } from '../hooks/useRole';

interface Customer {
  id: string;
  name: string;
  orgId: string;
  createdAt: string;
  phoneNumber: string | null;
  websiteUrl: string | null;
  hasAI: boolean;
  callCount: number;
  leadCount: number;
  kbCount: number;
}

interface OverviewData {
  totals: {
    locations: number;
    calls: number;
    leads: number;
    knowledgeBases: number;
  };
  customers: Customer[];
}

function StatusDot({ callCount, hasAI }: { callCount: number; hasAI: boolean }) {
  if (callCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
        <span className="text-xs text-emerald-400">Active</span>
      </span>
    );
  }
  if (hasAI) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
        <span className="text-xs text-blue-400">Set up</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
      <span className="text-xs text-slate-500">New</span>
    </span>
  );
}

function Badge({ count, color }: { count: number; color: 'blue' | 'green' | 'purple' }) {
  const colors = {
    blue: 'rgba(59,130,246,0.15)',
    green: 'rgba(16,185,129,0.15)',
    purple: 'rgba(139,92,246,0.15)',
  };
  const text = {
    blue: '#60a5fa',
    green: '#34d399',
    purple: '#a78bfa',
  };
  return (
    <span
      className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{ background: colors[color], color: text[color] }}
    >
      {count}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminDashboard() {
  const { isLoaded } = useUser();
  const { isSignedIn, getToken } = useAuth();
  const { isAdmin, email } = useRole();
  const clerk = useClerk();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ensure window.__clerk is set before fetching (same pattern as AppLayout)
  useEffect(() => {
    if (isSignedIn) {
      window.__clerk = { session: { getToken: () => getToken() } };
    }
  }, [isSignedIn, getToken]);

  // Fetch only after Clerk token is available
  useEffect(() => {
    if (!isSignedIn) return;
    api.get('/admin/overview')
      .then((res) => setData(res.data as OverviewData))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#09090d' }}>
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen" style={{ background: '#09090d', color: '#e2e8f0' }}>
      {/* Header */}
      <header
        className="px-8 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0e0e16' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', boxShadow: '0 0 16px rgba(124,58,237,0.35)' }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">Blueslate</span>
          <span
            className="px-2 py-0.5 rounded-md text-xs font-semibold tracking-widest"
            style={{ background: 'rgba(124,58,237,0.18)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            ADMIN CONSOLE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">{email}</span>
          <button
            onClick={() => clerk.signOut()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.06]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div
            className="rounded-2xl p-5"
            style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Customers</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Users className="w-4 h-4" style={{ color: '#a78bfa' }} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{data?.totals.locations ?? '—'}</p>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Calls</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Phone className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{data?.totals.calls ?? '—'}</p>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Leads</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{data?.totals.leads ?? '—'}</p>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">System Status</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <p className="text-xl font-bold text-emerald-400">Live</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold text-white">All Franchise Owners</h2>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Business Name', 'Phone', 'Calls', 'Leads', 'KB', 'Joined', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                        style={{ color: '#475569' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.customers ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-600">
                        No franchise owners yet.
                      </td>
                    </tr>
                  )}
                  {(data?.customers ?? []).map((c) => (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="px-6 py-4 font-medium text-white">{c.name}</td>
                      <td className="px-6 py-4">
                        {c.phoneNumber
                          ? <span className="text-slate-300">{c.phoneNumber}</span>
                          : <span className="text-slate-600">Not configured</span>}
                      </td>
                      <td className="px-6 py-4"><Badge count={c.callCount} color="blue" /></td>
                      <td className="px-6 py-4"><Badge count={c.leadCount} color="green" /></td>
                      <td className="px-6 py-4"><Badge count={c.kbCount} color="purple" /></td>
                      <td className="px-6 py-4 text-slate-400">{formatDate(c.createdAt)}</td>
                      <td className="px-6 py-4">
                        <StatusDot callCount={c.callCount} hasAI={c.hasAI} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Phone, Users, Brain, BarChart3,
  Settings, PhoneCall, Zap, PhoneOutgoing, LogOut, Building2,
} from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';
import { useLocationStore } from '../../hooks/useLocation';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',      exact: true },
  { to: '/franchises', icon: Building2,       label: 'Franchises',     exact: false },
  { to: '/campaigns',  icon: PhoneOutgoing,   label: 'Outbound Calls', exact: false },
  { to: '/live-call',  icon: PhoneCall,       label: 'Live Call',      exact: false },
  { to: '/calls',      icon: Phone,           label: 'Call History',   exact: false },
  { to: '/leads',      icon: Users,           label: 'Leads',          exact: false },
  { to: '/knowledge',  icon: Brain,           label: 'Knowledge Base', exact: false },
  { to: '/analytics',  icon: BarChart3,       label: 'Analytics',      exact: false },
];

export default function Sidebar() {
  const { currentLocation } = useLocationStore();
  const { pathname } = useLocation();
  const clerk = useClerk();

  function isActive(item: typeof navItems[0]) {
    return item.exact ? pathname === item.to : pathname.startsWith(item.to);
  }

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-screen"
      style={{ background: '#0e0e16', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Gradient glow */}
      <div
        className="absolute top-0 left-0 w-64 h-48 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124,58,237,0.14) 0%, transparent 100%)', zIndex: 0 }}
      />

      {/* Logo */}
      <div className="relative z-10 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)', boxShadow: '0 0 16px rgba(124,58,237,0.35)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-tight">Blueslate</p>
            <p className="text-xs font-medium" style={{ color: '#a78bfa' }}>AI Revenue OS</p>
          </div>
        </div>
      </div>

      {/* Active franchise label (switching happens on the Franchises page) */}
      {currentLocation && (
        <NavLink
          to="/franchises"
          className="relative z-20 px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          title="Manage franchises"
        >
          <Building2 className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
          <span className="truncate">{currentLocation.name}</span>
        </NavLink>
      )}

      {/* Nav */}
      <nav className="relative z-10 flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative select-none',
                active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              )}
              style={active ? {
                background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(147,51,234,0.09) 100%)',
                border: '1px solid rgba(139,92,246,0.22)',
                boxShadow: '0 0 14px rgba(124,58,237,0.1)',
              } : { border: '1px solid transparent' }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: 'linear-gradient(180deg, #7c3aed, #9333ea)' }} />
              )}
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#a78bfa' : undefined }} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative z-10 px-4 py-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs text-slate-500">Voice agent active</span>
          </div>
          <div className="flex items-center gap-1">
            <NavLink
              to="/settings"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </NavLink>
            <button
              onClick={() => clerk.signOut()}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

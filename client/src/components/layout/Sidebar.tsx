import { NavLink, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Phone, Users, Brain, BarChart3,
  Settings, PhoneCall, Zap, Plus, ChevronDown, Check, PhoneOutgoing, LogOut,
} from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';
import { useLocationStore } from '../../hooks/useLocation';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',      exact: true },
  { to: '/campaigns',  icon: PhoneOutgoing,   label: 'Outbound Calls', exact: false },
  { to: '/live-call',  icon: PhoneCall,       label: 'Live Call',      exact: false },
  { to: '/calls',      icon: Phone,           label: 'Call History',   exact: false },
  { to: '/leads',      icon: Users,           label: 'Leads',          exact: false },
  { to: '/knowledge',  icon: Brain,           label: 'Knowledge Base', exact: false },
  { to: '/analytics',  icon: BarChart3,       label: 'Analytics',      exact: false },
];

export default function Sidebar() {
  const { currentLocation, locations, setCurrentLocation } = useLocationStore();
  const { pathname } = useLocation();
  const clerk = useClerk();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function isActive(item: typeof navItems[0]) {
    return item.exact ? pathname === item.to : pathname.startsWith(item.to);
  }

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-screen border-r border-neutral-border"
      style={{ background: '#0F1923' }}
    >
      {/* Gradient glow */}
      <div
        className="absolute top-0 left-0 w-64 h-48 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(14,169,139,0.08) 0%, transparent 100%)', zIndex: 0 }}
      />

      {/* Logo */}
      <div className="relative z-10 px-sm py-4 border-b border-neutral-border/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-button flex items-center justify-center flex-shrink-0 bg-brand-teal shadow-teal-glow">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-tight">Blueslate</p>
            <p className="text-xs font-medium text-brand-teal">AI Revenue OS</p>
          </div>
        </div>
      </div>

      {/* Custom location dropdown */}
      {currentLocation && locations.length > 0 && (
        <div className="relative z-20 px-3 py-2 border-b border-neutral-border/30" ref={dropdownRef}>
          <div className="flex items-center gap-1">
            {/* Trigger */}
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex-1 flex items-center justify-between gap-2 rounded-button px-3 py-2 text-xs font-medium text-neutral-ink transition-colors bg-white border border-neutral-border hover:bg-neutral-surface"
            >
              <span className="truncate">{currentLocation.name}</span>
              <ChevronDown className={`w-3 h-3 flex-shrink-0 text-neutral-gray transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Configure → Settings */}
            <NavLink
              to="/settings"
              className="flex-shrink-0 w-7 h-7 rounded-button flex items-center justify-center text-neutral-gray hover:text-brand-teal hover:bg-brand-teal/10 transition-colors"
              title="Rename / configure in Settings"
            >
              <Plus className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          {/* Dropdown list */}
          {dropdownOpen && (
            <div
              className="absolute left-3 right-3 top-full mt-1 rounded-card overflow-hidden z-50 shadow-card bg-white border border-neutral-border"
            >
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => { setCurrentLocation(loc); setDropdownOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors hover:bg-neutral-surface"
                  style={{ color: loc.id === currentLocation.id ? '#0EA98B' : '#111827' }}
                >
                  <span className="truncate">{loc.name}</span>
                  {loc.id === currentLocation.id && <Check className="w-3 h-3 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
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
                'flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-all duration-150 relative select-none',
                active ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
              style={active ? {
                background: 'rgba(14,169,139,0.15)',
                border: '1px solid rgba(14,169,139,0.3)',
                boxShadow: '0 0 14px rgba(14,169,139,0.1)',
              } : { border: '1px solid transparent' }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-brand-teal" />
              )}
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#0EA98B' : undefined }} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative z-10 px-4 py-3 space-y-2 border-t border-neutral-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-teal" />
            </span>
            <span className="text-xs text-white/60">Voice agent active</span>
          </div>
          <div className="flex items-center gap-1">
            <NavLink
              to="/settings"
              className="w-7 h-7 rounded-button flex items-center justify-center text-white/60 hover:text-brand-teal hover:bg-white/5 transition-colors"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </NavLink>
            <button
              onClick={() => clerk.signOut()}
              className="w-7 h-7 rounded-button flex items-center justify-center text-white/60 hover:text-brand-teal hover:bg-white/5 transition-colors"
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

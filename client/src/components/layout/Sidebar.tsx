import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Phone, Users, Brain, BarChart3,
  Settings, PhoneCall, Zap, Trash2, Plus, ChevronDown, Check,
} from 'lucide-react';
import { useLocationStore } from '../../hooks/useLocation';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',      exact: true },
  { to: '/live-call', icon: PhoneCall,        label: 'Live Call',      exact: false },
  { to: '/calls',     icon: Phone,            label: 'Call History',   exact: false },
  { to: '/leads',     icon: Users,            label: 'Leads',          exact: false },
  { to: '/knowledge', icon: Brain,            label: 'Knowledge Base', exact: false },
  { to: '/analytics', icon: BarChart3,        label: 'Analytics',      exact: false },
  { to: '/settings',  icon: Settings,         label: 'Settings',       exact: false },
];

export default function Sidebar() {
  const { currentLocation, locations, setCurrentLocation, setLocations } = useLocationStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
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

  async function handleDeleteLocation(id: string) {
    if (!confirm('Delete this location and ALL its data? This cannot be undone.')) return;
    try {
      await api.delete(`/locations/${id}`);
      const remaining = locations.filter((l) => l.id !== id);
      setLocations(remaining);
      if (remaining.length > 0) setCurrentLocation(remaining[0]);
      else navigate('/');
    } catch (e) { console.error(e); }
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

      {/* Custom dark location dropdown */}
      {currentLocation && locations.length > 0 && (
        <div className="relative z-20 px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} ref={dropdownRef}>
          <div className="flex items-center gap-1">
            {/* Trigger */}
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex-1 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="truncate">{currentLocation.name}</span>
              <ChevronDown className={`w-3 h-3 flex-shrink-0 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Delete */}
            <button
              onClick={() => handleDeleteLocation(currentLocation.id)}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete location"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Add → Settings */}
            <NavLink
              to="/settings"
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
              title="Rename / configure in Settings"
            >
              <Plus className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          {/* Dropdown list */}
          {dropdownOpen && (
            <div
              className="absolute left-3 right-3 top-full mt-1 rounded-xl overflow-hidden z-50 shadow-xl"
              style={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => { setCurrentLocation(loc); setDropdownOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors hover:bg-white/[0.06]"
                  style={{ color: loc.id === currentLocation.id ? '#a78bfa' : '#94a3b8' }}
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
      <div className="relative z-10 px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-xs text-slate-500">Voice agent active</span>
        </div>
      </div>
    </aside>
  );
}

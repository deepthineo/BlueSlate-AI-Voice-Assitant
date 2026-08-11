import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Bell, ArrowLeft } from 'lucide-react';
import { useLocationStore } from '../../hooks/useLocation';

interface TopBarProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}

export default function TopBar({ title, subtitle, back, action }: TopBarProps) {
  const { currentLocation } = useLocationStore();
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b border-neutral-border bg-white backdrop-blur-sm flex items-center justify-between px-5 flex-shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {back && (
          <button
            onClick={() => navigate('/')}
            className="flex-shrink-0 w-8 h-8 rounded-button flex items-center justify-center text-neutral-gray hover:text-neutral-ink hover:bg-neutral-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-semibold text-neutral-ink text-sm leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-gray truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {action && <div className="flex-shrink-0">{action}</div>}
        {currentLocation?.phone_number && (
          <div className="hidden sm:flex items-center gap-2 bg-neutral-surface border border-neutral-border rounded-button px-3 py-1.5">
            <div className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-pulse" />
            <span className="text-xs text-neutral-gray font-mono">{currentLocation.phone_number}</span>
          </div>
        )}
        <button className="w-8 h-8 flex items-center justify-center text-neutral-gray hover:text-neutral-ink hover:bg-neutral-surface rounded-button transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}

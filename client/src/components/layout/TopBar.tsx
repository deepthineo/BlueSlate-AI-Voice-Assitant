import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Bell, ArrowLeft } from 'lucide-react';
import { useLocationStore } from '../../hooks/useLocation';

interface TopBarProps {
  title: string;
  subtitle?: string;
  back?: boolean;
}

export default function TopBar({ title, subtitle, back }: TopBarProps) {
  const { currentLocation } = useLocationStore();
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b border-white/[0.05] bg-surface-dark/80 backdrop-blur-sm flex items-center justify-between px-5 flex-shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {back && (
          <button
            onClick={() => navigate('/')}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-semibold text-white text-sm leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {currentLocation?.phone_number && (
          <div className="hidden sm:flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400 font-mono">{currentLocation.phone_number}</span>
          </div>
        )}
        <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}

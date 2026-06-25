import { PhoneCall } from 'lucide-react';
import { RETELL_PHONE, RETELL_PHONE_HREF } from '../lib/retell';

// ──────────────────────────────────────────────────────────────
// "Call AI Receptionist" — the Retell inbound number with click-to-call.
// Reusable: drop <CallReceptionist /> on the landing, demo, receptionist,
// or any page where calling is promoted. Same number, same agent.
// ──────────────────────────────────────────────────────────────

interface Props {
  /** 'block' = labelled card; 'inline' = compact one-liner for nav/footers. */
  variant?: 'block' | 'inline';
  className?: string;
}

export default function CallReceptionist({ variant = 'block', className = '' }: Props) {
  if (variant === 'inline') {
    return (
      <a href={RETELL_PHONE_HREF}
        className={`inline-flex items-center gap-2 text-sm font-semibold text-purple-300 hover:text-purple-200 transition-colors ${className}`}>
        <PhoneCall className="w-4 h-4" />
        <span className="tabular-nums">{RETELL_PHONE}</span>
      </a>
    );
  }

  return (
    <a href={RETELL_PHONE_HREF}
      className={`flex flex-col items-center gap-1 px-6 py-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${className}`}
      style={{ borderColor: 'rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.08)' }}>
      <span className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wide">
        <PhoneCall className="w-3.5 h-3.5" /> Call AI Receptionist
      </span>
      <span className="text-white font-bold text-xl tabular-nums">{RETELL_PHONE}</span>
    </a>
  );
}

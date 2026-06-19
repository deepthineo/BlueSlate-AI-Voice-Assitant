import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, h:mm a');
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 25) return 'text-blue-400';
  return 'text-red-400';
}

export function scoreBg(score: number): string {
  if (score >= 75) return 'bg-emerald-500/20 text-emerald-400';
  if (score >= 50) return 'bg-yellow-500/20 text-yellow-400';
  if (score >= 25) return 'bg-blue-500/20 text-blue-400';
  return 'bg-red-500/20 text-red-400';
}

export function statusBadgeColor(status: string): string {
  const map: Record<string, string> = {
    new: 'bg-blue-500/20 text-blue-400',
    contacted: 'bg-purple-500/20 text-purple-400',
    qualified: 'bg-yellow-500/20 text-yellow-400',
    booked: 'bg-emerald-500/20 text-emerald-400',
    converted: 'bg-teal-500/20 text-teal-400',
    dead: 'bg-gray-500/20 text-gray-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    failed: 'bg-red-500/20 text-red-400',
    no_answer: 'bg-gray-500/20 text-gray-400',
    active: 'bg-emerald-500/20 text-emerald-400',
    processing: 'bg-yellow-500/20 text-yellow-400',
    pending: 'bg-gray-500/20 text-gray-400',
  };
  return map[status] ?? 'bg-gray-500/20 text-gray-400';
}

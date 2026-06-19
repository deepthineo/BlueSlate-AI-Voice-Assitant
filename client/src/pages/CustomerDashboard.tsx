import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import {
  Zap, Send, Phone, CheckCircle, Star, Clock,
  ChevronDown, MessageCircle, LogOut, Loader2, AlertCircle,
} from 'lucide-react';

// Use `|| '/api'` (not `??`): VITE_API_URL is "" in dev, which `??` won't catch.
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api');

interface Franchise { id: string; name: string; phone: string | null; agentName: string; }
interface ChatMsg { role: 'user' | 'assistant'; content: string; }
interface Inquiry {
  id: string; franchise: string; interest: string | null;
  outcome: string | null; status: string | null; score: number | null;
  notes: string | null; date: string;
}

function outcomeLabel(outcome: string | null) {
  const map: Record<string, { label: string; color: string }> = {
    booked:          { label: 'Trial Booked',       color: '#34d399' },
    qualified:       { label: 'Qualified',           color: '#60a5fa' },
    callback_needed: { label: 'Callback Scheduled',  color: '#a78bfa' },
    info_requested:  { label: 'Info Requested',      color: '#fbbf24' },
    not_interested:  { label: 'Not Interested',      color: '#94a3b8' },
    unknown:         { label: 'In Review',           color: '#64748b' },
  };
  return map[outcome ?? 'unknown'] ?? { label: 'In Review', color: '#64748b' };
}

function statusLabel(s: string | null) {
  const map: Record<string, string> = {
    new: 'New inquiry', contacted: 'Contacted', qualified: 'Qualified',
    booked: 'Trial booked', converted: 'Enrolled', dead: 'Closed',
  };
  return map[s ?? 'new'] ?? 'New inquiry';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Customer dashboard — separate from franchise owner app ───────
export default function CustomerDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();

  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const phone = user?.phoneNumbers?.[0]?.phoneNumber ?? '';
  const firstName = user?.firstName ?? 'there';
  const selected = franchises.find((f) => f.id === selectedId);

  // Load franchises
  useEffect(() => {
    fetch(`${API_BASE}/customer/franchises`)
      .then((r) => r.json())
      .then((d: { franchises: Franchise[] }) => {
        setFranchises(d.franchises ?? []);
        if (d.franchises?.length) setSelectedId(d.franchises[0].id);
      })
      .catch(console.error);
  }, []);

  // Load inquiry status when email is available
  useEffect(() => {
    if (!email) return;
    setInquiryLoading(true);
    const params = new URLSearchParams({ email });
    if (phone) params.set('phone', phone);
    fetch(`${API_BASE}/customer/inquiry?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { found: boolean; inquiries?: Inquiry[] }) => {
        setInquiries(d.found ? (d.inquiries ?? []) : []);
      })
      .catch(() => setInquiries([]))
      .finally(() => setInquiryLoading(false));
  }, [email]);

  // Greeting when franchise selected
  useEffect(() => {
    if (!selected) return;
    setMessages([{
      role: 'assistant',
      content: `Hi ${firstName}! I'm ${selected.agentName}, the AI assistant for ${selected.name}. Ask me anything about our programs, pricing, hours, or how to get started!`,
    }]);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selectedId || chatLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/customer/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedId,
          message: userMsg,
          history: messages.slice(-8),
        }),
      });
      const data = await res.json() as { reply?: string };
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply ?? "I'd love to help — please call us for details!" }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: "I'm having a brief connection issue. Please try again in a moment." }]);
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#09090d' }}>
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#09090d', color: '#e2e8f0' }}>

      {/* Nav */}
      <header className="px-6 h-14 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0e0e16' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white text-sm">Blueslate</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
            Customer Portal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 hidden sm:block">{email}</span>
          <button onClick={() => clerk.signOut()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.06]">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left column: Chat ───────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Welcome */}
          <div>
            <h1 className="text-xl font-black text-white">Welcome back, {firstName}!</h1>
            <p className="text-sm text-gray-500 mt-0.5">Ask any question about a franchise or check your inquiry status.</p>
          </div>

          {/* Franchise selector */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm text-white transition-all"
              style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <span className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-purple-400" />
                {selected ? `Chatting with: ${selected.name}` : 'Select a franchise…'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-2xl overflow-hidden shadow-xl"
                style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.1)' }}>
                {franchises.length === 0
                  ? <p className="px-4 py-3 text-sm text-gray-500">No franchises available</p>
                  : franchises.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setSelectedId(f.id); setShowDropdown(false); }}
                      className="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-white/[0.05]"
                      style={{ color: f.id === selectedId ? '#a78bfa' : '#d1d5db', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="font-medium">{f.name}</span>
                      {f.phone && <span className="text-gray-500 text-xs ml-2">{f.phone}</span>}
                    </button>
                  ))
                }
              </div>
            )}
          </div>

          {/* Chat window */}
          <div className="flex-1 flex flex-col rounded-2xl overflow-hidden"
            style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.08)', minHeight: '380px' }}>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '380px' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, #7c3aed, #9333ea)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {msg.role === 'assistant' && (
                      <p className="text-[10px] font-semibold text-purple-400 mb-1">
                        {selected?.agentName ?? 'AI'} · {selected?.name ?? 'Franchise'}
                      </p>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl flex items-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                    <span className="text-xs text-gray-400">Typing…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage}
              className="flex gap-2 p-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!selectedId || chatLoading}
                placeholder={selectedId ? `Ask ${selected?.agentName ?? 'the AI'} anything…` : 'Select a franchise first'}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || !selectedId || chatLoading}
                className="px-4 py-2.5 rounded-xl flex items-center gap-1.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Suggested questions */}
          {selected && messages.length <= 1 && (
            <div className="flex flex-wrap gap-2">
              {['What programs do you offer?', 'What are your hours?', 'How much does it cost?', 'How do I book a trial?'].map((q) => (
                <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-xs px-3 py-1.5 rounded-full text-purple-300 transition-colors hover:bg-purple-900/30"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column: Inquiry status ────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          <div>
            <h2 className="text-base font-bold text-white">Your Inquiry Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">Based on your email: {email}</p>
          </div>

          {inquiryLoading && (
            <div className="flex items-center gap-2 py-6">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-sm text-gray-500">Looking up your inquiries…</span>
            </div>
          )}

          {!inquiryLoading && inquiries !== null && inquiries.length === 0 && (
            <div className="rounded-2xl p-6 text-center"
              style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Phone className="w-7 h-7 text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white mb-1">No inquiries found</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                If you called a franchise, your inquiry may be recorded under a different email.
                Try chatting with the franchise AI above or call them directly.
              </p>
            </div>
          )}

          {!inquiryLoading && inquiries !== null && inquiries.length > 0 && inquiries.map((inq) => {
            const { label: outcomeText, color: outcomeColor } = outcomeLabel(inq.outcome);
            return (
              <div key={inq.id} className="rounded-2xl overflow-hidden"
                style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.08)' }}>

                {/* Status header */}
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs font-semibold text-white">{inq.franchise}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{ color: outcomeColor, background: `${outcomeColor}18`, border: `1px solid ${outcomeColor}30` }}>
                    {outcomeText}
                  </span>
                </div>

                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" /> {fmtDate(inq.date)}
                  </div>

                  {inq.interest && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Interested in</span>
                      <span className="text-gray-200 font-medium text-right max-w-[55%]">{inq.interest}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className="flex items-center gap-1 text-gray-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      {statusLabel(inq.status)}
                    </span>
                  </div>

                  {inq.score !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Match score</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300 font-bold">{inq.score}/100</span>
                      </span>
                    </div>
                  )}

                  {inq.notes && (
                    <div className="mt-2 p-2.5 rounded-xl text-xs text-gray-400 leading-relaxed"
                      style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                      <span className="text-purple-400 font-semibold">Next: </span>{inq.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Help card */}
          <div className="rounded-2xl p-4 mt-auto"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <p className="text-xs font-semibold text-emerald-400 mb-1">Need help?</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Chat with the franchise AI on the left, or{' '}
              <a href="mailto:support@blueslate.ai" className="text-purple-400 hover:underline">
                contact BlueSlate support
              </a>.
            </p>
          </div>

          {/* Are you a franchise owner? */}
          <div className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-gray-500 mb-2">Are you a franchise owner?</p>
            <Link to="/onboarding"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
              Set up your AI receptionist →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

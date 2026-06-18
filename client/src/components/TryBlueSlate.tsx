import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Globe, Loader2, CheckCircle, MessageSquare, Phone,
  HelpCircle, AlertTriangle, Users, ListChecks, ArrowRight, Send, Rocket, X,
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api';

// ── Types (mirror server BusinessScan) ──────────────────────
interface SampleConversation {
  scenario: string;
  direction: 'inbound' | 'outbound';
  turns: Array<{ speaker: 'caller' | 'ai'; text: string }>;
}
interface BusinessScan {
  business_name: string;
  summary: string;
  services: string[];
  programs: string[];
  pricing_insights: string[];
  faqs: Array<{ question: string; answer: string }>;
  customer_personas: string[];
  qualifying_questions: string[];
  knowledge_gaps: string[];
  sample_conversations: SampleConversation[];
  knowledge_context: string;
  source_url: string;
  pages_scraped: number;
  model: 'gemini' | 'fallback';
}

const SCAN_STEPS = [
  'Reading your website…',
  'Building your knowledge base…',
  'Generating FAQs & personas…',
  'Drafting sample call conversations…',
  'Preparing your live AI preview…',
];

export default function TryBlueSlate() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState('');
  const [scan, setScan] = useState<BusinessScan | null>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (stepTimer.current) clearInterval(stepTimer.current); }, []);

  async function runScan(e?: React.FormEvent) {
    e?.preventDefault();
    if (!url.trim() || status === 'scanning') return;

    setStatus('scanning');
    setError('');
    setScan(null);
    setStepIdx(0);
    stepTimer.current = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, SCAN_STEPS.length - 1));
    }, 1800);

    try {
      const res = await fetch(`${API_BASE}/demo/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(45000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Scan failed');
      setScan(data as BusinessScan);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We couldn\'t analyze that site. Please try again.');
      setStatus('error');
    } finally {
      if (stepTimer.current) clearInterval(stepTimer.current);
    }
  }

  return (
    <section id="try" className="relative px-6 py-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-4"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 font-medium">No signup required</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Try BlueSlate on <span style={{ color: '#a78bfa' }}>your</span> website
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Paste your URL. Watch our AI scan your business, build a knowledge base, and show you
            exactly how it will answer your calls — in seconds.
          </p>
        </div>

        {/* URL form */}
        <form onSubmit={runScan} className="max-w-2xl mx-auto mb-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 px-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="xpleaguefrisco.com"
                className="flex-1 bg-transparent py-3.5 text-white placeholder-gray-600 outline-none text-sm"
                disabled={status === 'scanning'}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'scanning' || !url.trim()}
              className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 24px rgba(124,58,237,0.35)' }}
            >
              {status === 'scanning'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</>
                : <><Sparkles className="w-4 h-4" /> Scan My Site</>}
            </button>
          </div>
          {status === 'error' && (
            <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </p>
          )}
        </form>

        {/* Scanning progress */}
        {status === 'scanning' && (
          <div className="max-w-xl mx-auto space-y-3">
            {SCAN_STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-3 text-sm transition-opacity"
                style={{ opacity: i <= stepIdx ? 1 : 0.35 }}>
                {i < stepIdx
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  : i === stepIdx
                    ? <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
                    : <div className="w-4 h-4 rounded-full border border-gray-700 flex-shrink-0" />}
                <span className={i <= stepIdx ? 'text-gray-200' : 'text-gray-600'}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {status === 'done' && scan && <ScanResults scan={scan} />}
      </div>
    </section>
  );
}

// ── Results view: summary, FAQs, sample convos, gaps + playground ──
function ScanResults({ scan }: { scan: BusinessScan }) {
  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease]">
      {/* Summary card */}
      <Card>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-xs text-emerald-400 font-medium mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Knowledge base built · {scan.pages_scraped} page{scan.pages_scraped === 1 ? '' : 's'} read
            </p>
            <h3 className="text-2xl font-bold text-white">{scan.business_name}</h3>
          </div>
        </div>
        <p className="text-gray-300 leading-relaxed">{scan.summary}</p>
        {(scan.services.length > 0 || scan.programs.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {[...scan.programs, ...scan.services].slice(0, 10).map((s, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}>
                {s}
              </span>
            ))}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* FAQs */}
        {scan.faqs.length > 0 && (
          <Card>
            <CardTitle icon={HelpCircle} color="#60a5fa">FAQs your AI can answer</CardTitle>
            <div className="space-y-3 mt-3">
              {scan.faqs.slice(0, 5).map((f, i) => (
                <div key={i}>
                  <p className="text-sm font-medium text-gray-200">{f.question}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{f.answer}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pricing + personas + qualifying */}
        <Card>
          {scan.pricing_insights.length > 0 && (
            <>
              <CardTitle icon={ListChecks} color="#34d399">Pricing insights</CardTitle>
              <ul className="space-y-1.5 mt-3 mb-5">
                {scan.pricing_insights.map((p, i) => (
                  <li key={i} className="text-sm text-gray-400 flex gap-2"><span className="text-emerald-400">•</span>{p}</li>
                ))}
              </ul>
            </>
          )}
          {scan.customer_personas.length > 0 && (
            <>
              <CardTitle icon={Users} color="#f0abfc">Who calls this business</CardTitle>
              <ul className="space-y-1.5 mt-3">
                {scan.customer_personas.slice(0, 4).map((p, i) => (
                  <li key={i} className="text-sm text-gray-400 flex gap-2"><span className="text-fuchsia-400">•</span>{p}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Sample conversations */}
      {scan.sample_conversations.length > 0 && (
        <Card>
          <CardTitle icon={Phone} color="#a78bfa">How your AI answers calls</CardTitle>
          <div className="grid md:grid-cols-2 gap-5 mt-4">
            {scan.sample_conversations.slice(0, 2).map((conv, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: conv.direction === 'inbound' ? 'rgba(96,165,250,0.15)' : 'rgba(52,211,153,0.15)', color: conv.direction === 'inbound' ? '#60a5fa' : '#34d399' }}>
                    {conv.direction}
                  </span>
                  <span className="text-xs text-gray-500">{conv.scenario}</span>
                </div>
                <div className="space-y-2">
                  {conv.turns.map((t, j) => (
                    <div key={j} className={`flex ${t.speaker === 'ai' ? 'justify-start' : 'justify-end'}`}>
                      <span className="text-sm max-w-[85%] px-3 py-1.5 rounded-2xl"
                        style={t.speaker === 'ai'
                          ? { background: 'rgba(124,58,237,0.18)', color: '#e9d5ff' }
                          : { background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                        {t.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Knowledge gaps */}
      {scan.knowledge_gaps.length > 0 && (
        <Card accent="#f59e0b">
          <CardTitle icon={AlertTriangle} color="#fbbf24">Knowledge gaps we detected</CardTitle>
          <p className="text-sm text-gray-500 mt-1 mb-3">Questions your website can't answer yet — your AI will capture these as leads and flag them for you.</p>
          <ul className="space-y-1.5">
            {scan.knowledge_gaps.map((g, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-amber-400">⚠</span>{g}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Interactive playground */}
      <Playground scan={scan} />

      {/* Launch CTA */}
      <div className="text-center rounded-2xl p-8"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1))', border: '1px solid rgba(124,58,237,0.3)' }}>
        <h3 className="text-2xl font-black text-white mb-2">Ready to put {scan.business_name} on autopilot?</h3>
        <p className="text-gray-400 mb-5">Launch this AI assistant on your real phone line in under 10 minutes.</p>
        <Link to="/sign-up"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}>
          <Rocket className="w-4 h-4" /> Launch Your AI Assistant <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-gray-600 mt-3">No credit card · Free during early access</p>
      </div>
    </div>
  );
}

// ── Interactive AI playground (text chat grounded in the scanned site) ──
function Playground({ scan }: { scan: BusinessScan }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'ai', text: `Hi, thanks for reaching ${scan.business_name}! I'm your AI assistant. Ask me anything a customer might call about.` },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const suggestions = scan.faqs.slice(0, 3).map((f) => f.question);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    const next = [...messages, { role: 'user' as const, text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/demo/playground-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          businessName: scan.business_name,
          knowledgeContext: scan.knowledge_context,
          history: next.filter((m) => m.role !== 'ai' || m !== next[0]).slice(-8).map((m) => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.text,
          })),
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'ai', text: data?.reply || 'Let me have our team follow up — can I grab your name and number?' }]);
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'I hit a brief connection issue — but on a real call I\'d capture your details and follow up right away.' }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardTitle icon={MessageSquare} color="#a78bfa">Talk to your AI assistant</CardTitle>
      <p className="text-sm text-gray-500 mt-1 mb-4">This is your AI answering as {scan.business_name} — grounded in what we just learned from your site.</p>
      <div ref={scrollRef} className="h-64 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
            <span className="text-sm max-w-[80%] px-3.5 py-2 rounded-2xl leading-relaxed"
              style={m.role === 'ai'
                ? { background: 'rgba(124,58,237,0.18)', color: '#e9d5ff' }
                : { background: 'rgba(255,255,255,0.07)', color: '#e2e8f0' }}>
              {m.text}
            </span>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <span className="text-sm px-3.5 py-2 rounded-2xl" style={{ background: 'rgba(124,58,237,0.18)', color: '#c4b5fd' }}>
              <Loader2 className="w-4 h-4 animate-spin inline" />
            </span>
          </div>
        )}
      </div>
      {suggestions.length > 0 && messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full text-gray-300 transition-colors hover:text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {s}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question a customer might ask…"
          className="flex-1 px-4 py-3 rounded-xl bg-transparent text-white placeholder-gray-600 outline-none text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()}
          className="px-4 rounded-xl text-white transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </Card>
  );
}

// ── Small UI helpers ────────────────────────────────────────
function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl p-6"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent ? accent + '40' : 'rgba(255,255,255,0.08)'}` }}>
      {children}
    </div>
  );
}
function CardTitle({ icon: Icon, color, children }: { icon: typeof X; color: string; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 font-bold text-white">
      <Icon className="w-4 h-4" style={{ color }} /> {children}
    </h4>
  );
}

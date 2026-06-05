import { useEffect, useState } from 'react';
import { Globe, RefreshCw, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Edit3, Save, FileText, Trash2 } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import api from '../lib/api';
import { useLocationStore } from '../hooks/useLocation';
import { statusBadgeColor, timeAgo } from '../lib/utils';
import type { KnowledgeBase } from '../types';

export default function Knowledge() {
  const { currentLocation } = useLocationStore();
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingKb, setEditingKb] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  // Manual entry mode
  const [mode, setMode] = useState<'url' | 'manual'>('url');
  const [manualText, setManualText] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  async function load() {
    try {
      const res = await api.get('/knowledge');
      setKbs(res.data.knowledgeBases ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentLocation) return;
    load();
  }, [currentLocation?.id]);

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!url.trim()) return;
    setScraping(true);
    try {
      const res = await api.post('/knowledge/scrape', { sourceUrl: url.trim() });
      setKbs((prev) => [res.data.knowledgeBase, ...prev]);
      setUrl('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scrape failed');
    } finally {
      setScraping(false);
    }
  }

  async function handleManualSave(e: React.FormEvent) {
    e.preventDefault();
    if (!manualText.trim() || !manualTitle.trim()) return;
    setSavingManual(true);
    setError('');
    try {
      const res = await api.post('/knowledge/scrape', {
        sourceUrl: `manual://${manualTitle.toLowerCase().replace(/\s+/g, '-')}`,
        manualContent: manualText.trim(),
        manualTitle: manualTitle.trim(),
      });
      setKbs((prev) => [res.data.knowledgeBase, ...prev]);
      setManualText('');
      setManualTitle('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingManual(false);
    }
  }

  async function handleDelete(kbId: string) {
    if (!confirm('Delete this knowledge base?')) return;
    try {
      await api.delete(`/knowledge/${kbId}`);
      setKbs((prev) => prev.filter((kb) => kb.id !== kbId));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSave(kbId: string) {
    setSaving(true);
    try {
      const res = await api.patch(`/knowledge/${kbId}`, { structuredData: editData });
      setKbs((prev) => prev.map((kb) => kb.id === kbId ? res.data.knowledgeBase : kb));
      setEditingKb(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Knowledge Base" subtitle="Scrape and manage franchise context for your AI agent" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Input card */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Instant Knowledge Loop</h2>
              <p className="text-xs text-slate-500 mt-0.5">Blueslate will structure this as AI context for your voice agent.</p>
            </div>
            {/* Mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs font-medium">
              <button
                onClick={() => setMode('url')}
                className={`px-3 py-1.5 transition-colors ${mode === 'url' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Globe className="w-3.5 h-3.5 inline mr-1" />URL
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`px-3 py-1.5 transition-colors ${mode === 'manual' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <FileText className="w-3.5 h-3.5 inline mr-1" />Manual
              </button>
            </div>
          </div>

          {mode === 'url' ? (
            <form onSubmit={handleScrape} className="flex gap-3">
              <div className="flex-1 relative">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  className="input pl-9"
                  placeholder="https://your-franchise-site.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={scraping}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={scraping}>
                {scraping
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scraping…</>
                  : <><Globe className="w-4 h-4" /> Scrape & Build</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleManualSave} className="space-y-3">
              <input
                className="input"
                placeholder="Knowledge base title (e.g. XP League Frisco)"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                required
              />
              <textarea
                className="input h-40 resize-none font-mono text-xs"
                placeholder={`Paste your business info here. Example:\n\nBusiness: XP League Frisco\nDescription: Premier youth esports training for ages 8-18\nPrograms: Fortnite Squad, Valorant Academy, Minecraft Builders\nPricing: $149/month (2 sessions/week), $229/month (unlimited)\nHours: Mon-Fri 3pm-8pm, Sat 10am-6pm\nAddress: 123 Main St, Frisco TX 75034\nPhone: (469) 555-1234\nFAQ:\n- Q: What ages do you serve? A: Ages 8-18\n- Q: Do you offer trials? A: Yes, free 1-session trial`}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary w-full" disabled={savingManual}>
                {savingManual
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing with AI…</>
                  : <><Save className="w-4 h-4" /> Save as Knowledge Base</>}
              </button>
            </form>
          )}

          {scraping && (
            <div className="flex items-center gap-2 text-xs text-yellow-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Crawling pages, extracting content, structuring with AI… (~20s)
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
              {mode === 'url' && (
                <button
                  onClick={() => { setMode('manual'); setError(''); }}
                  className="ml-auto text-xs text-brand-400 hover:text-brand-300 whitespace-nowrap"
                >
                  → Try manual entry
                </button>
              )}
            </div>
          )}
        </div>

        {/* KB list */}
        <div className="space-y-3">
          {loading && <p className="text-sm text-slate-500 text-center py-8">Loading…</p>}
          {!loading && kbs.length === 0 && (
            <div className="card text-center py-12">
              <Globe className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No knowledge bases yet</p>
              <p className="text-slate-600 text-xs mt-1">Enter a URL above or use Manual entry</p>
            </div>
          )}

          {kbs.map((kb) => {
            const isExpanded = expandedId === kb.id;
            const isEditing = editingKb === kb.id;
            const sd = (kb.structured_data ?? {}) as Record<string, unknown>;

            return (
              <div key={kb.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge ${statusBadgeColor(kb.status)}`}>
                        {kb.status === 'active' && <CheckCircle className="w-3 h-3" />}
                        {kb.status === 'processing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {kb.status === 'failed' && <XCircle className="w-3 h-3" />}
                        {kb.status === 'pending' && <Clock className="w-3 h-3" />}
                        {kb.status}
                      </span>
                      {kb.pages_scraped > 0 && <span className="text-xs text-slate-500">{kb.pages_scraped} pages</span>}
                      {kb.last_scraped_at && (
                        <span className="text-xs text-slate-600">Last scraped {timeAgo(kb.last_scraped_at)}</span>
                      )}
                    </div>
                    <p className="text-sm text-brand-400 mt-1 truncate">{kb.source_url}</p>
                    {!!sd.title && <p className="text-xs text-slate-400 mt-0.5">{String(sd.title)}</p>}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {kb.status === 'active' && !isEditing && (
                      <button onClick={() => { setEditingKb(kb.id); setEditData(sd); }} className="btn-secondary text-xs py-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                    {isEditing && (
                      <button onClick={() => handleSave(kb.id)} disabled={saving} className="btn-primary text-xs py-1.5">
                        <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
                      </button>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : kb.id)} className="btn-secondary text-xs py-1.5">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(kb.id)}
                      className="btn-secondary text-xs py-1.5 text-red-400 hover:text-red-300 hover:border-red-500/30"
                      title="Delete knowledge base"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {kb.status === 'failed' && kb.error_message && (
                  <div className="mt-3 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                    {kb.error_message}
                  </div>
                )}

                {isExpanded && kb.status === 'active' && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-4">
                    {isEditing ? (
                      <div>
                        <label className="label">Structured Data (JSON)</label>
                        <textarea
                          className="input font-mono text-xs h-64 resize-none"
                          value={JSON.stringify(editData, null, 2)}
                          onChange={(e) => {
                            try { setEditData(JSON.parse(e.target.value)); } catch { }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {!!sd.description && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Description</p>
                            <p className="text-slate-300">{String(sd.description)}</p>
                          </div>
                        )}
                        {!!sd.hours && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Hours</p>
                            <p className="text-slate-300">{String(sd.hours)}</p>
                          </div>
                        )}
                        {Array.isArray(sd.programs) && sd.programs.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Programs</p>
                            <div className="flex flex-wrap gap-1">
                              {(sd.programs as string[]).map((p) => (
                                <span key={p} className="badge bg-brand-500/20 text-brand-400">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(sd.services) && sd.services.length > 0 && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-slate-500 mb-2">Services</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(sd.services as { name: string; description: string; price?: string }[]).map((s) => (
                                <div key={s.name} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-slate-200">{s.name}</p>
                                    {s.price && <span className="text-xs text-emerald-400 flex-shrink-0">{s.price}</span>}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(sd.key_selling_points) && (sd.key_selling_points as string[]).length > 0 && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-slate-500 mb-1">Key Selling Points</p>
                            <ul className="space-y-0.5">
                              {(sd.key_selling_points as string[]).map((p) => (
                                <li key={p} className="text-xs text-slate-300 flex gap-2"><span className="text-brand-400">•</span>{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

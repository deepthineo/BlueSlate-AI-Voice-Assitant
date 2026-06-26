import { useEffect, useState } from 'react';
import { Building2, Plus, Check, Loader2, Trash2, Globe, Mic, AlertCircle } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import api from '../lib/api';
import { useLocationStore } from '../hooks/useLocation';
import type { FranchiseLocation } from '../types';

// ──────────────────────────────────────────────────────────────
// Franchises — manage MULTIPLE franchise locations.
// Each location has its own website URL → knowledge base → AI → leads.
// Add a franchise (name + URL), switch the active one, or remove it.
// Backend already supports this (GET/POST/DELETE /locations + /knowledge/scrape).
// ──────────────────────────────────────────────────────────────

export default function Franchises() {
  const { currentLocation, setCurrentLocation, setLocations: setStoreLocations } = useLocationStore();
  const [locations, setLocations] = useState<FranchiseLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/locations');
      const locs = (res.data.locations ?? []) as FranchiseLocation[];
      setLocations(locs);
      setStoreLocations(locs);
      if (!currentLocation && locs[0]) setCurrentLocation(locs[0]);
    } catch {
      setErr('Could not load your franchises.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function addFranchise() {
    if (!name.trim()) { setErr('Give your franchise a name.'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      // 1) Create the location.
      setMsg('Creating franchise…');
      const createRes = await api.post('/locations', {
        name: name.trim(),
        websiteUrl: url.trim() || undefined,
      });
      const newLoc = createRes.data.location as FranchiseLocation;

      // 2) Make it the active location so the scrape attaches to it.
      setCurrentLocation(newLoc);

      // 3) Scrape the URL into a knowledge base (if provided).
      if (url.trim()) {
        setMsg('Scanning the website to build the AI knowledge base…');
        await api.post('/knowledge/scrape', { sourceUrl: url.trim(), locationId: newLoc.id });
      }

      setMsg('Franchise added!');
      setName(''); setUrl(''); setAdding(false);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Could not add the franchise. Please try again.');
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(''), 4000);
    }
  }

  async function removeFranchise(loc: FranchiseLocation) {
    if (!confirm(`Remove "${loc.name}"? This deletes its AI, knowledge base, and leads.`)) return;
    setDeletingId(loc.id);
    try {
      await api.delete(`/locations/${loc.id}`);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Could not remove the franchise.');
    } finally {
      setDeletingId(null);
    }
  }

  function switchTo(loc: FranchiseLocation) {
    setCurrentLocation(loc);
    setMsg(`Now managing "${loc.name}".`);
    setTimeout(() => setMsg(''), 3000);
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Franchises" subtitle="Manage your franchise locations — each has its own AI, knowledge base, and leads" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Add franchise */}
        {!adding ? (
          <button onClick={() => { setAdding(true); setErr(''); }} className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> Add a franchise
          </button>
        ) : (
          <div className="card max-w-xl space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-brand-400" /> New franchise</h3>
            <div>
              <label className="label">Franchise name</label>
              <input className="input" placeholder="e.g. XP League Dallas" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Website URL <span className="text-gray-500">(optional — builds the AI knowledge base)</span></label>
              <input className="input" placeholder="https://yourfranchise.com" value={url} onChange={(e) => setUrl(e.target.value)} />
              <p className="text-xs text-gray-600 mt-1">We scan this site so the AI can answer about this franchise.</p>
            </div>
            {err && <p className="text-sm text-red-400 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {err}</p>}
            <div className="flex gap-2">
              <button onClick={addFranchise} disabled={busy} className="btn-primary gap-2">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {msg || 'Working…'}</> : <>Add franchise</>}
              </button>
              <button onClick={() => { setAdding(false); setErr(''); }} disabled={busy} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {msg && !adding && <p className="text-sm text-emerald-400">{msg}</p>}

        {/* List */}
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : locations.length === 0 ? (
          <p className="text-gray-500">No franchises yet. Add your first one above.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {locations.map((loc) => {
              const active = currentLocation?.id === loc.id;
              return (
                <div key={loc.id} className={`card ${active ? 'border-brand-500/60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-brand-400 shrink-0" />
                        <h4 className="font-semibold text-white truncate">{loc.name}</h4>
                        {active && <span className="text-[10px] bg-brand-600/30 text-brand-300 px-2 py-0.5 rounded-full">ACTIVE</span>}
                      </div>
                      {loc.website_url && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate"><Globe className="w-3 h-3" /> {loc.website_url}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Mic className="w-3 h-3" /> AI: {loc.ai_config?.agent_name ?? 'Sara'}</p>
                    </div>
                    <button onClick={() => removeFranchise(loc)} disabled={deletingId === loc.id} className="text-gray-500 hover:text-red-400 p-1" title="Remove">
                      {deletingId === loc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-3">
                    {active ? (
                      <span className="text-xs text-brand-300 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Currently managing</span>
                    ) : (
                      <button onClick={() => switchTo(loc)} className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2">
                        Switch to this franchise
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-600">
          Switching a franchise changes which location your dashboard, leads, calls, and AI knowledge base refer to.
        </p>
      </div>
    </div>
  );
}

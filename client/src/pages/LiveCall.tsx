import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocationStore } from '../hooks/useLocation';
import TopBar from '../components/layout/TopBar';
import RetellCallButton from '../components/RetellCallButton';

// ──────────────────────────────────────────────────────────────
// In-app "Talk to AI" — the SAME Retell agent + experience as the
// public landing demo, but bound to the logged-in owner's location
// so the AI answers from THEIR knowledge base. High-quality Retell
// voice (not the old browser Web Speech path).
// ──────────────────────────────────────────────────────────────

export default function LiveCall() {
  const { currentLocation, setCurrentLocation, setLocations } = useLocationStore();
  const [locationLoading, setLocationLoading] = useState(false);

  // Ensure we have a location (e.g. right after refresh) so the call binds to the right KB.
  useEffect(() => {
    if (currentLocation) return;
    setLocationLoading(true);
    import('../lib/api').then(({ default: api }) =>
      api.get('/locations')
        .then((res) => {
          const locs = (res.data.locations ?? []) as import('../types').FranchiseLocation[];
          if (locs.length > 0) {
            setLocations(locs);
            setCurrentLocation(locs[0]);
          }
        })
        .catch(() => {})
        .finally(() => setLocationLoading(false))
    );
  }, [currentLocation]);

  const agentName = currentLocation?.ai_config?.agent_name ?? 'Alex';

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Talk to your AI" subtitle="Test your AI receptionist live — same agent that answers your calls" back />

      <div className="flex-1 flex flex-col items-center justify-start p-6 gap-6 overflow-auto">
        <div className="w-full max-w-md card text-center flex flex-col items-center gap-4 py-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-400">
            <Sparkles className="w-4 h-4" /> Live Voice Assistant
          </div>

          <p className="text-sm text-gray-400 max-w-xs">
            {currentLocation
              ? <>Talk to <span className="text-gray-200 font-semibold">{agentName}</span>, your AI receptionist for <span className="text-gray-200 font-semibold">{currentLocation.name}</span>. It answers from your knowledge base.</>
              : 'Talk to your AI receptionist live, right in your browser.'}
          </p>

          {/* Same Retell call experience as the public demo, bound to this location's KB */}
          <RetellCallButton locationId={currentLocation?.id} />

          {locationLoading && <p className="text-xs text-gray-500">Loading your location…</p>}
        </div>

        <div className="w-full max-w-md card bg-gray-900/50">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">How it works</h3>
          <ol className="space-y-2 text-sm text-gray-400">
            <li className="flex gap-2"><span className="text-brand-400 font-bold">1.</span> Click <strong className="text-gray-300">Talk to AI</strong> — allow microphone access</li>
            <li className="flex gap-2"><span className="text-brand-400 font-bold">2.</span> {agentName} greets you and starts listening</li>
            <li className="flex gap-2"><span className="text-brand-400 font-bold">3.</span> Speak naturally — the live transcript appears below the button</li>
            <li className="flex gap-2"><span className="text-brand-400 font-bold">4.</span> End the call — the lead is captured to your dashboard within ~15s</li>
          </ol>
          <p className="text-xs text-gray-600 mt-3">Powered by Retell AI. Free, no phone number needed.</p>
        </div>
      </div>
    </div>
  );
}

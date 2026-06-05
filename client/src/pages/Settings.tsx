import { useEffect, useState } from 'react';
import { Save, Phone, Bot, Globe } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import api from '../lib/api';
import { useLocationStore } from '../hooks/useLocation';
import type { FranchiseLocation } from '../types';

export default function Settings() {
  const { currentLocation, setCurrentLocation } = useLocationStore();
  const [form, setForm] = useState<Partial<FranchiseLocation> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentLocation) setForm(currentLocation);
  }, [currentLocation]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !currentLocation) return;
    setSaving(true);
    try {
      const res = await api.patch(`/locations/${currentLocation.id}`, {
        name: form.name,
        phone_number: form.phone_number,
        website_url: form.website_url,
        timezone: form.timezone,
        address: form.address,
        ai_config: form.ai_config,
      });
      setCurrentLocation(res.data.location);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Settings" subtitle="Configure your location and AI agent" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Bot className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No location found.</p>
            <p className="text-xs text-gray-600 mt-1">Make sure your server is running and a location exists in the database.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Settings" subtitle="Configure your location and AI agent" />

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSave} className="max-w-2xl space-y-6">
          {/* Location info */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-300">Location Details</h2>
            </div>

            <div>
              <label className="label">Location Name</label>
              <input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Website URL</label>
              <input className="input" type="url" value={form.website_url ?? ''} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
            </div>
            <div>
              <label className="label">Address</label>
              <input
                className="input"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Timezone</label>
              <select
                className="input"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              >
                {['America/Chicago', 'America/New_York', 'America/Los_Angeles', 'America/Denver', 'America/Phoenix'].map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-300">Phone Configuration</h2>
            </div>
            <div>
              <label className="label">Twilio Phone Number</label>
              <input
                className="input font-mono"
                value={form.phone_number ?? ''}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+14695551234"
              />
              <p className="text-xs text-gray-600 mt-1">
                Point your Twilio number webhook to:{' '}
                <code className="text-brand-400">YOUR_SERVER_URL/api/voice/incoming</code>
              </p>
            </div>
          </div>

          {/* AI Config */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-300">AI Agent Configuration</h2>
            </div>

            <div>
              <label className="label">Agent Name</label>
              <input
                className="input"
                value={form.ai_config?.agent_name ?? ''}
                onChange={(e) => setForm({ ...form, ai_config: { ...form.ai_config!, agent_name: e.target.value } })}
              />
            </div>

            <div>
              <label className="label">Greeting Script</label>
              <textarea
                className="input h-20 resize-none"
                value={form.ai_config?.greeting ?? ''}
                onChange={(e) => setForm({ ...form, ai_config: { ...form.ai_config!, greeting: e.target.value } })}
              />
            </div>

            <div>
              <label className="label">Farewell Script</label>
              <textarea
                className="input h-16 resize-none"
                value={form.ai_config?.farewell ?? ''}
                onChange={(e) => setForm({ ...form, ai_config: { ...form.ai_config!, farewell: e.target.value } })}
              />
            </div>

            <div>
              <label className="label">Max Conversation Turns</label>
              <input
                className="input"
                type="number"
                min={3}
                max={20}
                value={form.ai_config?.max_turns ?? 10}
                onChange={(e) => setForm({ ...form, ai_config: { ...form.ai_config!, max_turns: parseInt(e.target.value) } })}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}

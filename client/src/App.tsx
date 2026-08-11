import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Zap, Building2, Users } from 'lucide-react';
import api from './lib/api';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Calls from './pages/Calls';
import Leads from './pages/Leads';
import Knowledge from './pages/Knowledge';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import LiveCall from './pages/LiveCall';
import Campaigns from './pages/Campaigns';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import DemoDashboard from './pages/DemoDashboard';
import { useLocationStore } from './hooks/useLocation';
import { useRole } from './hooks/useRole';

// ── Shared loading screen ────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-neutral-surface">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-neutral-gray">Loading Blueslate…</p>
      </div>
    </div>
  );
}

// ── Path chooser — shown when signed in but no franchise set up ──
// Prevents customers from being sent to franchise onboarding by mistake.
function PathChooser() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-neutral-surface">
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-8 h-8 rounded-button flex items-center justify-center bg-brand-teal shadow-teal-glow">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-neutral-ink text-lg">Blueslate</span>
      </div>
      <p className="text-neutral-gray text-sm mb-8">What brings you here?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        <Link to="/onboarding"
          className="flex flex-col items-center gap-3 p-lg rounded-card-lg text-center transition-all hover:scale-[1.02] bg-white border border-neutral-border shadow-card"
          style={{ borderColor: 'rgba(14,169,139,0.3)' }}>
          <div className="w-12 h-12 rounded-card flex items-center justify-center bg-brand-teal/10">
            <Building2 className="w-6 h-6 text-brand-teal" />
          </div>
          <div>
            <p className="font-bold text-neutral-ink text-sm mb-1">I own a franchise</p>
            <p className="text-xs text-neutral-gray">Set up my AI receptionist</p>
          </div>
        </Link>
        <Link to="/customer"
          className="flex flex-col items-center gap-3 p-lg rounded-card-lg text-center transition-all hover:scale-[1.02] bg-white border border-neutral-border shadow-card"
          style={{ borderColor: 'rgba(14,169,139,0.3)' }}>
          <div className="w-12 h-12 rounded-card flex items-center justify-center bg-brand-teal/10">
            <Users className="w-6 h-6 text-brand-teal" />
          </div>
          <div>
            <p className="font-bold text-neutral-ink text-sm mb-1">I'm a customer</p>
            <p className="text-xs text-neutral-gray">Ask about a franchise or check my status</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ── Onboarding route guard (must be authenticated) ───────────────
function OnboardingRoute() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      window.__clerk = { session: { getToken: () => getToken() } };
    }
  }, [isSignedIn, getToken]);

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  return <Onboarding />;
}

// ── Main app layout (authenticated users with locations) ─────────
function AppLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { currentLocation, setCurrentLocation, setLocations, locations } = useLocationStore();
  // Start as true only when we don't already have cached locations
  const [locationsLoading, setLocationsLoading] = useState(() => locations.length === 0);

  useEffect(() => {
    if (isSignedIn) {
      window.__clerk = { session: { getToken: () => getToken() } };
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (!isSignedIn) {
      setLocationsLoading(false);
      return;
    }
    api.get('/locations')
      .then((res) => {
        const locs = res.data.locations ?? [];
        setLocations(locs);
        if (locs.length > 0 && !currentLocation) setCurrentLocation(locs[0]);
      })
      .catch(console.error)
      .finally(() => setLocationsLoading(false));
  }, [isSignedIn]);

  if (!isLoaded || locationsLoading) return <LoadingScreen />;

  // Not signed in → show public landing page
  if (!isSignedIn) return <Landing />;

  // No franchise set up → let user choose their path (owner or customer)
  if (locations.length === 0) return <PathChooser />;

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-surface">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/calls" element={<Calls />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/live-call" element={<LiveCall />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ── Admin route guard ────────────────────────────────────────────
function AdminRoute() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { isAdmin } = useRole();

  // Wire up Clerk token for the api axios interceptor — same pattern as AppLayout
  useEffect(() => {
    if (isSignedIn) {
      window.__clerk = { session: { getToken: () => getToken() } };
    }
  }, [isSignedIn, getToken]);

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AdminDashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer dashboard — auth required, no franchise setup needed */}
        <Route path="/customer" element={<CustomerDashboard />} />

        {/* Sample dashboard — public, no auth, lets prospects see the product */}
        <Route path="/demo-dashboard" element={<DemoDashboard />} />

        {/* Legal pages — public, no auth required */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Custom branded auth pages */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

        {/* Onboarding — standalone, no sidebar */}
        <Route path="/onboarding/*" element={<OnboardingRoute />} />

        {/* Admin console — standalone, no sidebar */}
        <Route path="/admin/*" element={<AdminRoute />} />

        {/* Everything else: shows Landing (guest) or full app (auth) */}
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn, SignUp, useAuth } from '@clerk/clerk-react';
import api from './lib/api';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Calls from './pages/Calls';
import Leads from './pages/Leads';
import Knowledge from './pages/Knowledge';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import LiveCall from './pages/LiveCall';
import { useLocationStore } from './hooks/useLocation';

function AppLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { currentLocation, setCurrentLocation, setLocations } = useLocationStore();

  // Expose clerk token to axios interceptor
  useEffect(() => {
    if (isSignedIn) {
      window.__clerk = {
        session: { getToken: () => getToken() },
      };
    }
  }, [isSignedIn, getToken]);

  // Load locations
  useEffect(() => {
    if (!isSignedIn) return;
    api.get('/locations').then((res) => {
      const locs = res.data.locations ?? [];
      setLocations(locs);
      if (locs.length > 0 && !currentLocation) {
        setCurrentLocation(locs[0]);
      }
    }).catch(console.error);
  }, [isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#09090d' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading Blueslate…</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#09090d' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/sign-in/*"
          element={
            <div className="flex items-center justify-center h-screen" style={{ background: '#09090d' }}>
              <SignIn routing="path" path="/sign-in" afterSignInUrl="/" />
            </div>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <div className="flex items-center justify-center h-screen" style={{ background: '#09090d' }}>
              <SignUp routing="path" path="/sign-up" afterSignUpUrl="/" />
            </div>
          }
        />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

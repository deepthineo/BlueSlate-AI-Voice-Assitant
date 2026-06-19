import { SignIn } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Zap, CheckCircle, Phone, Users, TrendingUp, Star } from 'lucide-react';

const FEATURES = [
  { icon: Phone, text: 'Never miss an inbound call — AI answers 24/7' },
  { icon: Users, text: 'Auto-capture leads from every conversation' },
  { icon: TrendingUp, text: 'Outbound follow-ups with one click' },
];

const TESTIMONIAL = {
  quote: "Set it up in 20 minutes. My AI booked a trial while I was at my kid's soccer game.",
  name: 'Sandra K.',
  role: 'Franchise Owner, 3 locations',
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen" style={{ background: '#09090d' }}>

      {/* ── Left panel — branding ──────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden px-12 py-10"
        style={{
          background: 'linear-gradient(145deg, rgba(124,58,237,0.12) 0%, rgba(9,9,13,1) 60%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Background glows */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none"
          style={{ background: '#7c3aed', transform: 'translate(-40%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full blur-[80px] opacity-10 pointer-events-none"
          style={{ background: '#6366f1', transform: 'translate(30%, 30%)' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3 mb-auto">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
          >
            <Zap className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <p className="font-black text-white text-base tracking-tight">Blueslate</p>
            <p className="text-xs font-medium" style={{ color: '#a78bfa' }}>AI Revenue OS</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative flex-1 flex flex-col justify-center max-w-md">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 w-fit"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd' }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Voice agent active · 24/7
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Welcome back to your<br />
            <span style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI Receptionist
            </span>
          </h1>

          <p className="text-gray-400 text-base mb-8 leading-relaxed">
            Your franchise's AI is standing by — answering calls, capturing leads,
            and following up while you focus on what matters.
          </p>

          <div className="space-y-3 mb-10">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <f.icon className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-sm text-gray-300">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-gray-300 leading-relaxed mb-3">"{TESTIMONIAL.quote}"</p>
            <div>
              <p className="text-xs font-semibold text-white">{TESTIMONIAL.name}</p>
              <p className="text-xs text-gray-500">{TESTIMONIAL.role}</p>
            </div>
          </div>
        </div>

        {/* Trust row */}
        <div className="relative flex items-center gap-4 mt-8">
          {['No credit card', 'Setup in 10 min', 'Cancel anytime'].map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-gray-500">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — auth form ────────────────────────────── */}
      <div className="flex-1 lg:max-w-[480px] flex flex-col items-center justify-center px-8 py-12 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-white text-base">Blueslate</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-black text-white mb-1">Sign in to your account</h2>
            <p className="text-sm text-gray-400">
              Don't have an account?{' '}
              <Link to="/sign-up" className="font-semibold transition-colors" style={{ color: '#a78bfa' }}>
                Start free trial
              </Link>
            </p>
          </div>

          <SignIn
            routing="path"
            path="/sign-in"
            afterSignInUrl="/"
            appearance={{
              variables: {
                colorBackground: 'transparent',
                colorInputBackground: '#1a1a26',
                colorInputText: '#e2e8f0',
                colorText: '#e2e8f0',
                colorTextSecondary: '#94a3b8',
                colorPrimary: '#7c3aed',
                colorDanger: '#ef4444',
                borderRadius: '12px',
                fontFamily: 'inherit',
                fontSize: '14px',
              },
              elements: {
                rootBox: 'w-full',
                card: 'bg-transparent shadow-none p-0 gap-4',
                headerBox: 'hidden',
                socialButtonsBlockButton: {
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#d1d5db',
                  background: 'rgba(255,255,255,0.04)',
                  '&:hover': { background: 'rgba(255,255,255,0.08)' },
                },
                dividerLine: { background: 'rgba(255,255,255,0.08)' },
                dividerText: { color: '#4b5563' },
                formFieldLabel: { color: '#d1d5db', fontWeight: '500' },
                formFieldInput: {
                  background: '#1a1a26',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                },
                formButtonPrimary: {
                  background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                  '&:hover': { opacity: 0.9 },
                },
                footerActionLink: { color: '#a78bfa' },
                identityPreviewText: { color: '#d1d5db' },
                identityPreviewEditButton: { color: '#a78bfa' },
                alertText: { color: '#fca5a5' },
                formFieldErrorText: { color: '#fca5a5' },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

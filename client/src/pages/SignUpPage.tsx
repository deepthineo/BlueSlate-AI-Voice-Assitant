import { SignUp } from '@clerk/clerk-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Zap, CheckCircle, ArrowRight, Building2, Phone, TrendingUp, Users, Star, MessageCircle } from 'lucide-react';

const FRANCHISE_STEPS = [
  { icon: Building2, title: 'Tell us about your franchise', time: '1 min' },
  { icon: Phone, title: 'Train your AI on your business', time: '2 min' },
  { icon: TrendingUp, title: 'Watch leads come in automatically', time: 'Ongoing' },
];

const CUSTOMER_STEPS = [
  { icon: MessageCircle, title: 'Sign up in seconds', time: '30 sec' },
  { icon: Star, title: 'Ask about programs & pricing', time: 'Instant' },
  { icon: Users, title: 'Track your inquiry status', time: 'Ongoing' },
];

const STATS = [
  { value: '< 2s', label: 'AI response time' },
  { value: '100%', label: 'Calls answered' },
  { value: '60s', label: 'Lead captured after call' },
];

export default function SignUpPage() {
  const [params] = useSearchParams();
  const isCustomer = params.get('role') === 'customer';
  const STEPS = isCustomer ? CUSTOMER_STEPS : FRANCHISE_STEPS;

  return (
    <div className="flex min-h-screen" style={{ background: '#09090d' }}>

      {/* ── Left panel — value prop ────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden px-12 py-10"
        style={{
          background: 'linear-gradient(145deg, rgba(124,58,237,0.12) 0%, rgba(9,9,13,1) 60%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none"
          style={{ background: '#7c3aed', transform: 'translate(-40%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-10 pointer-events-none"
          style={{ background: '#6366f1', transform: 'translate(30%, 30%)' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3 mb-auto">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
          >
            <Zap style={{ width: 18, height: 18 }} className="text-white" />
          </div>
          <div>
            <p className="font-black text-white text-base tracking-tight">Blueslate</p>
            <p className="text-xs font-medium" style={{ color: '#a78bfa' }}>AI Revenue OS</p>
          </div>
        </div>

        <div className="relative flex-1 flex flex-col justify-center max-w-md">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 w-fit"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}
          >
            <CheckCircle className="w-3 h-3" /> Free 14-day trial · No credit card needed
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            {isCustomer ? (
              <>Ask anything about<br />
                <span style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  your franchise
                </span>
              </>
            ) : (
              <>Your AI receptionist,<br />
                <span style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  live in 10 minutes
                </span>
              </>
            )}
          </h1>

          <p className="text-gray-400 text-base mb-8 leading-relaxed">
            {isCustomer
              ? 'Sign up to chat with any BlueSlate franchise AI, ask about programs and pricing, and track your inquiry status.'
              : "Set up your franchise's AI voice agent — answers every call, captures every lead, follows up automatically. No technical knowledge required."
            }
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="text-center p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">How it works</p>
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex items-center gap-3 group">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa' }}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <span className="text-sm text-gray-300">{step.title}</span>
                </div>
                <span className="text-xs font-medium text-gray-600 flex-shrink-0">{step.time}</span>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-gray-700 flex-shrink-0 hidden" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust */}
        <div className="relative flex items-center gap-4 mt-8">
          {['No technical setup', '14-day free trial', 'Cancel anytime'].map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-gray-500">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — signup form ──────────────────────────── */}
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
            <h2 className="text-2xl font-black text-white mb-1">
              {isCustomer ? 'Create your customer account' : 'Start your free trial'}
            </h2>
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/sign-in" className="font-semibold transition-colors" style={{ color: '#a78bfa' }}>
                Sign in
              </Link>
            </p>
            {!isCustomer && (
              <p className="text-xs text-gray-600 mt-1">
                Customer of a franchise?{' '}
                <Link to="/sign-up?role=customer" className="text-emerald-400 hover:underline">
                  Sign up here instead
                </Link>
              </p>
            )}
            {isCustomer && (
              <p className="text-xs text-gray-600 mt-1">
                Franchise owner?{' '}
                <Link to="/sign-up" className="text-purple-400 hover:underline">
                  Set up your AI receptionist
                </Link>
              </p>
            )}
          </div>

          <SignUp
            routing="path"
            path="/sign-up"
            afterSignUpUrl={isCustomer ? '/customer' : '/onboarding'}
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
                },
                footerActionLink: { color: '#a78bfa' },
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

import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen px-6 py-12" style={{ background: '#09090d', color: '#e2e8f0' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Blueslate</span>
          </Link>
        </div>

        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>

        <h1 className="text-3xl font-black text-white mb-2">Terms of Service</h1>
        <p className="text-xs text-gray-500 mb-10">Last updated: June 2026</p>

        <div className="space-y-8 text-sm text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-3">What Blueslate is</h2>
            <p>Blueslate is a free AI voice receptionist platform for franchise businesses. It is provided at no cost, with no paid tiers and no monetization. By signing up, you accept these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Acceptable use</h2>
            <p>You may use Blueslate for legitimate business purposes — answering inbound calls, capturing leads, and managing franchise communications. You may not use it for spam, fraud, harassment, or any illegal activity. Misuse results in account termination.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Your responsibility for calls</h2>
            <p>You are responsible for informing callers that they may be speaking with an AI system, where required by applicable law. Blueslate provides the technology; compliance with local call recording and disclosure laws is your responsibility.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Your data</h2>
            <p>You own all lead data, call transcripts, and knowledge base content created within your account. We do not claim ownership over your business data.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Service availability</h2>
            <p>Blueslate is provided "as is." We aim for high availability but do not guarantee uninterrupted service. The platform is free and provided without warranty of any kind.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Changes to these terms</h2>
            <p>We may update these terms. Continued use of Blueslate after changes means you accept the updated terms. We will notify registered users of significant changes by email.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Contact</h2>
            <p>Questions: <a href="mailto:support@blueslate.ai" className="text-purple-400 hover:underline">support@blueslate.ai</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}

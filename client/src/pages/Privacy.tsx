import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';

export default function Privacy() {
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

        <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-xs text-gray-500 mb-10">Last updated: June 2026</p>

        <div className="space-y-8 text-sm text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-3">What we collect</h2>
            <p>When you sign up, we collect your email address and business name to create your account. When your AI agent handles calls, we store call transcripts, extracted lead data (caller name, phone number, interest), and AI-generated summaries — all scoped to your franchise location.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">How we use your data</h2>
            <p>Your data is used solely to operate your AI receptionist and populate your dashboard. We do not sell your data, share it with third parties for advertising, or use it to train any AI models beyond your own knowledge base.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Your callers' data</h2>
            <p>Caller information captured during AI-handled calls (name, phone, interest) is stored in your tenant partition in our database. You own this data. You can delete it at any time from your dashboard.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Third-party services</h2>
            <p>We use Twilio for phone calls, Clerk for authentication, and Supabase for data storage. Each service has its own privacy policy. No franchise data is shared with these providers beyond what is necessary to operate the service.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Data retention</h2>
            <p>Your account data is retained as long as your account is active. You can request deletion of your account and all associated data by emailing <a href="mailto:support@blueslate.ai" className="text-purple-400 hover:underline">support@blueslate.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-3">Contact</h2>
            <p>Questions about this policy: <a href="mailto:support@blueslate.ai" className="text-purple-400 hover:underline">support@blueslate.ai</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}

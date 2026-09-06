import React, { useState } from 'react';
import { Sparkles, Shield, Lock, Brain, ArrowRight, CheckCircle2, AlertTriangle, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebase';
import { AuthErrorInfo } from '../types';

interface LandingPageProps {
  onSignIn: () => Promise<void>;
  onGuestSignIn: () => void;
  isLoading: boolean;
  authError?: AuthErrorInfo | null;
  onDismissError?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onGuestSignIn,
  isLoading,
  authError,
  onDismissError,
}) => {
  const [copied, setCopied] = useState(false);
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleCopyHost = () => {
    if (currentHost) {
      navigator.clipboard.writeText(currentHost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-950/50 font-bold text-lg">
              G
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-slate-100">Gemini Vault</span>
              <span className="ml-2 text-xs uppercase tracking-wider text-cyan-400 font-semibold bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/50">
                Gemini 3.6 Flash
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onGuestSignIn}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
            >
              Guest Demo
            </button>
            <button
              id="btn-nav-signin"
              onClick={onSignIn}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-300 bg-slate-900/80 border border-slate-700/80 rounded-lg hover:bg-slate-800 hover:text-white hover:border-slate-600 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Authenticating...' : 'Sign In with Google'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto px-6 py-12 lg:py-20">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 text-xs font-medium text-cyan-300 shadow-sm shadow-cyan-950/40">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Strict User-Isolated Cloud Firestore Storage & Security Rules</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-slate-100 leading-[1.15]">
            Your private AI thinking space that learns how your thinking evolves.
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 leading-relaxed font-normal">
            A secure, authenticated journal with persistent personal memory, location-aware reflection, and longitudinal insights powered by <strong className="text-slate-200 font-semibold">Gemini 3.6 Flash</strong> on Google Cloud Run.
          </p>

          {/* Auth Error Banners */}
          {authError && authError.code === 'popup-blocked' && (
            <div className="text-left bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-4 sm:p-5 shadow-lg shadow-black/40 space-y-3">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-slate-200">
                  <p className="font-semibold text-cyan-300">Google Sign-In Popup Was Blocked</p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Your browser or the embedded preview iframe blocked the Google authentication popup. You can open the app in a dedicated browser tab to sign in seamlessly, or continue immediately in Guest Mode:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-cyan-500/20">
                <button
                  onClick={handleOpenInNewTab}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open App in New Tab to Sign In</span>
                </button>
                <button
                  onClick={onGuestSignIn}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
                >
                  Continue in Guest Mode
                </button>
                <button
                  onClick={onSignIn}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          )}

          {authError && authError.code === 'unauthorized-domain' && (
            <div className="text-left bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 sm:p-5 shadow-lg shadow-black/40 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-slate-200">
                  <p className="font-semibold text-amber-300">Firebase Domain Authorization Required</p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Firebase blocked Google Sign-In because this domain is not in your project's whitelist. To log in with your actual Google account, add this domain to Firebase Console:
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg p-2 font-mono text-xs text-cyan-300">
                    <span className="truncate max-w-[280px] sm:max-w-md">{currentHost}</span>
                    <button
                      onClick={handleCopyHost}
                      className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-sans font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-400">
                    Step: Go to <strong className="text-slate-300">Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains &gt; Add domain</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1 border-t border-amber-500/20">
                {onDismissError && (
                  <button
                    onClick={onDismissError}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
                <button
                  onClick={onGuestSignIn}
                  className="px-3 py-1.5 text-xs font-medium text-amber-200 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  Continue in Guest Mode
                </button>
              </div>
            </div>
          )}

          {authError && authError.code !== 'popup-blocked' && authError.code !== 'unauthorized-domain' && (
            <div className="text-left bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 shadow-lg shadow-black/40 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-slate-300">
                  <p className="font-semibold text-slate-200">Sign-In Notice</p>
                  <p className="mt-1 text-xs text-slate-400">{authError.message}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-800">
                {onDismissError && (
                  <button onClick={onDismissError} className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                    Dismiss
                  </button>
                )}
                <button
                  onClick={onGuestSignIn}
                  className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Continue in Guest Mode
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="btn-hero-start"
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 text-base font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl transition-all shadow-lg shadow-cyan-950/50 hover:shadow-cyan-900/60 disabled:opacity-50 group cursor-pointer border border-cyan-400/20"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Opening Workspace...' : 'Sign In with Google'}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            
            <button
              onClick={onGuestSignIn}
              className="w-full sm:w-auto px-5 py-3.5 text-sm font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all cursor-pointer"
            >
              Explore as Guest
            </button>
          </div>

          {!isFirebaseConfigured && (
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tip: Ready to test out of the box! Clicking Sign In activates the instant preview workspace while supporting real Google & Firestore authentication.
            </p>
          )}
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md backdrop-blur-xs space-y-3 hover:border-slate-700/80 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-serif font-semibold text-slate-100">Multi-Turn AI Dialogue</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Explore your thoughts through conversational journaling. Gemini 3.6 Flash asks insightful questions and extracts key insights.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md backdrop-blur-xs space-y-3 hover:border-slate-700/80 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-serif font-semibold text-slate-100">Strict User Isolation</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your journal entries are isolated under <code className="text-xs bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300 border border-slate-800">/users/{'{uid}'}/interactions</code> with owner-bound Firestore security rules.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md backdrop-blur-xs space-y-3 hover:border-slate-700/80 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/50 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-serif font-semibold text-slate-100">Holistic Synthesis</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Summarize multi-day entries, identify emotional & productivity patterns, and convert reflections into concrete action plans.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ReflectAI • Powered by Gemini 3.6 Flash & Cloud Firestore</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resilient Model Fallback Ladder Active</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};


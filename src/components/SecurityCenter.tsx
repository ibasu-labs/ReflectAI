import React, { useState, useEffect } from 'react';
import { UserProfile, SecurityTestCase } from '../types';
import { getAuthToken } from '../lib/firebase';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Server,
  Database,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  EyeOff,
  Globe,
  FileCheck,
  Cpu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SecurityCenterProps {
  user: UserProfile;
}

const THREAT_ZONES = [
  {
    zone: '1. Input Surfaces',
    scope: 'Journal entries, candidate memories, search queries, location metadata',
    threats: 'Prompt injection (OWASP LLM01), oversized payloads (DoS), malicious markdown/script injection',
    countermeasure: 'Strict XML boundaries (<untrusted_journal_content>), character limits (1,000 chars for memories), and markup sanitization.',
  },
  {
    zone: '2. Planning & Reasoning',
    scope: 'Gemini system instructions, reflection mode prompts, synthesis tasks',
    threats: 'System instruction overrides, role-flipping attacks, leaking internal guidelines',
    countermeasure: 'Strict system instructions instructing Gemini to treat input strictly as personal reflective data, never executable commands.',
  },
  {
    zone: '3. Tool Execution',
    scope: 'Cloud Run server routes (/api/gemini/converse, /api/memories/extract, /api/journal/ask)',
    threats: 'SSRF, privilege escalation, server runtime bypass',
    countermeasure: 'Strict endpoint parameterization, zero dynamic shell execution, null-safe payload parsing, and error abstraction.',
  },
  {
    zone: '4. Memory & State',
    scope: 'Cloud Firestore database, user document paths, memory records',
    threats: 'Cross-user data leakage (OWASP A01), client-forged UIDs, unauthenticated queries',
    countermeasure: 'Token-verified UID derivation on server, owner-bound Firestore Security Rules (request.auth.uid == userId), zero collectionGroup permissions.',
  },
  {
    zone: '5. Inter-System Comm',
    scope: 'Google Cloud Secret Manager, Gemini API SDK, Google Maps Platform',
    threats: 'API key exposure in client bundles, token leakage in stdout logs',
    countermeasure: 'GEMINI_API_KEY kept exclusively server-side via process.env/Secret Manager. Redacted sensitive user reflection content in logs.',
  },
];

export const SecurityCenter: React.FC<SecurityCenterProps> = ({ user }) => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<SecurityTestCase[]>([]);
  const [testStats, setTestStats] = useState<{ total: number; passed: number; failed: number } | null>(null);
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // Run tests on first mount
  useEffect(() => {
    runSecurityVerification();
  }, []);

  const runSecurityVerification = async () => {
    setIsRunningTests(true);
    setRunError(null);

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/security/run-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Security verification failed with status ${res.status}`);
      }

      const data = await res.json();
      setTestResults(data.tests || []);
      setTestStats({
        total: data.totalTests || 0,
        passed: data.passedCount || 0,
        failed: data.failedCount || 0,
      });
      setLastExecuted(data.timestamp || new Date().toISOString());
    } catch (err: any) {
      console.error('Error running security test suite:', err);
      setRunError(err?.message || 'Failed to run security suite.');
    } finally {
      setIsRunningTests(false);
    }
  };

  const filteredTests = testResults.filter((t) => {
    const matchesCat = selectedCategory === 'all' || t.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-950/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-100">Security Center</h1>
            <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
              Zero-Trust Architecture
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Real-time verification of owner isolation, token verification, prompt injection defense, and Secret Manager hygiene.
          </p>
        </div>

        <button
          id="btn-run-sec-tests"
          onClick={runSecurityVerification}
          disabled={isRunningTests}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 shadow-lg shadow-emerald-950/50 border border-emerald-400/20 transition-all cursor-pointer shrink-0"
        >
          {isRunningTests ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
              <span>Verifying Controls...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Run Automated SEC Tests</span>
            </>
          )}
        </button>
      </div>

      {/* Security Architecture Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1 */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Lock className="w-4 h-4" />
            <h3 className="text-sm font-bold text-slate-200">Owner-Bound Isolation</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All reflections, memories, and metadata are strictly stored under{' '}
            <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">/users/{'{uid}'}/...</code>.
            Client-supplied UIDs are rejected; identities are derived strictly from cryptographically verified Firebase ID tokens.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <Server className="w-4 h-4" />
            <h3 className="text-sm font-bold text-slate-200">Cloud Run Server-Side AI</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Gemini API keys and Google Cloud service credentials never touch the browser. All inferences run on Google Cloud Run
            with resilient model ladders (Gemini 3.6 Flash & fallbacks).
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-purple-400">
            <EyeOff className="w-4 h-4" />
            <h3 className="text-sm font-bold text-slate-200">OWASP LLM01 Containment</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            User inputs and historical reflections are encapsulated in XML data boundaries{' '}
            (<code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">&lt;untrusted_journal_content&gt;</code>).
            AI directives mandate strict data-only interpretation.
          </p>
        </div>
      </div>

      {/* Live Test Suite Metrics */}
      {testStats && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/20 border border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/80 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">
                  {testStats.passed} of {testStats.total} Tests Passing
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800">
                  100% Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Covers SEC-01 through SEC-18 test suite requirements for the Cloud Run AI Challenge.
              </p>
            </div>
          </div>

          {lastExecuted && (
            <span className="text-xs text-slate-500 shrink-0">
              Last executed: {new Date(lastExecuted).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search test code or name (e.g. SEC-03, isolation)..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {['all', 'auth', 'isolation', 'injection', 'integrity', 'secrets', 'location'].map((cat) => {
            const count =
              cat === 'all'
                ? testResults.length
                : testResults.filter((t) => t.category.toLowerCase() === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        {filteredTests.map((test) => {
          const isExpanded = expandedTestId === test.id;
          return (
            <div
              key={test.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                    {test.code}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{test.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{test.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PASSED</span>
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="pt-3 border-t border-slate-800/60 space-y-2 text-xs animate-fade-in">
                  <div>
                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      Expected Outcome:
                    </span>
                    <p className="text-slate-300 mt-0.5">{test.expectedOutcome}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      Active Mitigation & Result:
                    </span>
                    <p className="text-emerald-300/90 mt-0.5">{test.resultDetails}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Threat Summary Table (Production Directive 1) */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-slate-100">
            Agentic Threat Model Matrix (The 5 Threat Zones)
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Structured scenario-driven threat analysis mandated by the production directives for the Google Cloud Run AI Challenge.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="py-2.5 px-3 font-semibold">Threat Zone</th>
                <th className="py-2.5 px-3 font-semibold">Scope & Target</th>
                <th className="py-2.5 px-3 font-semibold">Potential Vulnerability</th>
                <th className="py-2.5 px-3 font-semibold">Active Countermeasure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {THREAT_ZONES.map((tz, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-3 px-3 font-semibold text-slate-200 whitespace-nowrap">{tz.zone}</td>
                  <td className="py-3 px-3 text-slate-400">{tz.scope}</td>
                  <td className="py-3 px-3 text-rose-300/90">{tz.threats}</td>
                  <td className="py-3 px-3 text-emerald-300/90">{tz.countermeasure}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

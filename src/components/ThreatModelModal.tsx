import React from 'react';
import { ShieldCheck, X, Lock, Key, Database, Cpu, Network, CheckCircle2 } from 'lucide-react';

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const threatZones = [
    {
      zone: '1. Input Surfaces',
      icon: Network,
      threat: 'Malicious prompt injection, payload tampering, unvalidated reflection content.',
      countermeasure: 'Strict defensive payload destructuring, size limits (10MB), and schema sanitization before passing to Gemini.',
      status: 'Implemented',
    },
    {
      zone: '2. Planning & Reasoning',
      icon: Cpu,
      threat: 'System instruction overrides or LLM jailbreaking to access system resources.',
      countermeasure: 'Strictly sandboxed system instructions for Gemini 3.6 Flash and response isolation; LLM outputs parsed as plain text & structured JSON without dynamic evaluation.',
      status: 'Implemented',
    },
    {
      zone: '3. Tool & Execution',
      icon: Key,
      threat: 'Direct API key leaks to client browsers or SSRF via backend routes.',
      countermeasure: 'Zero-hardcoded secrets; Gemini API key is isolated server-side (process.env.GEMINI_API_KEY) and proxied exclusively via /api/* routes.',
      status: 'Implemented',
    },
    {
      zone: '4. Memory & State (Firestore)',
      icon: Database,
      threat: 'Cross-user data exposure, unauthorized reading or overwriting of other users’ journals.',
      countermeasure: 'Owner-bound path checking: rules_version = "2"; match /users/{userId}/interactions/{interactionId} { allow read, write: if request.auth.uid == userId; } and undefined-stripping.',
      status: 'Implemented',
    },
    {
      zone: '5. Inter-System Communication',
      icon: Lock,
      threat: 'Service unavailability, quota exhaustion, transient HTTP failures.',
      countermeasure: 'Resilient Model Fallback Ladder (gemini-3.6-flash -> gemini-3.1-flash-lite -> gemini-flash-latest -> gemini-3.7-flash) with automated status code recovery.',
      status: 'Implemented',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-100">
                Agentic Threat Model & Security Directives
              </h2>
              <p className="text-xs text-slate-400">
                Compliance Mapping across the 5 Critical Threat Zones (OWASP Web & LLM)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="rounded-xl border border-slate-800 overflow-hidden shadow-md bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Threat Zone</th>
                  <th className="p-3">Identified Risk</th>
                  <th className="p-3">Implemented Countermeasure</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {threatZones.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 font-semibold text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{item.zone}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-400">{item.threat}</td>
                      <td className="p-3 text-slate-200 font-medium">{item.countermeasure}</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-200">
              Cloud Firestore Isolation Guarantee:
            </p>
            <p>
              Security rules are strictly owner-scoped under <code className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-cyan-300 font-mono">/users/{'{userId}'}/interactions/{'{interactionId}'}</code> requiring <code className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-cyan-300 font-mono">request.auth.uid == userId</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

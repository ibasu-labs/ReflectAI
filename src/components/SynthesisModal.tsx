import React, { useState } from 'react';
import { JournalInteraction } from '../types';
import { Sparkles, X, BookOpen, TrendingUp, Compass, RefreshCw, AlertCircle } from 'lucide-react';
import Markdown from 'react-markdown';

interface SynthesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  interactions: JournalInteraction[];
}

export const SynthesisModal: React.FC<SynthesisModalProps> = ({
  isOpen,
  onClose,
  interactions,
}) => {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisText, setSynthesisText] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunSynthesis = async () => {
    if (interactions.length === 0) return;
    setIsSynthesizing(true);
    setError(null);

    try {
      const payload = {
        entries: interactions.slice(0, 10).map((i) => ({
          title: i.title,
          createdAt: i.createdAt,
          content: i.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n'),
        })),
      };

      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      setSynthesisText(data.summary);
      setModelUsed(data.modelUsed);
    } catch (err: any) {
      console.error('Synthesis error:', err);
      setError(err?.message || 'Failed to synthesize reflections with Gemini API.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-slate-100">
                Holistic Journal Synthesis
              </h2>
              <p className="text-xs text-slate-400">
                Analyzing your {interactions.length} reflections for themes, growth trends, & clarity
              </p>
            </div>
          </div>
          <button
            id="btn-close-synthesis"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!synthesisText && !isSynthesizing && !error && (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-cyan-950/80 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-800/50 shadow-md shadow-cyan-950/40">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-serif text-base font-semibold text-slate-100">
                  Ready to discover longitudinal insights?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gemini 3.6 Flash will cross-examine your recent journal entries to highlight recurring thought patterns, progress markers, and suggested areas for constructive focus.
                </p>
              </div>

              <button
                id="btn-trigger-synthesis"
                onClick={handleRunSynthesis}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-950/50 border border-cyan-400/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Generate Synthesis ({interactions.length} entries)</span>
              </button>
            </div>
          )}

          {isSynthesizing && (
            <div className="text-center py-12 space-y-3 animate-pulse">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-sm font-serif font-medium text-slate-100">
                Synthesizing patterns with Gemini 3.6 Flash...
              </p>
              <p className="text-xs text-slate-400">
                Cross-referencing emotions, action commitments, and reflection topics.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Synthesis Error</span>
              </div>
              <p>{error}</p>
              <button
                onClick={handleRunSynthesis}
                className="px-3 py-1 bg-rose-900 border border-rose-700 rounded text-white font-medium hover:bg-rose-800 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {synthesisText && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-md">
                <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed">
                  <Markdown>{synthesisText}</Markdown>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                {modelUsed && <span>Synthesized via: <strong className="text-cyan-400">{modelUsed}</strong></span>}
                <button
                  onClick={handleRunSynthesis}
                  disabled={isSynthesizing}
                  className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium cursor-pointer"
                >
                  Regenerate Analysis
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
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

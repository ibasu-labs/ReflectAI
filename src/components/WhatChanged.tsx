import React, { useState } from 'react';
import { UserProfile, JournalInteraction, UserMemory, WhatChangedResponse } from '../types';
import { getAuthToken } from '../lib/firebase';
import {
  TrendingUp,
  GitCompare,
  Sparkles,
  Calendar,
  Compass,
  Quote,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Brain,
  BookOpen,
} from 'lucide-react';

interface WhatChangedProps {
  user: UserProfile;
  interactions: JournalInteraction[];
  memories: UserMemory[];
  onOpenEntry?: (id: string) => void;
  onSelectThoughtStarter?: (prompt: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  goals: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/60' },
  priorities: { bg: 'bg-cyan-950/60', text: 'text-cyan-300', border: 'border-cyan-700/60' },
  habits: { bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-700/60' },
  values: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-700/60' },
  decisions: { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-700/60' },
  themes: { bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-700/60' },
};

export const WhatChanged: React.FC<WhatChangedProps> = ({
  user,
  interactions,
  memories,
  onOpenEntry,
  onSelectThoughtStarter,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<WhatChangedResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication token required to run longitudinal analysis.');
      }

      const res = await fetch('/api/journal/what-changed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cachedEntries: interactions.map((e) => ({
            id: e.id,
            title: e.title,
            createdAt: e.createdAt,
            summary: e.summary,
            location: e.location,
            messages: e.messages,
          })),
          cachedMemories: memories.map((m) => ({
            id: m.id,
            text: m.text,
            category: m.category,
            createdAt: m.createdAt,
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned status ${res.status}`);
      }

      const data: WhatChangedResponse = await res.json();
      setAnalysisResult(data);
    } catch (err: any) {
      console.error('What Changed error:', err);
      setAnalysisError(err?.message || 'Failed to complete longitudinal analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredChanges = analysisResult?.changes.filter((c) => {
    if (selectedCategory === 'all') return true;
    return c.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-950/50">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-100">What Changed?</h1>
            <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              Longitudinal Reflection
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Compare earlier reflections against recent thoughts to observe shifts in goals, priorities, habits, and convictions.
          </p>
        </div>

        <button
          id="btn-run-what-changed"
          onClick={handleRunAnalysis}
          disabled={isAnalyzing || (interactions.length < 2 && memories.length < 2)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-950/50 border border-cyan-400/20 transition-all cursor-pointer shrink-0"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
              <span>Analyzing Trajectory...</span>
            </>
          ) : (
            <>
              <GitCompare className="w-4 h-4" />
              <span>{analysisResult ? 'Re-Analyze Thinking' : 'Analyze What Changed'}</span>
            </>
          )}
        </button>
      </div>

      {/* Security & Isolation Notice */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Strict single-user analysis. Encapsulated within XML data boundaries. Non-diagnostic and non-medical.
          </span>
        </div>
        <span className="text-slate-500 hidden sm:inline">
          {interactions.length} reflections • {memories.length} memories
        </span>
      </div>

      {/* Notice if less than 2 entries */}
      {interactions.length < 2 && memories.length < 2 && (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-amber-900/40 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400 mx-auto">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200">More Reflection Data Needed</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              "What Changed?" compares your earlier perspective with your current perspective. You currently have{' '}
              <span className="text-amber-300 font-semibold">{interactions.length} entries</span>. Create at least 2
              reflections across different moments to activate longitudinal shift detection.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {analysisError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{analysisError}</span>
          </div>
          <button
            onClick={handleRunAnalysis}
            className="px-3 py-1 font-semibold text-rose-200 bg-rose-900/80 hover:bg-rose-800 rounded-md cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Pre-Analysis Explainer / Placeholder */}
      {!analysisResult && !isAnalyzing && interactions.length >= 2 && (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h2 className="text-base font-bold text-slate-200">Discover How Your Thoughts Have Shifted</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gemini Vault will chronologically contrast your earliest journal entries with your latest entries, highlighting
              tangible changes in your decision-making, daily focus, and personal philosophy with direct quotes.
            </p>
          </div>
          <button
            onClick={handleRunAnalysis}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/60 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Start Longitudinal Analysis</span>
          </button>
        </div>
      )}

      {/* Results Display */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Overarching Narrative Overview Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-800/60 shadow-xl shadow-black/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">Synthesis of Evolution</h3>
              </div>
              {analysisResult.modelUsed && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {analysisResult.modelUsed}
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-sans">
              {analysisResult.overview}
            </p>
            {analysisResult.timeRange && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Analyzed {analysisResult.timeRange.totalEntriesAnalyzed || interactions.length} journal interactions
                </span>
              </div>
            )}
          </div>

          {/* Category Filter Chips */}
          {analysisResult.changes.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-cyan-500 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All Changes ({analysisResult.changes.length})
              </button>
              {['goals', 'priorities', 'habits', 'values', 'decisions', 'themes'].map((cat) => {
                const count = analysisResult.changes.filter(
                  (c) => c.category.toLowerCase() === cat
                ).length;
                if (count === 0) return null;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-200 text-slate-950 font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Observed Shifts Cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-cyan-400" />
              <span>Observed Shifts in Thinking ({filteredChanges?.length || 0})</span>
            </h3>

            {filteredChanges && filteredChanges.length > 0 ? (
              filteredChanges.map((change, idx) => {
                const catColor =
                  CATEGORY_COLORS[change.category.toLowerCase()] || CATEGORY_COLORS.priorities;

                return (
                  <div
                    key={idx}
                    className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800/90 shadow-lg shadow-black/30 space-y-4 hover:border-slate-700 transition-all"
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${catColor.bg} ${catColor.text} ${catColor.border}`}
                        >
                          {change.category}
                        </span>
                        <h4 className="text-base font-bold text-slate-100">{change.title}</h4>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 text-cyan-300 border border-slate-700">
                        {Math.round((change.confidence || 0.85) * 100)}% Evidence Confidence
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed font-sans">
                      {change.observedChange}
                    </p>

                    {/* Side-by-side Evidence Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Earlier Thinking */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-semibold text-amber-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Earlier Perspective
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {change.earlierEvidence.date
                              ? new Date(change.earlierEvidence.date).toLocaleDateString()
                              : 'Earlier'}
                          </span>
                        </div>
                        <div className="relative pl-3 border-l-2 border-amber-500/50 italic text-xs text-slate-300">
                          "{change.earlierEvidence.quote}"
                        </div>
                        {change.earlierEvidence.sourceTitle && (
                          <p className="text-[11px] text-slate-500 truncate">
                            Source: {change.earlierEvidence.sourceTitle}
                          </p>
                        )}
                      </div>

                      {/* Recent Thinking */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-semibold text-cyan-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Recent Perspective
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {change.recentEvidence.date
                              ? new Date(change.recentEvidence.date).toLocaleDateString()
                              : 'Recent'}
                          </span>
                        </div>
                        <div className="relative pl-3 border-l-2 border-cyan-500/50 italic text-xs text-slate-300">
                          "{change.recentEvidence.quote}"
                        </div>
                        {change.recentEvidence.sourceTitle && (
                          <p className="text-[11px] text-slate-500 truncate">
                            Source: {change.recentEvidence.sourceTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-900/40 rounded-xl border border-slate-800">
                No changes recorded in the selected category.
              </p>
            )}
          </div>

          {/* Continuity Anchors */}
          {analysisResult.continuity && analysisResult.continuity.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Core Continuity Anchors (Steadfast Values)</span>
              </h3>
              <ul className="space-y-2">
                {analysisResult.continuity.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Provocative Growth Questions */}
          {analysisResult.growthQuestions && analysisResult.growthQuestions.length > 0 && (
            <div className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Reflections for Future Growth</span>
              </h3>
              <div className="space-y-2">
                {analysisResult.growthQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/70 border border-cyan-900/60 flex items-center justify-between gap-3 group"
                  >
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">{q}</p>
                    {onSelectThoughtStarter && (
                      <button
                        onClick={() => onSelectThoughtStarter(q)}
                        className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold shrink-0 cursor-pointer"
                      >
                        <span>Reflect on this</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

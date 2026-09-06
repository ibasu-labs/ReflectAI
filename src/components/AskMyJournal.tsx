import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  BookOpen,
  Brain,
  History,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Compass,
  ArrowRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  JournalInteraction,
  UserMemory,
  UserProfile,
  AskJournalCitation,
  AskJournalSessionTurn,
} from '../types';
import { askMyJournalAPI } from '../lib/firebase';

interface AskMyJournalProps {
  user: UserProfile;
  interactions: JournalInteraction[];
  memories: UserMemory[];
  onSelectInteraction?: (interaction: JournalInteraction) => void;
  onSelectMemory?: (memory: UserMemory) => void;
  onNavigateToWorkspace?: () => void;
}

const SUGGESTED_QUESTIONS = [
  'What have I been focusing on recently?',
  'What career goals have I mentioned?',
  'What concerns keep coming up in my journal?',
  'What decisions have I been considering?',
];

export const AskMyJournal: React.FC<AskMyJournalProps> = ({
  interactions,
  memories,
  onSelectInteraction,
  onNavigateToWorkspace,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionTurns, setSessionTurns] = useState<AskJournalSessionTurn[]>([]);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);

  const totalContentCount = interactions.length + memories.length;
  const isJournalEmpty = totalContentCount === 0;

  const handleAsk = async (queryToAsk?: string) => {
    const activeQuestion = (queryToAsk || question).trim();
    if (!activeQuestion || loading) return;

    setError(null);
    setLoading(true);

    try {
      const response = await askMyJournalAPI(activeQuestion, interactions, memories);

      const newTurn: AskJournalSessionTurn = {
        id: 'turn_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        question: activeQuestion,
        answer: response.answer,
        hasSufficientEvidence: response.hasSufficientEvidence,
        explicitFacts: response.explicitFacts || [],
        interpretations: response.interpretations || [],
        citations: response.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: response.modelUsed,
      };

      setSessionTurns((prev) => [newTurn, ...prev]);
      setQuestion('');
    } catch (err: any) {
      console.error('Ask My Journal error:', err);
      setError(err?.message || 'An error occurred while inquiring into your journal.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const toggleCitation = (citationId: string) => {
    setExpandedCitationId((prev) => (prev === citationId ? null : citationId));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-100 flex items-center gap-2">
                Ask My Journal
                <span className="text-xs font-sans font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  Grounded Synthesis
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Explore patterns, track recurring themes, and retrieve personal insights grounded strictly in your reflections.
              </p>
            </div>
          </div>
        </div>

        {/* Evidence Status Pill */}
        <div className="flex items-center gap-2 text-xs bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 self-start sm:self-auto text-slate-300">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>{interactions.length} entries</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-blue-400" />
            <span>{memories.length} memories</span>
          </div>
        </div>
      </div>

      {/* Empty State Warning if 0 entries & 0 memories */}
      {isJournalEmpty && (
        <div
          id="ask-empty-journal-banner"
          className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800 text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
            <Compass className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-semibold text-slate-200">No Journal Data Available Yet</h2>
            <p className="text-xs text-slate-400">
              Ask My Journal answers questions grounded exclusively in your reflections and memories. Write your first reflection or extract a memory to start discovering insights.
            </p>
          </div>
          {onNavigateToWorkspace && (
            <button
              id="btn-empty-start-journal"
              onClick={onNavigateToWorkspace}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-md transition-all cursor-pointer"
            >
              Write First Reflection
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Query Input Box */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-4 sm:p-5 shadow-xl shadow-black/20 space-y-4">
        <div className="relative">
          <label htmlFor="input-ask-journal" className="sr-only">
            Ask a question about your journal
          </label>
          <textarea
            id="input-ask-journal"
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about recurring themes, goals, habits, or decisions (e.g., 'What have I been focusing on recently?')..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none transition-all"
            disabled={loading}
          />
        </div>

        {/* Suggestion Chips */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sample queries:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                id={`btn-suggestion-${idx}`}
                onClick={() => {
                  setQuestion(suggestion);
                  handleAsk(suggestion);
                }}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 hover:bg-cyan-950/40 hover:border-cyan-700/60 hover:text-cyan-200 transition-all text-left cursor-pointer disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-500">
            Press <kbd className="px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-400 text-[10px] font-mono">Enter</kbd> to ask • Strict data isolation enforced
          </span>

          <button
            id="btn-submit-ask"
            onClick={() => handleAsk()}
            disabled={!question.trim() || loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md shadow-cyan-950/40 border border-cyan-400/20 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                <span>Searching & Reasoning...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Ask Journal</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert with Retry */}
      <AnimatePresence>
        {error && (
          <motion.div
            id="ask-error-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 flex items-start justify-between gap-3 shadow-md"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-rose-300">Unable to Complete Query</p>
                <p className="text-xs text-rose-300/80">{error}</p>
              </div>
            </div>
            <button
              id="btn-retry-ask"
              onClick={() => handleAsk()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 rounded-md border border-rose-700/60 transition-all cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeleton */}
      {loading && (
        <div
          id="ask-loading-indicator"
          className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 animate-pulse space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-900/30 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 bg-slate-800 rounded-sm w-48" />
              <div className="h-2.5 bg-slate-800/60 rounded-sm w-32" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 bg-slate-800/80 rounded-sm w-full" />
            <div className="h-3 bg-slate-800/80 rounded-sm w-5/6" />
            <div className="h-3 bg-slate-800/80 rounded-sm w-4/6" />
          </div>
        </div>
      )}

      {/* Session Q&A History */}
      <div className="space-y-6">
        {sessionTurns.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              Session Conversation History ({sessionTurns.length})
            </h2>
            <button
              id="btn-clear-session"
              onClick={() => setSessionTurns([])}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Clear Session
            </button>
          </div>
        )}

        {sessionTurns.map((turn) => (
          <motion.article
            key={turn.id}
            id={`turn-${turn.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-5 shadow-lg shadow-black/20"
          >
            {/* User Question */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                  Question • {turn.timestamp}
                </span>
                <p className="text-sm sm:text-base font-semibold text-slate-100">{turn.question}</p>
              </div>

              {/* Insufficient Evidence or Grounded Badge */}
              {turn.hasSufficientEvidence ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Grounded
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60 shrink-0">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  Insufficient Evidence
                </span>
              )}
            </div>

            {/* Answer Content */}
            <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed font-sans">
              <ReactMarkdown>{turn.answer}</ReactMarkdown>
            </div>

            {/* Explicit Facts vs AI Interpretations Breakout */}
            {(turn.explicitFacts.length > 0 || turn.interpretations.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {/* Explicit Facts */}
                {turn.explicitFacts.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Explicit Journal Facts</span>
                    </div>
                    <ul className="space-y-1.5">
                      {turn.explicitFacts.map((fact, fIdx) => (
                        <li key={fIdx} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Interpretations */}
                {turn.interpretations.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                      <span>AI Interpretation & Patterns</span>
                    </div>
                    <ul className="space-y-1.5">
                      {turn.interpretations.map((interp, iIdx) => (
                        <li key={iIdx} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                          <span>{interp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Source Citations */}
            {turn.citations.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cited Journal Sources ({turn.citations.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {turn.citations.map((citation, cIdx) => {
                    const isExpanded = expandedCitationId === `${turn.id}_${cIdx}`;
                    return (
                      <div
                        key={cIdx}
                        id={`citation-${turn.id}-${cIdx}`}
                        className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {citation.type === 'memory' ? (
                              <Brain className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {citation.titleOrCategory}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleCitation(`${turn.id}_${cIdx}`)}
                            className="text-slate-500 hover:text-slate-300 text-xs p-0.5 cursor-pointer"
                            title="Toggle citation quote"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p
                          className={`text-xs text-slate-400 mt-1.5 italic ${
                            isExpanded ? 'line-clamp-none' : 'line-clamp-2'
                          }`}
                        >
                          "{citation.excerpt}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.article>
        ))}
      </div>
    </div>
  );
};

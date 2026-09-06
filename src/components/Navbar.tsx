import React from 'react';
import { UserProfile } from '../types';
import { LogOut, Plus, History, Sparkles, ShieldCheck, User, Brain, MessageSquareQuote } from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
  onSignOut: () => Promise<void>;
  onNewEntry: () => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  onOpenSynthesis: () => void;
  onOpenThreatModel: () => void;
  historyCount: number;
  memoriesCount: number;
  onOpenMemories: () => void;
  activeView: 'workspace' | 'ask_journal';
  onToggleAskJournal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onNewEntry,
  showHistory,
  onToggleHistory,
  onOpenSynthesis,
  onOpenThreatModel,
  historyCount,
  memoriesCount,
  onOpenMemories,
  activeView,
  onToggleAskJournal,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Stats */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={onNewEntry}
            className="flex items-center space-x-2.5 text-left group focus:outline-hidden cursor-pointer"
            title="Start new reflection"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-cyan-950/50 group-hover:from-cyan-400 group-hover:to-blue-500 transition-all">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold text-slate-100 leading-tight">ReflectAI</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  Gemini 3.6
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Private Journal & Reflection</p>
            </div>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* New Entry Button */}
          <button
            id="btn-new-reflection"
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-md shadow-cyan-950/50 border border-cyan-400/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Entry</span>
            <span className="sm:hidden">New</span>
          </button>

          {/* History Sidebar Toggle */}
          <button
            id="btn-toggle-history"
            onClick={onToggleHistory}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-all cursor-pointer ${
              showHistory
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-950/50'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden md:inline">Entries</span>
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              {historyCount}
            </span>
          </button>

          {/* Personal Memories Toggle */}
          <button
            id="btn-open-memories"
            onClick={onOpenMemories}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700 hover:text-cyan-300 transition-all cursor-pointer"
            title="Personal Memories - enduring values, habits, and goals"
          >
            <Brain className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">Memories</span>
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-800 text-cyan-300 font-semibold border border-slate-700">
              {memoriesCount}
            </span>
          </button>

          {/* Ask My Journal Toggle */}
          <button
            id="btn-nav-ask-journal"
            onClick={onToggleAskJournal}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-all cursor-pointer ${
              activeView === 'ask_journal'
                ? 'bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-950/50'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700 hover:text-cyan-300'
            }`}
            title="Ask My Journal - Grounded natural-language inquiry"
          >
            <MessageSquareQuote className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">Ask Journal</span>
          </button>

          {/* Synthesize All Modal */}
          {historyCount > 0 && (
            <button
              id="btn-open-synthesis"
              onClick={onOpenSynthesis}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-lg transition-all cursor-pointer shadow-xs"
              title="Synthesize patterns across all journal reflections"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="hidden lg:inline">Synthesize Trends</span>
            </button>
          )}

          {/* Threat Model & Security Directive Inspector */}
          <button
            id="btn-threat-model"
            onClick={onOpenThreatModel}
            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg border border-transparent hover:border-slate-800 transition-colors cursor-pointer"
            title="View Security & Threat Model Architecture"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </button>

          {/* User Profile & Sign Out */}
          <div className="flex items-center pl-2 border-l border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full object-cover border border-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center text-xs font-bold">
                  <User className="w-4 h-4" />
                </div>
              )}
              <span className="text-xs font-medium text-slate-300 max-w-[100px] truncate hidden md:inline">
                {user.displayName || user.email?.split('@')[0]}
              </span>
            </div>

            <button
              id="btn-signout"
              onClick={onSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};


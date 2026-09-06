import React from 'react';
import { UserProfile, AppNavTab } from '../types';
import {
  LogOut,
  Plus,
  History,
  Sparkles,
  ShieldCheck,
  User,
  Brain,
  MessageSquareQuote,
  Database,
  RefreshCw,
  TrendingUp,
  BookOpen,
} from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
  activeTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
  onSignOut: () => Promise<void>;
  onNewEntry: () => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  onOpenSynthesis: () => void;
  historyCount: number;
  memoriesCount: number;
  onRunDiagnostic?: () => void;
  isDiagnosing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onSignOut,
  onNewEntry,
  showHistory,
  onToggleHistory,
  onOpenSynthesis,
  historyCount,
  memoriesCount,
  onRunDiagnostic,
  isDiagnosing,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-20 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onSelectTab('journal')}
            className="flex items-center space-x-2.5 text-left group focus:outline-hidden cursor-pointer"
            title="ReflectAI - Your private AI thinking space"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-cyan-950/50 group-hover:from-cyan-400 group-hover:to-blue-500 transition-all">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold text-slate-100 leading-tight">ReflectAI</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-sm bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 hidden sm:inline">
                  3.6 Flash
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden md:block">Private AI Thinking Space</p>
            </div>
          </button>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            id="nav-tab-journal"
            onClick={() => onSelectTab('journal')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'journal'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Workspace</span>
          </button>

          <button
            id="nav-tab-memories"
            onClick={() => onSelectTab('memories')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'memories'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-blue-400" />
            <span>Memories</span>
            {memoriesCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/80 text-cyan-300 font-semibold">
                {memoriesCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-ask"
            onClick={() => onSelectTab('ask_journal')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'ask_journal'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <MessageSquareQuote className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ask Journal</span>
          </button>

          <button
            id="nav-tab-what-changed"
            onClick={() => onSelectTab('what_changed')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'what_changed'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
            <span>What Changed?</span>
          </button>

          <button
            id="nav-tab-security"
            onClick={() => onSelectTab('security')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-900/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Security Center</span>
          </button>
        </nav>

        {/* Action Controls & User */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* New Entry Button */}
          <button
            id="btn-new-reflection"
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-md shadow-cyan-950/50 border border-cyan-400/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Entry</span>
          </button>

          {/* History Sidebar Toggle */}
          <button
            id="btn-toggle-history"
            onClick={onToggleHistory}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-all cursor-pointer ${
              showHistory
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-sm'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
            }`}
            title="View journal history"
          >
            <History className="w-4 h-4" />
            <span className="hidden md:inline">Entries</span>
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              {historyCount}
            </span>
          </button>

          {/* Mobile Tab Dropdown or Compact Bar */}
          <div className="lg:hidden flex items-center gap-1">
            <button
              onClick={() => onSelectTab('memories')}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                activeTab === 'memories'
                  ? 'bg-slate-800 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Personal Memories"
            >
              <Brain className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectTab('ask_journal')}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                activeTab === 'ask_journal'
                  ? 'bg-slate-800 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Ask My Journal"
            >
              <MessageSquareQuote className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectTab('what_changed')}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                activeTab === 'what_changed'
                  ? 'bg-slate-800 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="What Changed?"
            >
              <TrendingUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectTab('security')}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Security Center"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* Firestore Status / Diagnostic Button */}
          {onRunDiagnostic && (
            <button
              id="btn-firestore-diagnostic"
              onClick={onRunDiagnostic}
              disabled={isDiagnosing}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg border bg-slate-900/80 border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Test Cloud Firestore persistence round-trip"
            >
              {isDiagnosing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Database className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden xl:inline">DB</span>
            </button>
          )}

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
              <span className="text-xs font-medium text-slate-300 max-w-[90px] truncate hidden md:inline">
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

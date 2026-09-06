import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, JournalInteraction, AuthErrorInfo, UserMemory, MemoryCategory, AppNavTab } from './types';
import {
  subscribeToAuth,
  loginWithGoogle,
  loginAsGuest,
  logoutUser,
  saveJournalInteraction,
  subscribeToUserInteractions,
  deleteJournalInteraction,
  subscribeToUserMemories,
  saveUserMemory,
  updateUserMemory,
  deleteUserMemory,
  verifyFirestorePersistence,
} from './lib/firebase';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { JournalWorkspace } from './components/JournalWorkspace';
import { HistorySidebar } from './components/HistorySidebar';
import { SynthesisModal } from './components/SynthesisModal';
import { ThreatModelModal } from './components/ThreatModelModal';
import { PersonalMemoriesModal } from './components/PersonalMemoriesModal';
import { MemoriesView } from './components/MemoriesView';
import { AskMyJournal } from './components/AskMyJournal';
import { WhatChanged } from './components/WhatChanged';
import { SecurityCenter } from './components/SecurityCenter';
import { generateId } from './lib/sanitizer';
import { AlertTriangle, CheckCircle2, Database, ExternalLink, X, RefreshCw } from 'lucide-react';

function createNewEntry(userId: string): JournalInteraction {
  return {
    id: generateId('reflection'),
    userId,
    title: 'Untitled Reflection',
    tags: ['mindfulness'],
    mode: 'reflect',
    messages: [],
    mood: 'thoughtful',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);
  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [activeInteraction, setActiveInteraction] = useState<JournalInteraction | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [showThreatModel, setShowThreatModel] = useState(false);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [showMemoriesModal, setShowMemoriesModal] = useState(false);
  const [activeTab, setActiveTab] = useState<AppNavTab>('journal');

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [saveError, setSaveError] = useState<string | undefined>(undefined);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    errorCode?: string;
    details?: Record<string, any>;
  } | null>(null);

  // Subscribe to Auth State
  useEffect(() => {
    const unsubscribe = subscribeToAuth((authUser) => {
      setUser(authUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore user interaction & memories subscription
  useEffect(() => {
    if (!user) {
      setInteractions([]);
      setActiveInteraction(null);
      setMemories([]);
      setFirestoreError(null);
      return;
    }

    const unsubInteractions = subscribeToUserInteractions(
      user.uid,
      (data) => {
        setInteractions(data);
        // Clear previous listener error on successful read
        setFirestoreError(null);

        // If no active interaction yet, or active interaction was deleted, select or create
        setActiveInteraction((prev) => {
          if (!prev) {
            return data.length > 0 ? data[0] : createNewEntry(user.uid);
          }
          // If current active exists in new list, update it
          const matched = data.find((d) => d.id === prev.id);
          return matched || prev;
        });
      },
      (err) => {
        console.error('Firestore interactions listener failed:', err);
        const code = err?.code || 'error';
        const msg = err?.message || 'Database read error';
        setFirestoreError(
          `Cloud Firestore Read Notice (${code}): ${msg}. Ensure rules in firestore.rules are deployed in Firebase Console.`
        );
      }
    );

    const unsubMemories = subscribeToUserMemories(
      user.uid,
      (data) => {
        setMemories(data);
      },
      (err) => {
        console.error('Firestore memories listener failed:', err);
      }
    );

    return () => {
      unsubInteractions();
      unsubMemories();
    };
  }, [user?.uid]);

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      setIsAuthLoading(true);
      const profile = await loginWithGoogle();
      setUser(profile);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      const errMessage = err?.message || 'Failed to authenticate with Google.';
      const code: 'popup-blocked' | 'unauthorized-domain' | 'configuration-not-found' | 'generic' = 
        err?.authCode || (
          errMessage.toLowerCase().includes('popup') || errMessage.toLowerCase().includes('blocked')
            ? 'popup-blocked'
            : errMessage.toLowerCase().includes('domain')
            ? 'unauthorized-domain'
            : errMessage.toLowerCase().includes('configuration')
            ? 'configuration-not-found'
            : 'generic'
        );
      setAuthError({
        code,
        message: errMessage,
        domain: err?.domain || (typeof window !== 'undefined' ? window.location.hostname : undefined),
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGuestSignIn = () => {
    setAuthError(null);
    const guest = loginAsGuest();
    setUser(guest);
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setUser(null);
      setActiveInteraction(null);
      setInteractions([]);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const handleNewEntry = () => {
    if (!user) return;
    const newEntry = createNewEntry(user.uid);
    setActiveInteraction(newEntry);
    setActiveTab('journal');
    setSaveStatus('idle');
  };

  const handleSaveInteraction = useCallback(
    async (interactionToSave: JournalInteraction): Promise<boolean> => {
      if (!user) return false;
      setSaveStatus('saving');
      setSaveError(undefined);

      try {
        const result = await saveJournalInteraction(user.uid, interactionToSave);
        if (result.success) {
          setSaveStatus('saved');
          return true;
        } else {
          setSaveStatus('error');
          setSaveError(result.error);
          return false;
        }
      } catch (err: any) {
        setSaveStatus('error');
        setSaveError(err?.message || 'Database write error');
        return false;
      }
    },
    [user?.uid]
  );

  const handleDeleteInteraction = async (id: string) => {
    if (!user) return;
    try {
      await deleteJournalInteraction(user.uid, id);
      if (activeInteraction?.id === id) {
        const remaining = interactions.filter((i) => i.id !== id);
        setActiveInteraction(remaining.length > 0 ? remaining[0] : createNewEntry(user.uid));
      }
    } catch (err) {
      console.error('Delete interaction error:', err);
    }
  };

  const handleRetrySave = () => {
    if (activeInteraction) {
      handleSaveInteraction(activeInteraction);
    }
  };

  const handleSaveMemory = async (memory: UserMemory) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    const res = await saveUserMemory(user.uid, memory);
    if (res.success) {
      setMemories((prev) => [memory, ...prev.filter((m) => m.id !== memory.id)]);
    }
    return res;
  };

  const handleUpdateMemory = async (
    memoryId: string,
    updates: { text?: string; category?: MemoryCategory }
  ) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    const res = await updateUserMemory(user.uid, memoryId, updates);
    if (res.success) {
      setMemories((prev) =>
        prev.map((m) =>
          m.id === memoryId ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
        )
      );
    }
    return res;
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    const res = await deleteUserMemory(user.uid, memoryId);
    if (res.success) {
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    }
    return res;
  };

  const handleRunDiagnostic = async () => {
    if (!user) return;
    setIsDiagnosing(true);
    setDiagnosticResult(null);
    try {
      const res = await verifyFirestorePersistence(user.uid);
      setDiagnosticResult(res);
    } catch (err: any) {
      setDiagnosticResult({
        success: false,
        message: err?.message || 'Failed to execute Firestore connectivity test.',
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 animate-pulse mx-auto shadow-lg shadow-cyan-950/50" />
          <p className="font-serif text-sm font-medium text-slate-400">Initializing ReflectAI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingPage
        onSignIn={handleSignIn}
        onGuestSignIn={handleGuestSignIn}
        isLoading={isAuthLoading}
        authError={authError}
        onDismissError={() => setAuthError(null)}
      />
    );
  }

  const currentWorkspaceEntry = activeInteraction || createNewEntry(user.uid);
  const isGuestMode = user.isAnonymous || user.uid.startsWith('local_guest_');

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSignOut={handleSignOut}
        onNewEntry={handleNewEntry}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onOpenSynthesis={() => setShowSynthesis(true)}
        historyCount={interactions.length}
        memoriesCount={memories.length}
        onRunDiagnostic={handleRunDiagnostic}
        isDiagnosing={isDiagnosing}
      />

      {/* Guest Mode Informational Banner */}
      {isGuestMode && (
        <div className="bg-amber-950/60 border-b border-amber-800/60 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Guest Preview Mode:</strong> You are browsing locally. To persist documents to Cloud Firestore, sign in with your Google account.
            </span>
          </div>
          <button
            onClick={handleSignIn}
            className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md shadow-xs transition-colors cursor-pointer"
          >
            Sign In with Google
          </button>
        </div>
      )}

      {/* Cloud Firestore Read / Permission Error Banner */}
      {firestoreError && (
        <div className="bg-rose-950/70 border-b border-rose-800/70 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 text-rose-200">
          <div className="flex items-start gap-2 max-w-4xl">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-300">Cloud Firestore Notice: </span>
              <span className="leading-relaxed">{firestoreError}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunDiagnostic}
              disabled={isDiagnosing}
              className="px-2.5 py-1 text-xs font-medium bg-rose-900/80 hover:bg-rose-800 text-rose-100 rounded-md border border-rose-700/60 transition-colors cursor-pointer"
            >
              Run Diagnostic
            </button>
            <button
              onClick={() => setFirestoreError(null)}
              className="p-1 text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
              title="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Diagnostic Probe Result Banner */}
      {diagnosticResult && (
        <div
          className={`border-b px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 ${
            diagnosticResult.success
              ? 'bg-emerald-950/70 border-emerald-800/70 text-emerald-200'
              : 'bg-rose-950/80 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-2 max-w-4xl">
            {diagnosticResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold">
                {diagnosticResult.success
                  ? 'Firestore Verified: '
                  : 'Firestore Diagnostic Alert: '}
              </span>
              <span>{diagnosticResult.message}</span>
              {diagnosticResult.details && (
                <span className="ml-2 font-mono text-[11px] opacity-80">
                  (Project: {diagnosticResult.details.projectId})
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setDiagnosticResult(null)}
            className="p-1 hover:opacity-80 transition-opacity cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'ask_journal' && (
          <div className="flex-1 overflow-y-auto">
            <AskMyJournal
              user={user}
              interactions={interactions}
              memories={memories}
              onSelectInteraction={(interaction) => {
                setActiveInteraction(interaction);
                setActiveTab('journal');
              }}
              onSelectMemory={() => {
                setActiveTab('memories');
              }}
              onNavigateToWorkspace={() => {
                handleNewEntry();
              }}
            />
          </div>
        )}

        {activeTab === 'memories' && (
          <div className="flex-1 overflow-y-auto">
            <MemoriesView
              user={user}
              memories={memories}
              interactions={interactions}
              onSaveMemory={handleSaveMemory}
              onUpdateMemory={handleUpdateMemory}
              onDeleteMemory={handleDeleteMemory}
              onNavigateToWorkspace={() => setActiveTab('journal')}
            />
          </div>
        )}

        {activeTab === 'what_changed' && (
          <div className="flex-1 overflow-y-auto">
            <WhatChanged
              user={user}
              interactions={interactions}
              memories={memories}
              onOpenEntry={(id) => {
                const found = interactions.find((i) => i.id === id);
                if (found) {
                  setActiveInteraction(found);
                  setActiveTab('journal');
                }
              }}
              onSelectThoughtStarter={(prompt) => {
                if (!user) return;
                const newEntry = createNewEntry(user.uid);
                newEntry.messages = [
                  {
                    id: generateId('msg'),
                    role: 'user',
                    content: prompt,
                    timestamp: new Date().toISOString(),
                  },
                ];
                newEntry.title = prompt.length > 40 ? `${prompt.slice(0, 37)}...` : prompt;
                setActiveInteraction(newEntry);
                setActiveTab('journal');
              }}
            />
          </div>
        )}

        {activeTab === 'security' && (
          <div className="flex-1 overflow-y-auto">
            <SecurityCenter user={user} />
          </div>
        )}

        {activeTab === 'journal' && (
          <JournalWorkspace
            key={currentWorkspaceEntry.id}
            user={user}
            activeInteraction={currentWorkspaceEntry}
            onSaveInteraction={handleSaveInteraction}
            onDeleteInteraction={handleDeleteInteraction}
            saveStatus={saveStatus}
            saveError={saveError}
            onRetrySave={handleRetrySave}
            onOpenMemoriesModal={() => setActiveTab('memories')}
            onMemorySaved={(newMemory) =>
              setMemories((prev) => [newMemory, ...prev.filter((m) => m.id !== newMemory.id)])
            }
          />
        )}

        {/* History Sidebar */}
        <HistorySidebar
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          interactions={interactions}
          activeId={currentWorkspaceEntry.id}
          onSelectInteraction={(item) => {
            setActiveInteraction(item);
            setActiveTab('journal');
          }}
          onDeleteInteraction={handleDeleteInteraction}
        />
      </main>

      {/* Personal Memories Modal */}
      <PersonalMemoriesModal
        user={user}
        isOpen={showMemoriesModal}
        onClose={() => setShowMemoriesModal(false)}
        memories={memories}
        onSaveMemory={handleSaveMemory}
        onUpdateMemory={handleUpdateMemory}
        onDeleteMemory={handleDeleteMemory}
      />

      {/* Holistic Trends Synthesis Modal */}
      <SynthesisModal
        isOpen={showSynthesis}
        onClose={() => setShowSynthesis(false)}
        interactions={interactions}
      />

      {/* Threat Model Modal */}
      <ThreatModelModal
        isOpen={showThreatModel}
        onClose={() => setShowThreatModel(false)}
      />
    </div>
  );
}

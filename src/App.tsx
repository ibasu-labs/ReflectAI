import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, JournalInteraction, AuthErrorInfo, UserMemory, MemoryCategory } from './types';
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
} from './lib/firebase';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { JournalWorkspace } from './components/JournalWorkspace';
import { HistorySidebar } from './components/HistorySidebar';
import { SynthesisModal } from './components/SynthesisModal';
import { ThreatModelModal } from './components/ThreatModelModal';
import { PersonalMemoriesModal } from './components/PersonalMemoriesModal';
import { AskMyJournal } from './components/AskMyJournal';
import { generateId } from './lib/sanitizer';

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
  const [activeView, setActiveView] = useState<'workspace' | 'ask_journal'>('workspace');

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

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
      return;
    }

    const unsubInteractions = subscribeToUserInteractions(user.uid, (data) => {
      setInteractions(data);

      // If no active interaction yet, or active interaction was deleted, select or create
      setActiveInteraction((prev) => {
        if (!prev) {
          return data.length > 0 ? data[0] : createNewEntry(user.uid);
        }
        // If current active exists in new list, update it
        const matched = data.find((d) => d.id === prev.id);
        return matched || prev;
      });
    });

    const unsubMemories = subscribeToUserMemories(user.uid, (data) => {
      setMemories(data);
    });

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
    setActiveView('workspace');
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

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navigation */}
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        onNewEntry={handleNewEntry}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
        onOpenSynthesis={() => setShowSynthesis(true)}
        onOpenThreatModel={() => setShowThreatModel(true)}
        historyCount={interactions.length}
        memoriesCount={memories.length}
        onOpenMemories={() => setShowMemoriesModal(true)}
        activeView={activeView}
        onToggleAskJournal={() =>
          setActiveView((prev) => (prev === 'ask_journal' ? 'workspace' : 'ask_journal'))
        }
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeView === 'ask_journal' ? (
          <div className="flex-1 overflow-y-auto">
            <AskMyJournal
              user={user}
              interactions={interactions}
              memories={memories}
              onSelectInteraction={(interaction) => {
                setActiveInteraction(interaction);
                setActiveView('workspace');
              }}
              onSelectMemory={() => {
                setShowMemoriesModal(true);
              }}
              onNavigateToWorkspace={() => {
                setActiveView('workspace');
                handleNewEntry();
              }}
            />
          </div>
        ) : (
          <JournalWorkspace
            key={currentWorkspaceEntry.id}
            user={user}
            activeInteraction={currentWorkspaceEntry}
            onSaveInteraction={handleSaveInteraction}
            onDeleteInteraction={handleDeleteInteraction}
            saveStatus={saveStatus}
            saveError={saveError}
            onRetrySave={handleRetrySave}
            onOpenMemoriesModal={() => setShowMemoriesModal(true)}
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
            setActiveView('workspace');
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

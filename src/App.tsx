import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, JournalInteraction } from './types';
import {
  subscribeToAuth,
  loginWithGoogle,
  logoutUser,
  saveJournalInteraction,
  subscribeToUserInteractions,
  deleteJournalInteraction,
} from './lib/firebase';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { JournalWorkspace } from './components/JournalWorkspace';
import { HistorySidebar } from './components/HistorySidebar';
import { SynthesisModal } from './components/SynthesisModal';
import { ThreatModelModal } from './components/ThreatModelModal';
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
  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [activeInteraction, setActiveInteraction] = useState<JournalInteraction | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [showThreatModel, setShowThreatModel] = useState(false);

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

  // Real-time Firestore user interaction subscription
  useEffect(() => {
    if (!user) {
      setInteractions([]);
      setActiveInteraction(null);
      return;
    }

    const unsub = subscribeToUserInteractions(user.uid, (data) => {
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

    return () => unsub();
  }, [user?.uid]);

  const handleSignIn = async () => {
    try {
      setIsAuthLoading(true);
      const profile = await loginWithGoogle();
      setUser(profile);
    } catch (err: any) {
      console.error('Sign-in error:', err);
    } finally {
      setIsAuthLoading(false);
    }
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
    return <LandingPage onSignIn={handleSignIn} isLoading={isAuthLoading} />;
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
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative">
        <JournalWorkspace
          key={currentWorkspaceEntry.id}
          user={user}
          activeInteraction={currentWorkspaceEntry}
          onSaveInteraction={handleSaveInteraction}
          onDeleteInteraction={handleDeleteInteraction}
          saveStatus={saveStatus}
          saveError={saveError}
          onRetrySave={handleRetrySave}
        />

        {/* History Sidebar */}
        <HistorySidebar
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          interactions={interactions}
          activeId={currentWorkspaceEntry.id}
          onSelectInteraction={(item) => setActiveInteraction(item)}
          onDeleteInteraction={handleDeleteInteraction}
        />
      </main>

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

import React, { useState, useEffect, useRef } from 'react';
import {
  JournalInteraction,
  Message,
  ReflectionMode,
  UserProfile,
  GeminiConverseResponse,
} from '../types';
import {
  Sparkles,
  Send,
  Save,
  Check,
  RefreshCw,
  Tag,
  Smile,
  ListTodo,
  Lightbulb,
  BookOpen,
  Compass,
  AlertCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { generateId } from '../lib/sanitizer';

interface JournalWorkspaceProps {
  user: UserProfile;
  activeInteraction: JournalInteraction;
  onSaveInteraction: (interaction: JournalInteraction) => Promise<boolean>;
  onDeleteInteraction?: (id: string) => Promise<void>;
  saveStatus: 'saved' | 'saving' | 'error' | 'idle';
  saveError?: string;
  onRetrySave: () => void;
}

const MODES: { id: ReflectionMode; label: string; icon: any; desc: string; color: string }[] = [
  {
    id: 'reflect',
    label: 'Reflect',
    icon: Compass,
    desc: 'Deep inquiry, self-awareness, and cognitive clarity',
    color: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    icon: Lightbulb,
    desc: 'Generate creative angles, options, and new perspectives',
    color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: BookOpen,
    desc: 'Synthesize thoughts into concise takeaways and key lessons',
    color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50',
  },
  {
    id: 'action_plan',
    label: 'Action Plan',
    icon: ListTodo,
    desc: 'Transform thoughts into SMART steps and accountability',
    color: 'bg-purple-950/80 text-purple-300 border-purple-500/50',
  },
  {
    id: 'gratitude',
    label: 'Gratitude',
    icon: Smile,
    desc: 'Mindful appreciation and constructive reframing',
    color: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
  },
];

const MOODS = [
  { id: 'thoughtful', label: 'Thoughtful', emoji: '🤔' },
  { id: 'calm', label: 'Calm', emoji: '🌿' },
  { id: 'energized', label: 'Energized', emoji: '⚡' },
  { id: 'challenging', label: 'Challenging', emoji: '🌧️' },
  { id: 'grateful', label: 'Grateful', emoji: '🙏' },
] as const;

const THOUGHT_STARTERS: Record<ReflectionMode, string[]> = {
  reflect: [
    'What was the most surprising moment of today, and what did it reveal to me?',
    'What emotion or thought have I been brushing aside lately?',
    'What assumption am I making about a current situation that might not be true?',
  ],
  brainstorm: [
    'What are 5 unconventional ways I could approach my current challenge?',
    'If fear or failure were impossible, what bold step would I take this week?',
    'How could I simplify this problem down to its most basic 20% that produces 80% result?',
  ],
  summarize: [
    'Here are my scattered thoughts from earlier today: [Type your raw notes]',
    'Can you synthesize the key lessons from my past week into 3 actionable rules?',
    'Please extract the main conflict and resolution from this reflection.',
  ],
  action_plan: [
    'What is the next single 15-minute action I can take to make real progress?',
    'Turn my overarching goal into 3 concrete SMART milestone checkpoints.',
    'What potential roadblocks should I anticipate and prepare countermeasures for?',
  ],
  gratitude: [
    'Who is someone who supported me recently, and how can I express genuine appreciation?',
    'What is an ordinary everyday comfort that I often overlook?',
    'What difficult experience taught me a valuable lesson that I am thankful for today?',
  ],
};

export const JournalWorkspace: React.FC<JournalWorkspaceProps> = ({
  user,
  activeInteraction,
  onSaveInteraction,
  onDeleteInteraction,
  saveStatus,
  saveError,
  onRetrySave,
}) => {
  const [currentEntry, setCurrentEntry] = useState<JournalInteraction>(activeInteraction);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state when parent active interaction changes
  useEffect(() => {
    setCurrentEntry(activeInteraction);
    setGenerationError(null);
  }, [activeInteraction.id]);

  // Scroll to bottom of message list on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentEntry.messages, isGenerating]);

  // Auto-save debounced when fields update
  const handleUpdateEntry = (updated: Partial<JournalInteraction>) => {
    const next: JournalInteraction = {
      ...currentEntry,
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    setCurrentEntry(next);
    onSaveInteraction(next);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputPrompt).trim();
    if (!promptToSend || isGenerating) return;

    setInputPrompt('');
    setGenerationError(null);

    const userMessage: Message = {
      id: generateId('msg'),
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toISOString(),
      mode: currentEntry.mode,
    };

    const updatedMessages = [...currentEntry.messages, userMessage];

    // Optimistically update entry with user message
    const nextEntry: JournalInteraction = {
      ...currentEntry,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };
    setCurrentEntry(nextEntry);
    await onSaveInteraction(nextEntry);

    setIsGenerating(true);

    try {
      const response = await fetch('/api/gemini/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactionId: currentEntry.id,
          mode: currentEntry.mode,
          title: currentEntry.title !== 'Untitled Reflection' ? currentEntry.title : undefined,
          userPrompt: promptToSend,
          messages: currentEntry.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userContext: {
            mood: currentEntry.mood,
            category: currentEntry.category,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const data: GeminiConverseResponse = await response.json();
      setLastModelUsed(data.modelUsed);

      const assistantMessage: Message = {
        id: generateId('msg'),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        mode: currentEntry.mode,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      const mergedInsights = Array.from(
        new Set([...(currentEntry.keyInsights || []), ...(data.keyInsights || [])])
      );
      const mergedActions = Array.from(
        new Set([...(currentEntry.actionItems || []), ...(data.actionItems || [])])
      );

      const finalEntry: JournalInteraction = {
        ...nextEntry,
        title:
          currentEntry.title === 'Untitled Reflection' && data.suggestedTitle
            ? data.suggestedTitle
            : currentEntry.title,
        messages: finalMessages,
        keyInsights: mergedInsights.length > 0 ? mergedInsights : undefined,
        actionItems: mergedActions.length > 0 ? mergedActions : undefined,
        updatedAt: new Date().toISOString(),
      };

      setCurrentEntry(finalEntry);
      await onSaveInteraction(finalEntry);
    } catch (err: any) {
      console.error('Gemini converse failure:', err);
      setGenerationError(err?.message || 'Failed to converse with Gemini. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (tag && !currentEntry.tags.includes(tag)) {
      handleUpdateEntry({ tags: [...currentEntry.tags, tag] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleUpdateEntry({
      tags: currentEntry.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleToggleActionItem = (idx: number) => {
    if (!currentEntry.actionItems) return;
    const itemText = currentEntry.actionItems[idx];
    const isCompleted = itemText.startsWith('[x] ') || itemText.startsWith('DONE: ');
    const updated = [...currentEntry.actionItems];
    if (isCompleted) {
      updated[idx] = itemText.replace(/^(\[x\]\s*|DONE:\s*)/, '');
    } else {
      updated[idx] = `[x] ${itemText}`;
    }
    handleUpdateEntry({ actionItems: updated });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#020617] text-slate-200 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Header Card: Title, Mood, Mode, and Save Status */}
        <div className="bg-slate-900/60 rounded-2xl p-5 sm:p-6 border border-slate-800/80 shadow-lg backdrop-blur-xs space-y-4">
          {/* Title and Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              id="input-entry-title"
              type="text"
              value={currentEntry.title}
              onChange={(e) => handleUpdateEntry({ title: e.target.value })}
              placeholder="Title your reflection..."
              className="font-serif text-2xl sm:text-3xl font-bold text-slate-100 placeholder-slate-500 focus:outline-hidden border-b border-transparent hover:border-slate-700 focus:border-cyan-500 py-1 transition-colors w-full bg-transparent"
            />

            {/* Save Status & Persistence Feedback */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-medium px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800/60 shadow-xs">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  <span>Saving to Firestore...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-medium px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 shadow-xs">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Saved in User Storage</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <button
                  onClick={onRetrySave}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 font-medium px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 transition-colors cursor-pointer"
                  title={saveError || 'Retry Save'}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Retry Save</span>
                </button>
              )}
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Reflection Framework Mode
            </label>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                const isSelected = currentEntry.mode === m.id;
                return (
                  <button
                    key={m.id}
                    id={`btn-mode-${m.id}`}
                    onClick={() => handleUpdateEntry({ mode: m.id })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? `${m.color} shadow-md scale-102`
                        : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    title={m.desc}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood & Tags */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
            {/* Mood selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Emotional Tone:</span>
              <div className="flex items-center gap-1">
                {MOODS.map((mood) => (
                  <button
                    key={mood.id}
                    id={`btn-mood-${mood.id}`}
                    onClick={() => handleUpdateEntry({ mood: mood.id as any })}
                    className={`px-2 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                      currentEntry.mood === mood.id
                        ? 'bg-cyan-950/80 border-cyan-500/50 font-semibold text-cyan-300 shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <span className="mr-1">{mood.emoji}</span>
                    <span>{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentEntry.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                >
                  #{t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-400 text-slate-400 font-bold ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center">
                <input
                  type="text"
                  placeholder="+ tag"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="text-xs px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-full w-16 focus:w-24 focus:outline-hidden focus:border-cyan-500 text-slate-200 placeholder-slate-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Key Insights & Action Items Callouts if Extracted */}
        {((currentEntry.keyInsights && currentEntry.keyInsights.length > 0) ||
          (currentEntry.actionItems && currentEntry.actionItems.length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentEntry.keyInsights && currentEntry.keyInsights.length > 0 && (
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 space-y-2 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Key Insights Extracted</span>
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                  {currentEntry.keyInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentEntry.actionItems && currentEntry.actionItems.length > 0 && (
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/50 space-y-2 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-300">
                  <ListTodo className="w-3.5 h-3.5 text-purple-400" />
                  <span>Action Items & Commitments</span>
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                  {currentEntry.actionItems.map((item, idx) => {
                    const isDone = item.startsWith('[x] ') || item.startsWith('DONE: ');
                    const cleanText = item.replace(/^(\[x\]\s*|DONE:\s*)/, '');
                    return (
                      <li
                        key={idx}
                        onClick={() => handleToggleActionItem(idx)}
                        className={`flex items-start gap-2 cursor-pointer hover:bg-purple-900/30 p-1 rounded-sm transition-colors ${
                          isDone ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => {}}
                          className="mt-0.5 rounded-sm text-purple-500 focus:ring-purple-400 bg-slate-900 border-slate-700 cursor-pointer"
                        />
                        <span>{cleanText}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Thought Starters / Prompting Cards (Shown when conversation is young) */}
        {currentEntry.messages.length <= 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Thought Starters for {currentEntry.mode.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {THOUGHT_STARTERS[currentEntry.mode].map((starter, idx) => (
                <button
                  key={idx}
                  id={`btn-starter-${idx}`}
                  onClick={() => handleSendMessage(starter)}
                  className="p-3 text-left rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/90 text-xs text-slate-300 hover:text-white transition-all shadow-xs group cursor-pointer"
                >
                  <p className="line-clamp-3 leading-relaxed">{starter}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Message Stream */}
        <div className="space-y-4">
          {currentEntry.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-5 py-4 text-sm sm:text-base leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs shadow-md shadow-cyan-950/40 border border-cyan-400/20'
                    : 'bg-slate-900/80 text-slate-200 border border-slate-800 rounded-bl-xs shadow-md backdrop-blur-xs font-serif'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert max-w-none text-slate-200 font-sans leading-relaxed text-sm sm:text-base">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                )}

                <div
                  className={`mt-2 flex items-center gap-2 text-[10px] ${
                    msg.role === 'user' ? 'text-cyan-100 justify-end' : 'text-slate-400'
                  }`}
                >
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {msg.role === 'assistant' && lastModelUsed && (
                    <span className="px-1.5 py-0.2 rounded-sm bg-slate-950 text-cyan-400 border border-slate-800">
                      {lastModelUsed}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isGenerating && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 max-w-md shadow-md animate-pulse">
              <div className="w-6 h-6 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400 border border-cyan-800/50">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Gemini 3.6 Flash is analyzing your reflections...
              </p>
            </div>
          )}

          {/* Generation Error Banner with Retry */}
          {generationError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-200 text-xs sm:text-sm flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-300">AI Interaction Notice</p>
                  <p className="text-rose-200/90">{generationError}</p>
                </div>
              </div>
              <button
                onClick={() => handleSendMessage()}
                className="px-3 py-1 bg-rose-900 border border-rose-700 rounded-lg text-white hover:bg-rose-800 font-medium transition-colors shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Card */}
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 shadow-xl backdrop-blur-md sticky bottom-4 z-10 space-y-2">
          <div className="relative">
            <textarea
              id="input-reflection-prompt"
              rows={3}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Write your thoughts, questions, or journal entry here for Gemini ${currentEntry.mode.toUpperCase()} reflection... (Press Ctrl+Enter or Cmd+Enter to send)`}
              className="w-full text-sm sm:text-base p-3 pr-14 rounded-xl bg-slate-950 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-slate-100 placeholder-slate-500 resize-none transition-all"
            />
            <button
              id="btn-send-prompt"
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isGenerating}
              className="absolute right-3 bottom-3 p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-40 disabled:hover:from-cyan-600 disabled:hover:to-blue-600 transition-all shadow-md shadow-cyan-950/50 cursor-pointer border border-cyan-400/20"
              title="Send to Gemini (Ctrl+Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>
              Mode: <strong className="text-cyan-300 uppercase">{currentEntry.mode}</strong> • Stored under isolated user ID
            </span>
            <span className="hidden sm:inline">Press Cmd + Enter to submit</span>
          </div>
        </div>
      </div>
    </div>
  );
};

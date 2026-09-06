import React, { useState, useMemo } from 'react';
import { UserProfile, UserMemory, MemoryCategory, JournalInteraction } from '../types';
import { generateId } from '../lib/sanitizer';
import { getAuthToken } from '../lib/firebase';
import {
  Brain,
  Plus,
  Search,
  Trash2,
  Edit3,
  Check,
  Sparkles,
  Shield,
  Clock,
  AlertCircle,
  Loader2,
  Filter,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface MemoriesViewProps {
  user: UserProfile;
  memories: UserMemory[];
  interactions: JournalInteraction[];
  onSaveMemory: (memory: UserMemory) => Promise<{ success: boolean; error?: string }>;
  onUpdateMemory: (
    memoryId: string,
    updates: { text?: string; category?: MemoryCategory }
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteMemory: (memoryId: string) => Promise<{ success: boolean; error?: string }>;
  onNavigateToWorkspace?: () => void;
}

const CATEGORY_META: Record<
  MemoryCategory,
  { label: string; color: string; badge: string }
> = {
  core_value: {
    label: 'Core Value',
    color: 'border-amber-500/40 text-amber-300 bg-amber-950/40',
    badge: 'Core Value',
  },
  goal: {
    label: 'Goal',
    color: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40',
    badge: 'Goal',
  },
  habit: {
    label: 'Habit',
    color: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40',
    badge: 'Habit',
  },
  preference: {
    label: 'Preference',
    color: 'border-purple-500/40 text-purple-300 bg-purple-950/40',
    badge: 'Preference',
  },
  relationship: {
    label: 'Relationship',
    color: 'border-rose-500/40 text-rose-300 bg-rose-950/40',
    badge: 'Relationship',
  },
  milestone: {
    label: 'Milestone',
    color: 'border-blue-500/40 text-blue-300 bg-blue-950/40',
    badge: 'Milestone',
  },
  insight: {
    label: 'Insight',
    color: 'border-indigo-500/40 text-indigo-300 bg-indigo-950/40',
    badge: 'Insight',
  },
};

export const MemoriesView: React.FC<MemoriesViewProps> = ({
  user,
  memories,
  interactions,
  onSaveMemory,
  onUpdateMemory,
  onDeleteMemory,
  onNavigateToWorkspace,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | MemoryCategory>('all');
  const [activeProvenance, setActiveProvenance] = useState<'all' | 'explicitly_stated' | 'ai_inferred'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('insight');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('insight');
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter memories
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchCat = activeCategory === 'all' || m.category === activeCategory;
      const matchProv = activeProvenance === 'all' || m.provenance === activeProvenance;
      const matchSearch =
        !searchQuery.trim() ||
        m.text.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchProv && matchSearch;
    });
  }, [memories, activeCategory, activeProvenance, searchQuery]);

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmed = newText.trim();
    if (!trimmed) {
      setFormError('Please enter memory text.');
      return;
    }
    if (trimmed.length > 1000) {
      setFormError('Memory text cannot exceed 1,000 characters.');
      return;
    }

    setIsSaving(true);
    const newMemory: UserMemory = {
      id: generateId('mem'),
      text: trimmed,
      category: newCategory,
      sourceRef: { origin: 'direct_input' },
      confidence: 1.0,
      provenance: 'explicitly_stated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await onSaveMemory(newMemory);
    setIsSaving(false);
    if (res.success) {
      setNewText('');
      setIsAddingNew(false);
    } else {
      setFormError(res.error || 'Failed to save memory.');
    }
  };

  const handleStartEdit = (memory: UserMemory) => {
    setEditingId(memory.id);
    setEditText(memory.text);
    setEditCategory(memory.category);
    setEditError(null);
    setDeleteConfirmId(null);
  };

  const handleSaveEdit = async (memoryId: string) => {
    setEditError(null);
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditError('Please enter memory text.');
      return;
    }
    if (trimmed.length > 1000) {
      setEditError('Memory text cannot exceed 1,000 characters.');
      return;
    }

    setIsUpdatingId(memoryId);
    try {
      const res = await onUpdateMemory(memoryId, {
        text: trimmed,
        category: editCategory,
      });
      if (res && !res.success) {
        setEditError(res.error || 'Failed to update memory.');
      } else {
        setEditingId(null);
      }
    } catch (err: any) {
      setEditError(err?.message || 'Failed to save updates.');
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleDelete = async (memoryId: string) => {
    await onDeleteMemory(memoryId);
    setDeleteConfirmId(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-950/50">
              <Brain className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-100">Personal Memories</h1>
            <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              {memories.length} Recorded
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Enduring personal convictions, goals, habits, and key milestones that help Gemini Vault learn how your thinking evolves.
          </p>
        </div>

        <button
          id="btn-add-memory-view"
          onClick={() => {
            setIsAddingNew(!isAddingNew);
            setFormError(null);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-950/50 border border-cyan-400/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isAddingNew ? 'Close Form' : 'Record New Memory'}</span>
        </button>
      </div>

      {/* Security & Isolation Callout */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Strict single-user ownership. Persisted directly under <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">/users/{user.uid ? `${user.uid.slice(0, 6)}...` : 'uid'}/memories</code>.
          </span>
        </div>
        <span className="text-slate-500">Capped at 1,000 characters per entry</span>
      </div>

      {/* Add Memory Form Accordion */}
      {isAddingNew && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-cyan-800/60 shadow-xl shadow-black/40 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Record a Personal Memory</span>
            </h3>
            <span className="text-xs text-slate-500">Zero prompt injection risk (OWASP LLM01)</span>
          </div>

          <form onSubmit={handleCreateMemory} className="space-y-4">
            <div>
              <textarea
                rows={3}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="State an enduring value, personal goal, habit, or significant decision..."
                maxLength={1000}
                className="w-full px-4 py-3 text-sm bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 resize-none"
              />
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                <span>Stored strictly as raw data; cannot override system prompts</span>
                <span className={newText.length > 900 ? 'text-amber-400 font-semibold' : ''}>
                  {newText.length} / 1000 characters
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 font-medium">Category:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                  className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-cyan-500"
                >
                  {(Object.keys(CATEGORY_META) as MemoryCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_META[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newText.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save to Firestore'}
                </button>
              </div>
            </div>

            {formError && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {formError}
              </p>
            )}
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search personal memories..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveProvenance('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeProvenance === 'all'
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            All Provenance
          </button>
          <button
            onClick={() => setActiveProvenance('explicitly_stated')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeProvenance === 'explicitly_stated'
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Explicit
          </button>
          <button
            onClick={() => setActiveProvenance('ai_inferred')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeProvenance === 'ai_inferred'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-500 hover:text-cyan-300'
            }`}
          >
            AI-Inferred
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-cyan-500 text-white font-semibold'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          All ({memories.length})
        </button>
        {(Object.keys(CATEGORY_META) as MemoryCategory[]).map((cat) => {
          const count = memories.filter((m) => m.category === cat).length;
          const isSelected = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-slate-200 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {CATEGORY_META[cat].label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Memories Grid */}
      {filteredMemories.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-slate-900/30 rounded-2xl border border-slate-800/80">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto">
            <Brain className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-300">
              {searchQuery ? 'No matching memories found' : 'No personal memories recorded yet'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try broadening your search query or reset category filters.'
                : 'Capture core values, goals, and reflections to give Gemini Vault persistent context across your thinking sessions.'}
            </p>
          </div>
          {!searchQuery && !isAddingNew && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Memory</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMemories.map((memory) => {
            const meta = CATEGORY_META[memory.category] || CATEGORY_META.insight;
            const isEditing = editingId === memory.id;
            const isConfirmingDelete = deleteConfirmId === memory.id;

            return (
              <div
                key={memory.id}
                id={`memory-card-${memory.id}`}
                className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between group shadow-md shadow-black/20"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                      {memory.provenance === 'ai_inferred' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>AI-Inferred ({Math.round((memory.confidence || 0.8) * 100)}%)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
                          Explicit
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {!isEditing && (
                        <>
                          <button
                            id={`btn-edit-memory-${memory.id}`}
                            onClick={() => handleStartEdit(memory)}
                            className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            title="Edit Memory"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-lg">
                              <span className="text-[11px] text-rose-300">Delete?</span>
                              <button
                                id={`btn-confirm-delete-${memory.id}`}
                                onClick={() => handleDelete(memory.id)}
                                className="text-[11px] font-bold text-rose-400 hover:text-rose-200 underline cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer ml-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              id={`btn-delete-memory-${memory.id}`}
                              onClick={() => setDeleteConfirmId(memory.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                              title="Delete Memory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  {isEditing ? (
                    <div className="space-y-3 pt-1">
                      <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        maxLength={1000}
                        className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:border-cyan-500 resize-none"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                          className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs"
                        >
                          {(Object.keys(CATEGORY_META) as MemoryCategory[]).map((cat) => (
                            <option key={cat} value={cat}>
                              {CATEGORY_META[cat].label}
                            </option>
                          ))}
                        </select>
                        <span>{editText.length} / 1000</span>
                      </div>
                      {editError && (
                        <p className="text-xs text-rose-400">{editError}</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          id={`btn-save-edit-${memory.id}`}
                          onClick={() => handleSaveEdit(memory.id)}
                          disabled={isUpdatingId === memory.id}
                          className="px-3 py-1 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded"
                        >
                          {isUpdatingId === memory.id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-200 leading-relaxed font-sans select-text">
                      {memory.text}
                    </p>
                  )}
                </div>

                {/* Footer metadata */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(memory.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {memory.sourceRef?.origin === 'journal_entry' && (
                    <span className="text-slate-500">Source: Journal Entry</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

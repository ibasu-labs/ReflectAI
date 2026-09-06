import React, { useState, useMemo } from 'react';
import { UserMemory, MemoryCategory, UserProfile } from '../types';
import {
  Brain,
  X,
  Plus,
  Search,
  Trash2,
  Edit3,
  Check,
  Sparkles,
  Tag,
  AlertCircle,
  Clock,
  Shield,
  Loader2,
} from 'lucide-react';
import { generateId } from '../lib/sanitizer';

interface PersonalMemoriesModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  memories: UserMemory[];
  onSaveMemory: (memory: UserMemory) => Promise<{ success: boolean; error?: string }>;
  onUpdateMemory: (
    memoryId: string,
    updates: { text?: string; category?: MemoryCategory }
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteMemory: (memoryId: string) => Promise<{ success: boolean; error?: string }>;
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

export const PersonalMemoriesModal: React.FC<PersonalMemoriesModalProps> = ({
  user,
  isOpen,
  onClose,
  memories,
  onSaveMemory,
  onUpdateMemory,
  onDeleteMemory,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | MemoryCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('insight');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit State
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('insight');
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesCategory = activeTab === 'all' || m.category === activeTab;
      const matchesSearch =
        !searchQuery.trim() ||
        m.text.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [memories, activeTab, searchQuery]);

  if (!isOpen) return null;

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmed = newText.trim();
    if (!trimmed) {
      setFormError('Please enter the memory text.');
      return;
    }
    if (trimmed.length > 1000) {
      setFormError('Memory text cannot exceed 1000 characters.');
      return;
    }

    setIsSaving(true);
    const newMemory: UserMemory = {
      id: generateId('mem'),
      text: trimmed,
      category: newCategory,
      sourceRef: {
        origin: 'direct_input',
      },
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
    setEditingMemoryId(memory.id);
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
      setEditError('Memory text cannot exceed 1000 characters.');
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
        setEditingMemoryId(null);
      }
    } catch (err: any) {
      console.error('Error updating memory:', err);
      setEditError(err?.message || 'Failed to save changes.');
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleDelete = async (memoryId: string) => {
    await onDeleteMemory(memoryId);
    setDeleteConfirmId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/50">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-slate-100">Personal Memories</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                  {memories.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Enduring personal values, goals, habits, and insights owned strictly by you.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isAddingNew && (
              <button
                id="btn-add-memory-top"
                onClick={() => {
                  setIsAddingNew(true);
                  setFormError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/60 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Memory</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security & Isolation Notice Banner */}
        <div className="px-6 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Owner-isolated at <code className="text-slate-300">/users/{user.uid ? `${user.uid.slice(0, 6)}...` : 'uid'}/memories</code>. No prompt excerpts stored.
            </span>
          </div>
          <span className="text-slate-500">Strict 1,000 char limit</span>
        </div>

        {/* Search & Category Filter Tabs */}
        <div className="px-6 py-3 border-b border-slate-800/80 space-y-3 bg-slate-900/40">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-memories"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your memories..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-cyan-500 text-white shadow-xs'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                All ({memories.length})
              </button>
              {(Object.keys(CATEGORY_META) as MemoryCategory[]).map((cat) => {
                const count = memories.filter((m) => m.category === cat).length;
                const isSelected = activeTab === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-200 text-slate-950 font-semibold'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {CATEGORY_META[cat].label}
                    {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Add Memory Form Accordion */}
        {isAddingNew && (
          <div className="p-5 border-b border-slate-800 bg-slate-950/90 animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyan-400" />
                Record New Personal Memory
              </h3>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-3">
              <div>
                <textarea
                  id="input-memory-text"
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Record an enduring belief, core value, recurring goal, or relationship reflection..."
                  maxLength={1000}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 transition-colors resize-none"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>Treats all input as pure data (OWASP LLM01 compliance)</span>
                  <span className={newText.length > 900 ? 'text-amber-400 font-semibold' : ''}>
                    {newText.length} / 1000 characters
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 font-medium">Category:</label>
                  <select
                    id="select-memory-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                    className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-hidden focus:border-cyan-500"
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
                    id="btn-submit-memory"
                    type="submit"
                    disabled={isSaving || !newText.trim()}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : 'Save Memory'}
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

        {/* Memory List Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredMemories.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto">
                <Brain className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-300">
                  {searchQuery ? 'No matching memories found' : 'No personal memories recorded yet'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try searching for different keywords or select a different category filter.'
                    : 'Personal memories capture your enduring values, habits, and insights. You can add one manually or extract one with AI from any reflection.'}
                </p>
              </div>
              {!searchQuery && !isAddingNew && (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/60 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Memory</span>
                </button>
              )}
            </div>
          ) : (
            filteredMemories.map((memory) => {
              const meta = CATEGORY_META[memory.category] || CATEGORY_META.insight;
              const isEditing = editingMemoryId === memory.id;
              const isConfirmingDelete = deleteConfirmId === memory.id;

              return (
                <div
                  key={memory.id}
                  id={`memory-card-${memory.id}`}
                  className="bg-slate-950/60 rounded-xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3 group"
                >
                  {/* Card Header: Category & Provenance */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                      {memory.provenance === 'ai_inferred' ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/50 text-cyan-300 border border-cyan-800/50"
                          title="Inferred by Gemini via Cloud Run backend"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>AI-Inferred ({Math.round((memory.confidence || 0.8) * 100)}%)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
                          Explicitly Stated
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
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
                            <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded-lg">
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

                  {/* Body Content */}
                  {isEditing ? (
                    <div className="space-y-3 pt-1">
                      <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        maxLength={1000}
                        className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:border-cyan-500 resize-none"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <label>Category:</label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                            className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs"
                          >
                            {(Object.keys(CATEGORY_META) as MemoryCategory[]).map((cat) => (
                              <option key={cat} value={cat}>
                                {CATEGORY_META[cat].label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className={editText.length > 900 ? 'text-amber-400 font-semibold' : ''}>
                          {editText.length} / 1000
                        </span>
                      </div>
                      {editError && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/50 border border-rose-900/60 p-2 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{editError}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMemoryId(null);
                            setEditError(null);
                          }}
                          disabled={isUpdatingId === memory.id}
                          className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          id={`btn-save-edit-${memory.id}`}
                          onClick={() => handleSaveEdit(memory.id)}
                          disabled={isUpdatingId === memory.id}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md cursor-pointer transition-colors"
                        >
                          {isUpdatingId === memory.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans select-text">
                      {memory.text}
                    </p>
                  )}

                  {/* Card Footer: Metadata */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        Recorded {new Date(memory.createdAt).toLocaleDateString(undefined, {
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
            })
          )}
        </div>
      </div>
    </div>
  );
};

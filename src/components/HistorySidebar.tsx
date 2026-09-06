import React, { useState, useMemo } from 'react';
import { JournalInteraction, ReflectionMode } from '../types';
import {
  Search,
  Calendar,
  Sparkles,
  Trash2,
  Download,
  Filter,
  X,
  Compass,
  Lightbulb,
  BookOpen,
  ListTodo,
  Smile,
  ChevronRight,
} from 'lucide-react';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  interactions: JournalInteraction[];
  activeId?: string;
  onSelectInteraction: (interaction: JournalInteraction) => void;
  onDeleteInteraction: (id: string) => Promise<void>;
}

const MODE_ICONS: Record<ReflectionMode, any> = {
  reflect: Compass,
  brainstorm: Lightbulb,
  summarize: BookOpen,
  action_plan: ListTodo,
  gratitude: Smile,
};

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  interactions,
  activeId,
  onSelectInteraction,
  onDeleteInteraction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMode = selectedMode === 'all' || item.mode === selectedMode;

      return matchesSearch && matchesMode;
    });
  }, [interactions, searchQuery, selectedMode]);

  const handleExportMarkdown = (item: JournalInteraction, e: React.MouseEvent) => {
    e.stopPropagation();
    let md = `# ${item.title}\n\n`;
    md += `**Date:** ${new Date(item.createdAt).toLocaleString()}\n`;
    md += `**Mode:** ${item.mode.toUpperCase()}\n`;
    if (item.mood) md += `**Mood:** ${item.mood}\n`;
    if (item.tags && item.tags.length > 0) md += `**Tags:** ${item.tags.join(', ')}\n`;
    md += `\n---\n\n## Dialogue & Reflection\n\n`;

    item.messages.forEach((m) => {
      md += `### ${m.role === 'user' ? 'Author' : 'Gemini AI'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n`;
    });

    if (item.keyInsights && item.keyInsights.length > 0) {
      md += `## Key Insights\n\n`;
      item.keyInsights.forEach((ins) => (md += `- ${ins}\n`));
      md += `\n`;
    }

    if (item.actionItems && item.actionItems.length > 0) {
      md += `## Action Items\n\n`;
      item.actionItems.forEach((act) => (md += `- [ ] ${act}\n`));
      md += `\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.title.replace(/[^a-z0-9_-]/gi, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-full sm:w-96 bg-slate-950/95 border-l border-slate-800/90 shadow-2xl backdrop-blur-md flex flex-col transition-all">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <h2 className="font-serif text-lg font-bold text-slate-100">Reflection History</h2>
        </div>
        <button
          id="btn-close-history"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-900/40">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            id="input-search-history"
            type="text"
            placeholder="Search reflections, insights, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500 text-slate-200 placeholder-slate-500"
          />
        </div>

        {/* Mode filter chips */}
        <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
          {['all', 'reflect', 'brainstorm', 'summarize', 'action_plan', 'gratitude'].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMode(m)}
              className={`px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap border text-[11px] transition-all cursor-pointer ${
                selectedMode === m
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/30 font-medium shadow-xs'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {m === 'action_plan' ? 'Actions' : m}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-800/50">
        {filteredInteractions.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-sm font-medium text-slate-400">No reflections found</p>
            <p className="text-xs text-slate-500">
              {searchQuery ? 'Try clearing search filters' : 'Start a new reflection entry to begin'}
            </p>
          </div>
        ) : (
          filteredInteractions.map((item) => {
            const Icon = MODE_ICONS[item.mode] || Compass;
            const isSelected = item.id === activeId;
            const snippet = item.messages.find((m) => m.role === 'user')?.content || 'No prompt content yet...';

            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectInteraction(item);
                  if (window.innerWidth < 640) onClose();
                }}
                className={`pt-3 first:pt-0 group rounded-xl p-3 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                    : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <h3 className="font-serif text-sm font-semibold text-slate-100 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => handleExportMarkdown(item, e)}
                      title="Download Markdown"
                      className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(item.id);
                      }}
                      title="Delete Entry"
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {snippet}
                </p>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <div className="flex items-center gap-2">
                    {item.keyInsights && item.keyInsights.length > 0 && (
                      <span className="text-cyan-400 font-medium">
                        {item.keyInsights.length} insights
                      </span>
                    )}
                    {item.mood && <span className="capitalize text-slate-400">{item.mood}</span>}
                  </div>
                </div>

                {/* Delete confirmation inline */}
                {confirmDeleteId === item.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 p-2.5 bg-rose-950/80 border border-rose-800/80 rounded-lg text-xs space-y-2"
                  >
                    <p className="text-rose-300 font-medium">Permanently delete this reflection?</p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          await onDeleteInteraction(item.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-0.5 rounded bg-rose-600 text-white hover:bg-rose-500 text-xs font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

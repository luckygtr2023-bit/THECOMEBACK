import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, type Mistake } from '../database/db';
import { Plus, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react';

const MISTAKE_TYPES: Mistake['mistakeType'][] = ['conceptual', 'calculation', 'reading', 'silly', 'time-management'];
const MISTAKE_LABELS: Record<Mistake['mistakeType'], string> = {
  'conceptual': '🧠 Conceptual',
  'calculation': '🔢 Calculation',
  'reading': '📖 Reading Error',
  'silly': '😅 Silly Mistake',
  'time-management': '⏰ Time Management',
};

export function Mistakes() {
  const chapters = useLiveQuery(() => db.chapters.filter(c => !c.archived && c.enabled).toArray(), [], []);
  const mistakes = useLiveQuery(() => db.mistakes.orderBy('createdAt').reverse().toArray(), [], []);
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<Mistake | null>(null);
  const [form, setForm] = useState({
    questionOrTopic: '',
    mistakeType: 'conceptual' as Mistake['mistakeType'],
    whyItHappened: '',
    correctConcept: '',
    nextAction: '',
    chapterId: '',
    status: 'open' as Mistake['status'],
  });

  const resetForm = () => setForm({
    questionOrTopic: '', mistakeType: 'conceptual', whyItHappened: '',
    correctConcept: '', nextAction: '', chapterId: '', status: 'open',
  });

  const filteredMistakes = mistakes.filter(m => {
    if (filterType !== 'all' && m.mistakeType !== filterType) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    if (searchQuery && !m.questionOrTopic.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !m.correctConcept.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.questionOrTopic.trim()) return;
    if (editing) {
      await db.mistakes.update(editing.id, { ...form, chapterId: form.chapterId || undefined });
      setEditing(null);
    } else {
      const mistake: Mistake = {
        id: generateId(),
        ...form,
        chapterId: form.chapterId || undefined,
        createdAt: new Date().toISOString(),
      };
      await db.mistakes.add(mistake);
    }
    resetForm();
    setShowAdd(false);
  };

  const handleStatusChange = async (mistake: Mistake, newStatus: Mistake['status']) => {
    await db.mistakes.update(mistake.id, {
      status: newStatus,
      resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this mistake entry?')) {
      await db.mistakes.delete(id);
    }
  };

  const handleEdit = (mistake: Mistake) => {
    setForm({
      questionOrTopic: mistake.questionOrTopic,
      mistakeType: mistake.mistakeType,
      whyItHappened: mistake.whyItHappened,
      correctConcept: mistake.correctConcept,
      nextAction: mistake.nextAction,
      chapterId: mistake.chapterId || '',
      status: mistake.status,
    });
    setEditing(mistake);
    setShowAdd(true);
  };

  const openCount = mistakes.filter(m => m.status === 'open').length;
  const resolvedCount = mistakes.filter(m => m.status === 'resolved').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mistake Notebook</h1>
          <p className="text-slate-400 mt-1 text-sm">Learn from your mistakes to avoid repeating them</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditing(null); setShowAdd(true); }}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Mistake</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-rose-400">{openCount}</p>
          <p className="text-xs text-slate-400">Open</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{mistakes.filter(m => m.status === 'reviewed').length}</p>
          <p className="text-xs text-slate-400">Reviewed</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{resolvedCount}</p>
          <p className="text-xs text-slate-400">Resolved</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search mistakes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Types</option>
          {MISTAKE_TYPES.map(t => <option key={t} value={t}>{MISTAKE_LABELS[t]}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="glass-card rounded-xl p-4 border border-indigo-500/30">
          <h3 className="font-semibold mb-3">{editing ? 'Edit Mistake' : 'New Mistake Entry'}</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Question or topic where mistake happened"
              value={form.questionOrTopic}
              onChange={e => setForm({ ...form, questionOrTopic: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.mistakeType}
                onChange={e => setForm({ ...form, mistakeType: e.target.value as Mistake['mistakeType'] })}
                className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
              >
                {MISTAKE_TYPES.map(t => <option key={t} value={t}>{MISTAKE_LABELS[t]}</option>)}
              </select>
              <select
                value={form.chapterId}
                onChange={e => setForm({ ...form, chapterId: e.target.value })}
                className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Link to chapter (optional)</option>
                {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <textarea
              placeholder="Why did this mistake happen?"
              value={form.whyItHappened}
              onChange={e => setForm({ ...form, whyItHappened: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none resize-y min-h-[60px]"
            />
            <textarea
              placeholder="What is the correct concept/approach?"
              value={form.correctConcept}
              onChange={e => setForm({ ...form, correctConcept: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none resize-y min-h-[60px]"
            />
            <input
              type="text"
              placeholder="Next action to prevent this"
              value={form.nextAction}
              onChange={e => setForm({ ...form, nextAction: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium">
                {editing ? 'Update' : 'Save'}
              </button>
              <button onClick={() => { setShowAdd(false); setEditing(null); resetForm(); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mistake List */}
      <div className="space-y-2">
        {filteredMistakes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">{mistakes.length === 0 ? 'No mistakes recorded yet' : 'No mistakes match your filters'}</p>
          </div>
        ) : (
          filteredMistakes.map(mistake => (
            <div key={mistake.id} className={`glass-card rounded-xl p-4 group ${
              mistake.status === 'resolved' ? 'opacity-60' : ''
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                      {MISTAKE_LABELS[mistake.mistakeType]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      mistake.status === 'open' ? 'bg-rose-900/30 text-rose-300' :
                      mistake.status === 'reviewed' ? 'bg-amber-900/30 text-amber-300' :
                      'bg-emerald-900/30 text-emerald-300'
                    }`}>
                      {mistake.status}
                    </span>
                  </div>
                  <p className="font-medium mt-2 text-sm">{mistake.questionOrTopic}</p>
                  {mistake.whyItHappened && (
                    <p className="text-xs text-slate-400 mt-1">💡 {mistake.whyItHappened}</p>
                  )}
                  {mistake.correctConcept && (
                    <p className="text-xs text-emerald-400/80 mt-1">✅ {mistake.correctConcept}</p>
                  )}
                  {mistake.nextAction && (
                    <p className="text-xs text-indigo-400/80 mt-1">→ {mistake.nextAction}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {mistake.status === 'open' && (
                    <button onClick={() => handleStatusChange(mistake, 'reviewed')} className="p-1.5 rounded hover:bg-slate-700" title="Mark as reviewed">
                      <CheckCircle2 size={14} className="text-amber-400" />
                    </button>
                  )}
                  {mistake.status !== 'resolved' && (
                    <button onClick={() => handleStatusChange(mistake, 'resolved')} className="p-1.5 rounded hover:bg-slate-700" title="Mark as resolved">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    </button>
                  )}
                  <button onClick={() => handleEdit(mistake)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 text-xs">✏️</button>
                  <button onClick={() => handleDelete(mistake.id)} className="p-1.5 rounded hover:bg-slate-700 text-slate-500 text-xs">🗑️</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, formatDate, type TestRecord } from '../database/db';
import { Plus, TrendingUp, TrendingDown, Minus, Trash2, Edit2 } from 'lucide-react';

export function Tests() {
  const subjects = useLiveQuery(() => db.subjects.filter(s => s.enabled).toArray(), [], []);
  const chapters = useLiveQuery(() => db.chapters.filter(c => !c.archived && c.enabled).toArray(), [], []);
  const testRecords = useLiveQuery(() => db.testRecords.orderBy('date').reverse().toArray(), [], []);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<TestRecord | null>(null);
  const [form, setForm] = useState({
    name: '',
    subjectId: '',
    chapterIds: [] as string[],
    date: new Date().toISOString().split('T')[0],
    maxMarks: 100,
    obtainedMarks: 0,
    durationMinutes: 0,
    notes: '',
  });

  const resetForm = () => setForm({
    name: '', subjectId: '', chapterIds: [], date: new Date().toISOString().split('T')[0],
    maxMarks: 100, obtainedMarks: 0, durationMinutes: 0, notes: '',
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.subjectId || form.maxMarks <= 0) return;
    if (form.obtainedMarks < 0 || form.obtainedMarks > form.maxMarks) {
      alert('Obtained marks must be between 0 and max marks');
      return;
    }

    if (editing) {
      await db.testRecords.update(editing.id, { ...form });
      setEditing(null);
    } else {
      const record: TestRecord = {
        id: generateId(),
        ...form,
        createdAt: new Date().toISOString(),
      };
      await db.testRecords.add(record);
    }
    resetForm();
    setShowAdd(false);
  };

  const handleEdit = (record: TestRecord) => {
    setForm({
      name: record.name,
      subjectId: record.subjectId,
      chapterIds: record.chapterIds,
      date: record.date,
      maxMarks: record.maxMarks,
      obtainedMarks: record.obtainedMarks,
      durationMinutes: record.durationMinutes || 0,
      notes: record.notes || '',
    });
    setEditing(record);
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this test record?')) {
      await db.testRecords.delete(id);
    }
  };

  const subjectChapters = form.subjectId ? chapters.filter(c => c.subjectId === form.subjectId) : [];

  const avgScore = testRecords.length > 0
    ? Math.round(testRecords.reduce((sum, t) => sum + (t.obtainedMarks / t.maxMarks) * 100, 0) / testRecords.length)
    : 0;

  const getTrend = () => {
    if (testRecords.length < 2) return 'stable';
    const recent = testRecords.slice(0, 3);
    const older = testRecords.slice(3, 6);
    if (older.length === 0) return 'stable';
    const recentAvg = recent.reduce((s, t) => s + (t.obtainedMarks / t.maxMarks) * 100, 0) / recent.length;
    const olderAvg = older.reduce((s, t) => s + (t.obtainedMarks / t.maxMarks) * 100, 0) / older.length;
    if (recentAvg > olderAvg + 5) return 'up';
    if (recentAvg < olderAvg - 5) return 'down';
    return 'stable';
  };

  const trend = getTrend();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tests & Results</h1>
          <p className="text-slate-400 mt-1 text-sm">Track your test performance over time</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditing(null); setShowAdd(true); }}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Test</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-indigo-400">{testRecords.length}</p>
          <p className="text-xs text-slate-400">Tests Taken</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className={`text-2xl font-bold ${avgScore >= 80 ? 'text-emerald-400' : avgScore >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
            {avgScore}%
          </p>
          <p className="text-xs text-slate-400">Average Score</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {trend === 'up' && <TrendingUp size={20} className="text-emerald-400" />}
            {trend === 'down' && <TrendingDown size={20} className="text-rose-400" />}
            {trend === 'stable' && <Minus size={20} className="text-slate-400" />}
          </div>
          <p className="text-xs text-slate-400">Trend</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="glass-card rounded-xl p-4 border border-indigo-500/30">
          <h3 className="font-semibold mb-3">{editing ? 'Edit Test' : 'New Test Record'}</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Test name (e.g., Unit Test 1)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.subjectId}
                onChange={e => setForm({ ...form, subjectId: e.target.value, chapterIds: [] })}
                className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {subjectChapters.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {subjectChapters.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      const ids = form.chapterIds.includes(c.id)
                        ? form.chapterIds.filter(id => id !== c.id)
                        : [...form.chapterIds, c.id];
                      setForm({ ...form, chapterIds: ids });
                    }}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      form.chapterIds.includes(c.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400">Max Marks</label>
                <input
                  type="number"
                  value={form.maxMarks}
                  onChange={e => setForm({ ...form, maxMarks: Number(e.target.value) })}
                  min={1}
                  className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Obtained</label>
                <input
                  type="number"
                  value={form.obtainedMarks}
                  onChange={e => setForm({ ...form, obtainedMarks: Number(e.target.value) })}
                  min={0}
                  max={form.maxMarks}
                  className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Duration (min)</label>
                <input
                  type="number"
                  value={form.durationMinutes}
                  onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                  min={0}
                  className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none mt-1"
                />
              </div>
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none resize-y min-h-[60px]"
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

      {/* Test Records */}
      <div className="space-y-2">
        {testRecords.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">No test records yet</p>
            <p className="text-xs mt-1">Add your first test result above</p>
          </div>
        ) : (
          testRecords.map(record => {
            const percentage = Math.round((record.obtainedMarks / record.maxMarks) * 100);
            const subject = subjects.find(s => s.id === record.subjectId);
            return (
              <div key={record.id} className="glass-card rounded-xl p-4 group">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{record.name}</p>
                      {subject && <span className="text-xs text-slate-500">{subject.icon} {subject.name}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{formatDate(record.date)}</span>
                      {(record.durationMinutes ?? 0) > 0 && <span className="text-xs text-slate-500">{record.durationMinutes} min</span>}
                    </div>
                  </div>
                  <div className="text-right mr-3">
                    <p className={`text-lg font-bold ${
                      percentage >= 80 ? 'text-emerald-400' :
                      percentage >= 60 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {percentage}%
                    </p>
                    <p className="text-xs text-slate-500">{record.obtainedMarks}/{record.maxMarks}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(record)} className="p-1.5 rounded hover:bg-slate-700">
                      <Edit2 size={14} className="text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(record.id)} className="p-1.5 rounded hover:bg-slate-700">
                      <Trash2 size={14} className="text-slate-500" />
                    </button>
                  </div>
                </div>
                {record.notes && <p className="text-xs text-slate-500 mt-2">{record.notes}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

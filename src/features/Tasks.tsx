import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, getToday, formatDate, type Task } from '../database/db';
import { CheckCircle2, Circle, SkipForward, Calendar, Plus, Trash2 } from 'lucide-react';

export function Tasks() {
  const today = getToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Task['type']>('learning');
  const [newMinutes, setNewMinutes] = useState(30);
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const subjects = useLiveQuery(() => db.subjects.filter(s => s.enabled).toArray(), [], []);
  const chapters = useLiveQuery(() => db.chapters.filter(c => !c.archived && c.enabled).toArray(), [], []);
  const [newSubject, setNewSubject] = useState('');
  const [newChapter, setNewChapter] = useState('');

  const tasks = useLiveQuery(() => db.tasks.orderBy('date').reverse().toArray(), [], []);

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'overdue') return t.status === 'pending' && t.date < today;
    return true;
  });

  const tasksForDate = filteredTasks.filter(t => t.date === selectedDate);
  const overdueTasks = tasks.filter(t => t.status === 'pending' && t.date < today);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const task: Task = {
      id: generateId(),
      title: newTitle.trim(),
      type: newType,
      subjectId: newSubject || undefined,
      chapterId: newChapter || undefined,
      date: selectedDate,
      estimatedMinutes: newMinutes,
      priority: newPriority,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.tasks.add(task);
    setNewTitle('');
    setShowAdd(false);
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await db.tasks.update(task.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  const skipTask = async (task: Task) => {
    await db.tasks.update(task.id, { status: 'skipped' });
  };

  const rescheduleTask = async (task: Task) => {
    const newDate = prompt('Reschedule to (YYYY-MM-DD):', today);
    if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      await db.tasks.update(task.id, { date: newDate, rescheduledFrom: task.date });
    }
  };

  const deleteTask = async (taskId: string) => {
    if (confirm('Delete this task?')) {
      await db.tasks.delete(taskId);
    }
  };

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return '';
    const s = subjects.find(s => s.id === subjectId);
    return s ? `${s.icon} ${s.name}` : '';
  };

  const getChapterName = (chapterId?: string) => {
    if (!chapterId) return '';
    const c = chapters.find(c => c.id === chapterId);
    return c ? c.name : '';
  };

  const subjectChapters = newSubject ? chapters.filter(c => c.subjectId === newSubject) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Daily Tasks</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage your daily study tasks</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Task</span>
        </button>
      </div>

      {/* Overdue Banner */}
      {overdueTasks.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-300 font-medium text-sm mb-2">⚠️ {overdueTasks.length} overdue task(s)</p>
          <div className="space-y-1">
            {overdueTasks.slice(0, 3).map(task => (
              <div key={task.id} className="flex items-center justify-between text-xs">
                <span className="text-amber-200/70 truncate">{task.title}</span>
                <span className="text-amber-400/70">Due: {formatDate(task.date)}</span>
              </div>
            ))}
            {overdueTasks.length > 3 && (
              <p className="text-xs text-amber-400/50">+{overdueTasks.length - 3} more...</p>
            )}
          </div>
        </div>
      )}

      {/* Filters & Date */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex gap-1">
          {(['all', 'pending', 'completed', 'overdue'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Add Task */}
      {showAdd && (
        <div className="glass-card rounded-xl p-4 border border-indigo-500/30">
          <h3 className="font-semibold mb-3">New Task</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Task title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select value={newType} onChange={e => setNewType(e.target.value as Task['type'])} className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none">
                <option value="learning">Learning</option>
                <option value="practice">Practice</option>
                <option value="recall">Recall</option>
                <option value="revision">Revision</option>
                <option value="test">Test</option>
                <option value="review">Review</option>
              </select>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value as Task['priority'])} className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select value={newSubject} onChange={e => { setNewSubject(e.target.value); setNewChapter(''); }} className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none">
                <option value="">Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              <select value={newChapter} onChange={e => setNewChapter(e.target.value)} className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none" disabled={!newSubject}>
                <option value="">Chapter</option>
                {subjectChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Time (min):</label>
              <input type="number" value={newMinutes} onChange={e => setNewMinutes(Number(e.target.value))} min={5} max={180} className="w-20 px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none" />
              <div className="flex-1" />
              <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium">Add</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {filter === 'all' || filter === 'overdue' ? (
          tasksForDate.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Calendar size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tasks for {formatDate(selectedDate)}</p>
            </div>
          ) : (
            tasksForDate.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                subjectName={getSubjectName(task.subjectId)}
                chapterName={getChapterName(task.chapterId)}
                onToggle={() => toggleTask(task)}
                onSkip={() => skipTask(task)}
                onReschedule={() => rescheduleTask(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))
          )
        ) : (
          filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No {filter} tasks</p>
            </div>
          ) : (
            filteredTasks.slice(0, 20).map(task => (
              <TaskItem
                key={task.id}
                task={task}
                subjectName={getSubjectName(task.subjectId)}
                chapterName={getChapterName(task.chapterId)}
                onToggle={() => toggleTask(task)}
                onSkip={() => skipTask(task)}
                onReschedule={() => rescheduleTask(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))
          )
        )}
      </div>
    </div>
  );
}

function TaskItem({ task, subjectName, chapterName, onToggle, onSkip, onReschedule, onDelete }: {
  task: Task;
  subjectName: string;
  chapterName: string;
  onToggle: () => void;
  onSkip: () => void;
  onReschedule: () => void;
  onDelete: () => void;
}) {
  const typeColors: Record<string, string> = {
    learning: 'bg-blue-900/30 text-blue-300',
    practice: 'bg-amber-900/30 text-amber-300',
    recall: 'bg-purple-900/30 text-purple-300',
    revision: 'bg-cyan-900/30 text-cyan-300',
    test: 'bg-rose-900/30 text-rose-300',
    review: 'bg-slate-700 text-slate-300',
  };

  return (
    <div className={`glass-card rounded-xl p-3 flex items-center gap-3 group ${task.status === 'completed' ? 'opacity-60' : ''}`}>
      <button onClick={onToggle} className="flex-shrink-0">
        {task.status === 'completed' ? (
          <CheckCircle2 size={20} className="text-emerald-400" />
        ) : (
          <Circle size={20} className="text-slate-500 hover:text-indigo-400" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColors[task.type]}`}>{task.type}</span>
          {subjectName && <span className="text-[10px] text-slate-500">{subjectName}</span>}
          {chapterName && <span className="text-[10px] text-slate-600">• {chapterName}</span>}
          {task.date !== getToday() && <span className="text-[10px] text-slate-500">{formatDate(task.date)}</span>}
        </div>
      </div>
      <span className="text-xs text-slate-500">{task.estimatedMinutes}m</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.status === 'pending' && (
          <>
            <button onClick={onSkip} className="p-1.5 rounded hover:bg-slate-700" title="Skip">
              <SkipForward size={14} className="text-slate-400" />
            </button>
            <button onClick={onReschedule} className="p-1.5 rounded hover:bg-slate-700" title="Reschedule">
              <Calendar size={14} className="text-slate-400" />
            </button>
          </>
        )}
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-slate-700" title="Delete">
          <Trash2 size={14} className="text-slate-500" />
        </button>
      </div>
    </div>
  );
}

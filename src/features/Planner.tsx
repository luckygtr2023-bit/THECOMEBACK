import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, getWeekDates, formatDate, type Task } from '../database/db';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Planner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const subjects = useLiveQuery(() => db.subjects.filter(s => s.enabled).toArray(), [], []);
  const chapters = useLiveQuery(() => db.chapters.filter(c => !c.archived && c.enabled).toArray(), [], []);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<Task['type']>('learning');
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskChapter, setNewTaskChapter] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState(30);
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');

  const weekDates = useMemo(() => {
    const { start } = getWeekDates(currentDate);
    const startDate = new Date(start);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const weekStart = weekDates[0].toISOString().split('T')[0];
  const weekEnd = weekDates[6].toISOString().split('T')[0];

  const weekTasks = useLiveQuery(
    () => db.tasks.filter(t => t.date >= weekStart && t.date <= weekEnd).toArray(),
    [weekStart, weekEnd],
    []
  );

  const navigateWeek = (direction: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + direction * 7);
    setCurrentDate(d);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !selectedDay) return;
    const task: Task = {
      id: generateId(),
      title: newTaskTitle.trim(),
      type: newTaskType,
      subjectId: newTaskSubject || undefined,
      chapterId: newTaskChapter || undefined,
      date: selectedDay,
      estimatedMinutes: newTaskMinutes,
      priority: newTaskPriority,
      status: 'pending',
      weekId: `${weekStart}`,
      createdAt: new Date().toISOString(),
    };
    await db.tasks.add(task);
    setNewTaskTitle('');
    setShowAddTask(false);
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await db.tasks.update(task.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  const getTasksForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return weekTasks.filter(t => t.date === dateStr);
  };

  const isToday = (date: Date) => date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

  const subjectChapters = newTaskSubject
    ? chapters.filter(c => c.subjectId === newTaskSubject)
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Weekly Planner</h1>
          <p className="text-slate-400 mt-1 text-sm">Plan your study week. Respect your time and energy.</p>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="glass-card rounded-xl p-4 flex items-center justify-between">
        <button onClick={() => navigateWeek(-1)} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="font-semibold">
            {formatDate(weekStart)} — {formatDate(weekEnd)}
          </p>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs text-indigo-400 hover:text-indigo-300 mt-1"
          >
            Go to current week
          </button>
        </div>
        <button onClick={() => navigateWeek(1)} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {weekDates.map((date, idx) => {
          const dayTasks = getTasksForDay(date);
          const dateStr = date.toISOString().split('T')[0];
          const completedCount = dayTasks.filter(t => t.status === 'completed').length;
          const totalMinutes = dayTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

          return (
            <div
              key={dateStr}
              className={`glass-card rounded-xl p-3 ${isToday(date) ? 'ring-1 ring-indigo-500/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${isToday(date) ? 'text-indigo-300' : 'text-slate-300'}`}>
                  {DAYS[idx]}
                </span>
                <span className="text-xs text-slate-500">{date.getDate()}</span>
              </div>

              {/* Tasks for this day */}
              <div className="space-y-1 mb-2 max-h-[200px] overflow-y-auto">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-2">No tasks</p>
                ) : (
                  dayTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task)}
                      className={`w-full text-left p-1.5 rounded text-xs transition-colors ${
                        task.status === 'completed'
                          ? 'bg-emerald-900/20 text-emerald-400 line-through'
                          : 'bg-slate-700/30 hover:bg-slate-700/50 text-slate-300'
                      }`}
                    >
                      <span className="truncate block">{task.title}</span>
                      <span className="text-[10px] text-slate-500">{task.estimatedMinutes}m</span>
                    </button>
                  ))
                )}
              </div>

              {/* Day summary */}
              <div className="border-t border-slate-700/50 pt-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">{completedCount}/{dayTasks.length}</span>
                <span className="text-[10px] text-slate-500">{totalMinutes}m</span>
              </div>

              {/* Add task button */}
              <button
                onClick={() => { setShowAddTask(true); setSelectedDay(dateStr); }}
                className="w-full mt-2 p-1.5 rounded text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700/30 transition-colors"
              >
                <Plus size={12} className="inline" /> Add
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowAddTask(false)}>
          <div className="glass-card rounded-xl p-5 w-full max-w-md border border-indigo-500/30" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-4">Add Task — {formatDate(selectedDay)}</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Task title"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newTaskType}
                  onChange={e => setNewTaskType(e.target.value as Task['type'])}
                  className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="learning">Learning</option>
                  <option value="practice">Practice</option>
                  <option value="recall">Recall</option>
                  <option value="revision">Revision</option>
                  <option value="test">Test</option>
                  <option value="review">Review</option>
                </select>
                <select
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value as Task['priority'])}
                  className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newTaskSubject}
                  onChange={e => { setNewTaskSubject(e.target.value); setNewTaskChapter(''); }}
                  className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">No subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
                <select
                  value={newTaskChapter}
                  onChange={e => setNewTaskChapter(e.target.value)}
                  className="px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
                  disabled={!newTaskSubject}
                >
                  <option value="">No chapter</option>
                  {subjectChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Estimated time (minutes)</label>
                <input
                  type="number"
                  value={newTaskMinutes}
                  onChange={e => setNewTaskMinutes(Number(e.target.value))}
                  min={5}
                  max={180}
                  className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none mt-1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleAddTask} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium">
                  Add Task
                </button>
                <button onClick={() => setShowAddTask(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

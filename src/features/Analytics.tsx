import { useLiveQuery } from 'dexie-react-hooks';
import { db, calculateChapterProgress, getToday } from '../database/db';
import { BarChart3, BookOpen, CheckCircle2, Clock, Target, AlertTriangle } from 'lucide-react';

export function Analytics() {
  const today = getToday();
  const subjects = useLiveQuery(() => db.subjects.toArray(), [], []);
  const chapters = useLiveQuery(() => db.chapters.filter(c => !c.archived && c.enabled).toArray(), [], []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], []);
  const revisionItems = useLiveQuery(() => db.revisionItems.toArray(), [], []);
  const testRecords = useLiveQuery(() => db.testRecords.orderBy('date').toArray(), [], []);
  const mistakes = useLiveQuery(() => db.mistakes.toArray(), [], []);

  const enabledChapters = chapters.filter(c => c.enabled && !c.archived);
  const completedChapters = enabledChapters.filter(c => c.status === 'completed' || c.status === 'revised');
  const overallProgress = enabledChapters.length > 0 ? Math.round(completedChapters.length / enabledChapters.length * 100) : 0;

  // Task analytics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const overdueTasks = tasks.filter(t => t.status === 'pending' && t.date < today).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0;

  // Revision analytics
  const dueRevisions = revisionItems.filter(r => r.nextReviewDate <= today && r.status === 'pending').length;
  const totalRevisions = revisionItems.length;
  const completedRevisions = revisionItems.filter(r => r.status === 'done').length;

  // Test analytics
  const avgScore = testRecords.length > 0
    ? Math.round(testRecords.reduce((sum, t) => sum + (t.obtainedMarks / t.maxMarks) * 100, 0) / testRecords.length)
    : 0;
  const bestScore = testRecords.length > 0
    ? Math.round(Math.max(...testRecords.map(t => (t.obtainedMarks / t.maxMarks) * 100)))
    : 0;

  // Mistake analytics
  const openMistakes = mistakes.filter(m => m.status === 'open').length;
  const resolvedMistakes = mistakes.filter(m => m.status === 'resolved').length;

  // Subject-wise breakdown
  const subjectStats = subjects.map(subject => {
    const subjectChapters = enabledChapters.filter(c => c.subjectId === subject.id);
    const subjectCompleted = subjectChapters.filter(c => c.status === 'completed' || c.status === 'revised');
    const subjectTests = testRecords.filter(t => t.subjectId === subject.id);
    const avgTestScore = subjectTests.length > 0
      ? Math.round(subjectTests.reduce((s, t) => s + (t.obtainedMarks / t.maxMarks) * 100, 0) / subjectTests.length)
      : 0;
    return {
      subject,
      total: subjectChapters.length,
      completed: subjectCompleted.length,
      progress: subjectChapters.length > 0 ? Math.round(subjectCompleted.length / subjectChapters.length * 100) : 0,
      tests: subjectTests.length,
      avgScore: avgTestScore,
    };
  });

  // Chapters needing attention (low progress or revision due)
  const needsAttention = enabledChapters.filter(c => {
    const progress = calculateChapterProgress(c);
    return (c.status === 'learning' && progress < 30) || c.status === 'revision-due';
  });

  // Study time estimate (from completed tasks)
  const totalStudyMinutes = tasks
    .filter(t => t.status === 'completed' && t.actualMinutes)
    .reduce((sum, t) => sum + (t.actualMinutes || t.estimatedMinutes), 0);
  const estimatedStudyMinutes = tasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.estimatedMinutes, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
        <p className="text-slate-400 mt-1 text-sm">Your study progress and insights based on recorded data</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Target size={18} />} label="Syllabus Progress" value={`${overallProgress}%`} color="indigo" />
        <MetricCard icon={<CheckCircle2 size={18} />} label="Task Completion" value={`${taskCompletionRate}%`} color="emerald" subtitle={`${completedTasks}/${totalTasks} tasks`} />
        <MetricCard icon={<Clock size={18} />} label="Revision Due" value={dueRevisions.toString()} color="amber" subtitle={`of ${totalRevisions} total`} />
        <MetricCard icon={<BarChart3 size={18} />} label="Avg Test Score" value={`${avgScore}%`} color="cyan" subtitle={`Best: ${bestScore}%`} />
      </div>

      {/* Subject Breakdown */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="font-semibold text-lg mb-4">Subject-wise Progress</h2>
        <div className="space-y-4">
          {subjectStats.map(({ subject, total, completed, progress, tests, avgScore }) => (
            <div key={subject.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{subject.icon}</span>
                  <span className="font-medium text-sm">{subject.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>{completed}/{total} chapters</span>
                  {tests > 0 && <span>Avg: {avgScore}%</span>}
                </div>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, backgroundColor: subject.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Task Performance */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" /> Task Performance
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Completed</span>
              <span className="text-emerald-400">{completedTasks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Pending</span>
              <span className="text-amber-400">{pendingTasks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Overdue</span>
              <span className="text-rose-400">{overdueTasks}</span>
            </div>
            <div className="border-t border-slate-700 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Completion Rate</span>
                <span className="font-bold">{taskCompletionRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chapters Needing Attention */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" /> Needs Attention
          </h2>
          {needsAttention.length === 0 ? (
            <div className="text-center py-4 text-slate-500">
              <p className="text-sm">All chapters are on track!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {needsAttention.slice(0, 6).map(chapter => {
                const subject = subjects.find(s => s.id === chapter.subjectId);
                return (
                  <div key={chapter.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{subject?.icon}</span>
                      <span className="text-sm truncate">{chapter.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      chapter.status === 'revision-due' ? 'bg-orange-900/30 text-orange-300' : 'bg-rose-900/30 text-rose-300'
                    }`}>
                      {chapter.status === 'revision-due' ? 'Revision Due' : 'Low Progress'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Test Score History */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-cyan-400" /> Test Score History
          </h2>
          {testRecords.length === 0 ? (
            <div className="text-center py-4 text-slate-500">
              <p className="text-sm">No tests recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {[...testRecords].reverse().slice(0, 8).map(test => {
                const pct = Math.round((test.obtainedMarks / test.maxMarks) * 100);
                const subject = subjects.find(s => s.id === test.subjectId);
                return (
                  <div key={test.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-16 truncate">{subject?.icon}</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mistake Summary */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-400" /> Mistake Summary
          </h2>
          {mistakes.length === 0 ? (
            <div className="text-center py-4 text-slate-500">
              <p className="text-sm">No mistakes recorded</p>
              <p className="text-xs mt-1">Track mistakes to learn from them</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total recorded</span>
                <span>{mistakes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Open</span>
                <span className="text-rose-400">{openMistakes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Resolved</span>
                <span className="text-emerald-400">{resolvedMistakes}</span>
              </div>
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Resolution Rate</span>
                  <span className="font-bold">
                    {mistakes.length > 0 ? Math.round(resolvedMistakes / mistakes.length * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Study Time */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Clock size={18} className="text-indigo-400" /> Study Time
        </h2>
        <p className="text-xs text-slate-500 mb-3">Based on completed tasks with estimated durations. Actual time tracking requires manual entry.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-slate-700/30">
            <p className="text-2xl font-bold text-indigo-400">{Math.round(estimatedStudyMinutes / 60)}h {estimatedStudyMinutes % 60}m</p>
            <p className="text-xs text-slate-400">Estimated from tasks</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-700/30">
            <p className="text-2xl font-bold text-emerald-400">{completedTasks}</p>
            <p className="text-xs text-slate-400">Tasks completed</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-slate-600 py-4">
        <p>Analytics are based on your recorded data. Progress calculations use chapter status and topic completion.</p>
        <p className="mt-1">No predictions are made about exam results — these are factual summaries only.</p>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color, subtitle }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
  };

  return (
    <div className="glass-card rounded-xl p-4">
      <div className={`mb-2 ${colors[color]}`}>{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

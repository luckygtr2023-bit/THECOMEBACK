import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, calculateChapterProgress, getChapterStatusLabel, getChapterStatusColor, formatDate } from '../database/db';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, TrendingUp, AlertCircle, Target } from 'lucide-react';

export function Dashboard() {
  const subjects = useLiveQuery(() => db.subjects.filter(s => s.enabled).toArray(), [], []);
  const chapters = useLiveQuery(() => db.chapters.filter(c => c.enabled && !c.archived).toArray(), [], []);
  const todayTasks = useLiveQuery(() => db.tasks.where('date').equals(new Date().toISOString().split('T')[0]).toArray(), [], []);
  const revisionDue = useLiveQuery(() => {
    const today = new Date().toISOString().split('T')[0];
    return db.revisionItems.where('nextReviewDate').belowOrEqual(today).and(r => r.status === 'pending').toArray();
  }, [], []);
  const recentTests = useLiveQuery(() => db.testRecords.orderBy('date').reverse().limit(5).toArray(), [], []);
  const openMistakes = useLiveQuery(() => db.mistakes.where('status').equals('open').count(), [], 0);

  const enabledChapters = chapters.filter(c => c.enabled && !c.archived);
  const completedChapters = enabledChapters.filter(c => c.status === 'completed' || c.status === 'revised');
  const learningChapters = enabledChapters.filter(c => c.status === 'learning' || c.status === 'practising');
  const overallProgress = enabledChapters.length > 0
    ? Math.round(completedChapters.length / enabledChapters.length * 100)
    : 0;

  const pendingToday = todayTasks.filter(t => t.status === 'pending');
  const completedToday = todayTasks.filter(t => t.status === 'completed');

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-400 mt-1">Your study overview at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<BookOpen size={20} />}
          label="Overall Progress"
          value={`${overallProgress}%`}
          color="indigo"
          subtitle={`${completedChapters.length}/${enabledChapters.length} chapters`}
        />
        <StatCard
          icon={<Target size={20} />}
          label="Today's Tasks"
          value={`${completedToday.length}/${pendingToday.length + completedToday.length}`}
          color="emerald"
          subtitle="completed"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Revision Due"
          value={revisionDue.length.toString()}
          color="amber"
          subtitle="items pending"
        />
        <StatCard
          icon={<AlertCircle size={20} />}
          label="Open Mistakes"
          value={openMistakes.toString()}
          color="rose"
          subtitle="need attention"
        />
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Active Learning */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Active Learning</h2>
            <Link to="/subjects" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          {learningChapters.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chapters in progress</p>
              <p className="text-xs mt-1">Start learning a chapter from Subjects</p>
            </div>
          ) : (
            <div className="space-y-3">
              {learningChapters.slice(0, 5).map(chapter => {
                const subject = subjects.find(s => s.id === chapter.subjectId);
                const progress = calculateChapterProgress(chapter);
                return (
                  <Link
                    key={chapter.id}
                    to={`/subjects/${chapter.subjectId}/chapters/${chapter.id}`}
                    className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{chapter.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getChapterStatusColor(chapter.status)}`}>
                        {getChapterStatusLabel(chapter.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{progress}%</span>
                    </div>
                    {subject && (
                      <span className="text-xs text-slate-500 mt-1">{subject.icon} {subject.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's Tasks */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Today's Tasks</h2>
            <Link to="/tasks" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          {todayTasks.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tasks for today</p>
              <p className="text-xs mt-1">Plan your day in the Planner</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 6).map(task => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg ${
                    task.status === 'completed' ? 'bg-emerald-900/20' : 'bg-slate-700/30'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'completed' ? 'bg-emerald-400' :
                    task.priority === 'high' ? 'bg-rose-400' :
                    task.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
                  }`} />
                  <span className={`flex-1 text-sm truncate ${
                    task.status === 'completed' ? 'line-through text-slate-500' : ''
                  }`}>
                    {task.title}
                  </span>
                  <span className="text-xs text-slate-500">{task.estimatedMinutes}m</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tests */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Recent Tests</h2>
            <Link to="/tests" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          {recentTests.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tests recorded yet</p>
              <p className="text-xs mt-1">Record test results to track progress</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTests.map(test => {
                const percentage = Math.round((test.obtainedMarks / test.maxMarks) * 100);
                return (
                  <div key={test.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-700/30">
                    <div>
                      <p className="text-sm font-medium truncate">{test.name}</p>
                      <p className="text-xs text-slate-500">{formatDate(test.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        percentage >= 80 ? 'text-emerald-400' :
                        percentage >= 60 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {percentage}%
                      </p>
                      <p className="text-xs text-slate-500">{test.obtainedMarks}/{test.maxMarks}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revision Queue */}
        <div className="glass-card rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Revision Queue</h2>
            <Link to="/revision" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          {revisionDue.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">All caught up!</p>
              <p className="text-xs mt-1">No revisions due right now</p>
            </div>
          ) : (
            <div className="space-y-2">
              {revisionDue.slice(0, 5).map(item => {
                const chapter = chapters.find(c => c.id === item.chapterId);
                return (
                  <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-700/30">
                    <span className="text-sm truncate">{chapter?.name || 'Unknown'}</span>
                    <span className="text-xs text-amber-400">Due {formatDate(item.nextReviewDate)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Subject Progress Overview */}
      <div className="glass-card rounded-xl p-4 md:p-5">
        <h2 className="font-semibold text-lg mb-4">Subject Progress</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {subjects.map(subject => {
            const subjectChapters = enabledChapters.filter(c => c.subjectId === subject.id);
            const subjectCompleted = subjectChapters.filter(c => c.status === 'completed' || c.status === 'revised');
            const progress = subjectChapters.length > 0
              ? Math.round(subjectCompleted.length / subjectChapters.length * 100)
              : 0;
            return (
              <Link
                key={subject.id}
                to="/subjects"
                className="p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{subject.icon}</span>
                  <span className="font-medium text-sm">{subject.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: subject.color }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{progress}%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{subjectCompleted.length}/{subjectChapters.length} chapters</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, subtitle }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  subtitle: string;
}) {
  const colorClasses: Record<string, string> = {
    indigo: 'from-indigo-600/20 to-indigo-800/10 border-indigo-500/30 text-indigo-300',
    emerald: 'from-emerald-600/20 to-emerald-800/10 border-emerald-500/30 text-emerald-300',
    amber: 'from-amber-600/20 to-amber-800/10 border-amber-500/30 text-amber-300',
    rose: 'from-rose-600/20 to-rose-800/10 border-rose-500/30 text-rose-300',
  };

  return (
    <div className={`rounded-xl p-3 md:p-4 border bg-gradient-to-br ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-slate-400">{label}</span>
      </div>
      <p className="text-xl md:text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

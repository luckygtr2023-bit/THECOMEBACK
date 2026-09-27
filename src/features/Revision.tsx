import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, getToday, formatDate, type RevisionItem } from '../database/db';
import { Plus, Clock, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

export function Revision() {
  const today = getToday();
  const chapters = useLiveQuery(() => db.chapters.filter(c => !c.archived && c.enabled).toArray(), [], []);
  const subjects = useLiveQuery(() => db.subjects.toArray(), [], []);
  const revisionItems = useLiveQuery(() => db.revisionItems.orderBy('nextReviewDate').toArray(), [], []);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  const dueItems = revisionItems.filter(r => r.nextReviewDate <= today && r.status === 'pending');
  const upcomingItems = revisionItems.filter(r => r.nextReviewDate > today && r.status === 'pending');
  const overdueItems = dueItems.filter(r => r.nextReviewDate < today);

  const handleAdd = async () => {
    if (!selectedChapter) return;
    const chapter = chapters.find(c => c.id === selectedChapter);
    if (!chapter) return;

    const existing = revisionItems.find(r => r.chapterId === selectedChapter && r.status === 'pending');
    if (existing) {
      alert('This chapter is already in the revision queue.');
      return;
    }

    const item: RevisionItem = {
      id: generateId(),
      chapterId: selectedChapter,
      subjectId: chapter.subjectId,
      topicName: selectedTopic || undefined,
      nextReviewDate: today,
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.revisionItems.add(item);
    setShowAdd(false);
    setSelectedChapter('');
    setSelectedTopic('');
  };

  const handleReview = async (item: RevisionItem, quality: 'easy' | 'okay' | 'difficult') => {
    // Spaced repetition calculation (simplified SM-2)
    let newInterval = item.interval;
    let newEase = item.easeFactor;

    if (quality === 'easy') {
      newInterval = Math.round(item.interval * newEase);
      newEase = Math.min(3.0, newEase + 0.1);
    } else if (quality === 'okay') {
      newInterval = Math.round(item.interval * 1.5);
    } else {
      newInterval = 1;
      newEase = Math.max(1.3, newEase - 0.2);
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newInterval);

    await db.revisionItems.update(item.id, {
      lastReviewDate: today,
      nextReviewDate: nextDate.toISOString().split('T')[0],
      interval: newInterval,
      easeFactor: newEase,
      reviewCount: item.reviewCount + 1,
      status: 'done',
    });
  };

  const handleSnooze = async (item: RevisionItem) => {
    const days = prompt('Snooze for how many days?', '3');
    if (!days) return;
    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1) return;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + numDays);
    await db.revisionItems.update(item.id, {
      nextReviewDate: newDate.toISOString().split('T')[0],
      status: 'snoozed',
      snoozedUntil: newDate.toISOString().split('T')[0],
    });
  };

  const getChapterName = (chapterId: string) => chapters.find(c => c.id === chapterId)?.name || 'Unknown';
  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || '';

  const selectedChapterData = chapters.find(c => c.id === selectedChapter);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Revision Queue</h1>
          <p className="text-slate-400 mt-1 text-sm">Spaced repetition for effective long-term retention</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add to Queue</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{dueItems.length}</p>
          <p className="text-xs text-slate-400">Due Today</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-rose-400">{overdueItems.length}</p>
          <p className="text-xs text-slate-400">Overdue</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-indigo-400">{upcomingItems.length}</p>
          <p className="text-xs text-slate-400">Upcoming</p>
        </div>
      </div>

      {/* Add to Queue */}
      {showAdd && (
        <div className="glass-card rounded-xl p-4 border border-indigo-500/30">
          <h3 className="font-semibold mb-3">Add Chapter to Revision Queue</h3>
          <div className="space-y-3">
            <select
              value={selectedChapter}
              onChange={e => setSelectedChapter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select chapter...</option>
              {chapters.filter(c => c.status === 'completed' || c.status === 'revised' || c.status === 'practising').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedChapterData && selectedChapterData.topics.length > 0 && (
              <select
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All topics (or select specific)</option>
                {selectedChapterData.topics.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium">Add</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Due Items */}
      {dueItems.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Clock size={18} className="text-amber-400" /> Due for Revision
          </h2>
          <div className="space-y-2">
            {dueItems.map(item => (
              <div key={item.id} className="glass-card rounded-xl p-4 border border-amber-500/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{getChapterName(item.chapterId)}</p>
                    {item.topicName && <p className="text-xs text-slate-400 mt-0.5">Topic: {item.topicName}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{getSubjectName(item.subjectId)}</span>
                      <span className="text-xs text-slate-500">Review #{item.reviewCount + 1}</span>
                      <span className="text-xs text-slate-500">Interval: {item.interval}d</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => handleReview(item, 'easy')}
                    className="px-3 py-1.5 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-600/30"
                  >
                    😊 Easy
                  </button>
                  <button
                    onClick={() => handleReview(item, 'okay')}
                    className="px-3 py-1.5 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium hover:bg-amber-600/30"
                  >
                    😐 Okay
                  </button>
                  <button
                    onClick={() => handleReview(item, 'difficult')}
                    className="px-3 py-1.5 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium hover:bg-rose-600/30"
                  >
                    😰 Difficult
                  </button>
                  <button
                    onClick={() => handleSnooze(item)}
                    className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-600"
                  >
                    <RotateCcw size={12} className="inline mr-1" /> Snooze
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Items */}
      {upcomingItems.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-indigo-400" /> Upcoming
          </h2>
          <div className="space-y-1">
            {upcomingItems.slice(0, 10).map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div>
                  <p className="text-sm font-medium">{getChapterName(item.chapterId)}</p>
                  <p className="text-xs text-slate-500">{getSubjectName(item.subjectId)}</p>
                </div>
                <span className="text-xs text-slate-400">{formatDate(item.nextReviewDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {revisionItems.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No items in revision queue</p>
          <p className="text-xs mt-1">Complete chapters and add them here for spaced revision</p>
        </div>
      )}
    </div>
  );
}

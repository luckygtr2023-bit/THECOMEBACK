import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, calculateChapterProgress, getChapterStatusLabel, getChapterStatusColor, type ChapterStatus, type Topic } from '../database/db';
import { ArrowLeft, CheckCircle2, Circle, Plus, Trash2, Edit2, Save } from 'lucide-react';

const STATUS_TRANSITIONS: Record<ChapterStatus, ChapterStatus[]> = {
  'not-started': ['learning'],
  'learning': ['practising', 'not-started'],
  'practising': ['completed', 'learning'],
  'completed': ['revision-due', 'learning'],
  'revision-due': ['revised', 'learning'],
  'revised': ['revision-due', 'learning'],
};

export function ChapterDetail() {
  const { subjectId, chapterId } = useParams<{ subjectId: string; chapterId: string }>();
  const navigate = useNavigate();
  const chapter = useLiveQuery(() => db.chapters.get(chapterId!), [chapterId]);
  const subject = useLiveQuery(() => db.subjects.get(subjectId!), [subjectId]);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  if (!chapter || !subject) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Chapter not found</p>
        <Link to="/subjects" className="text-indigo-400 hover:underline mt-2 inline-block">← Back to Subjects</Link>
      </div>
    );
  }

  const progress = calculateChapterProgress(chapter);
  const allowedTransitions = STATUS_TRANSITIONS[chapter.status];

  const handleStatusChange = async (newStatus: ChapterStatus) => {
    const updates: Partial<typeof chapter> = { status: newStatus, updatedAt: new Date().toISOString() };
    if (newStatus === 'learning' && !chapter.startDate) {
      updates.startDate = new Date().toISOString().split('T')[0];
    }
    if (newStatus === 'completed') {
      updates.completionDate = new Date().toISOString().split('T')[0];
    }
    await db.chapters.update(chapter.id, updates);
  };

  const handleToggleTopic = async (topicId: string) => {
    const updatedTopics = chapter.topics.map(t =>
      t.id === topicId ? { ...t, completed: !t.completed } : t
    );
    await db.chapters.update(chapter.id, { topics: updatedTopics, updatedAt: new Date().toISOString() });
  };

  const handleAddTopic = async (optional: boolean) => {
    if (!newTopicName.trim()) return;
    const topic: Topic = { id: generateId(), name: newTopicName.trim(), completed: false, optional };
    await db.chapters.update(chapter.id, { topics: [...chapter.topics, topic], updatedAt: new Date().toISOString() });
    setNewTopicName('');
  };

  const handleDeleteTopic = async (topicId: string) => {
    const updatedTopics = chapter.topics.filter(t => t.id !== topicId);
    await db.chapters.update(chapter.id, { topics: updatedTopics, updatedAt: new Date().toISOString() });
  };

  const handleSaveName = async () => {
    if (nameValue.trim()) {
      await db.chapters.update(chapter.id, { name: nameValue.trim(), updatedAt: new Date().toISOString() });
    }
    setEditingName(false);
  };

  const handleSaveNotes = async () => {
    await db.chapters.update(chapter.id, { notes, updatedAt: new Date().toISOString() });
    setEditingNotes(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/subjects" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
          <ArrowLeft size={14} /> Subjects
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400">{subject.icon} {subject.name}</span>
      </div>

      {/* Chapter Header */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-700 rounded-lg text-lg font-bold border border-slate-600 focus:border-indigo-500 focus:outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  autoFocus
                />
                <button onClick={handleSaveName} className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500"><Save size={16} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold">{chapter.name}</h1>
                <button onClick={() => { setEditingName(true); setNameValue(chapter.name); }} className="p-1.5 rounded hover:bg-slate-700">
                  <Edit2 size={14} className="text-slate-400" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getChapterStatusColor(chapter.status)}`}>
                {getChapterStatusLabel(chapter.status)}
              </span>
              <span className="text-xs text-slate-500">Priority: {chapter.priority}</span>
              {chapter.startDate && <span className="text-xs text-slate-500">Started: {chapter.startDate}</span>}
              {chapter.completionDate && <span className="text-xs text-emerald-400">Completed: {chapter.completionDate}</span>}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Progress</span>
            <span className="text-xs font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Status Transitions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {allowedTransitions.map(status => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${getChapterStatusColor(status)} border-current hover:opacity-80`}
            >
              → {getChapterStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="font-semibold text-lg mb-3">Topics / Checklist</h2>
        {chapter.topics.length === 0 ? (
          <p className="text-sm text-slate-500 mb-3">No topics added yet. Add topics to track your progress.</p>
        ) : (
          <div className="space-y-1 mb-4">
            {chapter.topics.map(topic => (
              <div key={topic.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/30 group">
                <button onClick={() => handleToggleTopic(topic.id)} className="flex-shrink-0">
                  {topic.completed ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <Circle size={18} className="text-slate-500" />
                  )}
                </button>
                <span className={`flex-1 text-sm ${topic.completed ? 'line-through text-slate-500' : ''} ${topic.optional ? 'italic text-slate-400' : ''}`}>
                  {topic.name}
                  {topic.optional && <span className="ml-2 text-xs text-slate-600">(optional)</span>}
                </span>
                <button
                  onClick={() => handleDeleteTopic(topic.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-600 transition-opacity"
                >
                  <Trash2 size={14} className="text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Topic */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add topic..."
            value={newTopicName}
            onChange={e => setNewTopicName(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
            onKeyDown={e => e.key === 'Enter' && handleAddTopic(false)}
          />
          <button onClick={() => handleAddTopic(false)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium">
            <Plus size={14} />
          </button>
          <button onClick={() => handleAddTopic(true)} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs" title="Add as optional">
            + Opt
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Notes</h2>
          {!editingNotes && (
            <button onClick={() => { setEditingNotes(true); setNotes(chapter.notes || ''); }} className="text-xs text-indigo-400 hover:text-indigo-300">
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none min-h-[100px] resize-y"
              placeholder="Add your notes about this chapter..."
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleSaveNotes} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium">Save</button>
              <button onClick={() => setEditingNotes(false)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">{chapter.notes || 'No notes yet.'}</p>
        )}
      </div>
    </div>
  );
}

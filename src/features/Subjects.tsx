import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, calculateChapterProgress, getChapterStatusLabel, getChapterStatusColor, type Subject, type Chapter } from '../database/db';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';

export function Subjects() {
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), [], []);
  const chapters = useLiveQuery(() => db.chapters.where('archived').equals(0).toArray(), [], []);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#6366f1');
  const [newSubjectIcon, setNewSubjectIcon] = useState('📖');
  const [addingChapter, setAddingChapter] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState('');

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    const subject: Subject = {
      id: generateId(),
      name: newSubjectName.trim(),
      color: newSubjectColor,
      icon: newSubjectIcon,
      enabled: true,
      order: subjects.length,
      createdAt: new Date().toISOString(),
    };
    await db.subjects.add(subject);
    setNewSubjectName('');
    setShowAddSubject(false);
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject) return;
    await db.subjects.update(editingSubject.id, { name: editingSubject.name, color: editingSubject.color, icon: editingSubject.icon });
    setEditingSubject(null);
  };

  const toggleSubject = async (subject: Subject) => {
    await db.subjects.update(subject.id, { enabled: !subject.enabled });
  };

  const handleAddChapter = async (subjectId: string) => {
    if (!newChapterName.trim()) return;
    const subjectChapters = chapters.filter(c => c.subjectId === subjectId);
    const chapter: Chapter = {
      id: generateId(),
      subjectId,
      name: newChapterName.trim(),
      status: 'not-started',
      order: subjectChapters.length,
      enabled: true,
      archived: false,
      priority: 'medium',
      topics: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.chapters.add(chapter);
    setNewChapterName('');
    setAddingChapter(null);
  };

  const archiveChapter = async (chapter: Chapter) => {
    const hasLinkedData = await db.tasks.where('chapterId').equals(chapter.id).count() > 0 ||
      await db.revisionItems.where('chapterId').equals(chapter.id).count() > 0;
    
    if (hasLinkedData) {
      if (!confirm(`"${chapter.name}" has linked tasks/revision data. Archive it instead of deleting?`)) return;
    }
    await db.chapters.update(chapter.id, { archived: true });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Subjects & Syllabus</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage your subjects and chapters. This is an editable starter syllabus.</p>
        </div>
        <button
          onClick={() => setShowAddSubject(true)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Subject</span>
        </button>
      </div>

      {/* Add Subject Modal */}
      {showAddSubject && (
        <div className="glass-card rounded-xl p-4 border border-indigo-500/30">
          <h3 className="font-semibold mb-3">Add New Subject</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Subject name"
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
              onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
            />
            <input
              type="text"
              placeholder="Icon (emoji)"
              value={newSubjectIcon}
              onChange={e => setNewSubjectIcon(e.target.value)}
              className="w-20 px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none text-center"
            />
            <input
              type="color"
              value={newSubjectColor}
              onChange={e => setNewSubjectColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
            />
            <button onClick={handleAddSubject} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium">
              Add
            </button>
            <button onClick={() => setShowAddSubject(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="glass-card rounded-xl p-4 border border-indigo-500/30">
          <h3 className="font-semibold mb-3">Edit Subject</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={editingSubject.name}
              onChange={e => setEditingSubject({ ...editingSubject, name: e.target.value })}
              className="flex-1 min-w-[200px] px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              value={editingSubject.icon}
              onChange={e => setEditingSubject({ ...editingSubject, icon: e.target.value })}
              className="w-20 px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none text-center"
            />
            <input
              type="color"
              value={editingSubject.color}
              onChange={e => setEditingSubject({ ...editingSubject, color: e.target.value })}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
            />
            <button onClick={handleUpdateSubject} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium">
              Save
            </button>
            <button onClick={() => setEditingSubject(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subject List */}
      <div className="space-y-3">
        {subjects.map(subject => {
          const subjectChapters = chapters.filter(c => c.subjectId === subject.id && !c.archived);
          const isExpanded = expandedSubject === subject.id;
          const completedCount = subjectChapters.filter(c => c.status === 'completed' || c.status === 'revised').length;
          const progress = subjectChapters.length > 0 ? Math.round(completedCount / subjectChapters.length * 100) : 0;

          return (
            <div key={subject.id} className="glass-card rounded-xl overflow-hidden">
              {/* Subject Header */}
              <div className="p-4 flex items-center gap-3">
                <button
                  onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  <span className="text-xl">{subject.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{subject.name}</h3>
                      {!subject.enabled && <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">Disabled</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-[200px]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: subject.color }} />
                      </div>
                      <span className="text-xs text-slate-500">{completedCount}/{subjectChapters.length} • {progress}%</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleSubject(subject)}
                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                    title={subject.enabled ? 'Disable subject' : 'Enable subject'}
                  >
                    {subject.enabled ? <Eye size={16} className="text-slate-400" /> : <EyeOff size={16} className="text-slate-500" />}
                  </button>
                  <button
                    onClick={() => setEditingSubject(subject)}
                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                    title="Edit subject"
                  >
                    <Edit2 size={16} className="text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Chapters */}
              {isExpanded && (
                <div className="border-t border-slate-700/50 p-3 space-y-1">
                  {subjectChapters.map(chapter => (
                    <div key={chapter.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/30 group">
                      <Link
                        to={`/subjects/${subject.id}/chapters/${chapter.id}`}
                        className="flex-1 min-w-0 flex items-center gap-2"
                      >
                        <span className="text-sm truncate">{chapter.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${getChapterStatusColor(chapter.status)}`}>
                          {getChapterStatusLabel(chapter.status)}
                        </span>
                        <span className="text-xs text-slate-500">{calculateChapterProgress(chapter)}%</span>
                      </Link>
                      <button
                        onClick={() => archiveChapter(chapter)}
                        className="p-1.5 rounded hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Archive chapter"
                      >
                        <Trash2 size={14} className="text-slate-500" />
                      </button>
                    </div>
                  ))}

                  {/* Add Chapter */}
                  {addingChapter === subject.id ? (
                    <div className="flex items-center gap-2 p-2">
                      <input
                        type="text"
                        placeholder="Chapter name"
                        value={newChapterName}
                        onChange={e => setNewChapterName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
                        onKeyDown={e => e.key === 'Enter' && handleAddChapter(subject.id)}
                        autoFocus
                      />
                      <button onClick={() => handleAddChapter(subject.id)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium">
                        Add
                      </button>
                      <button onClick={() => setAddingChapter(null)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingChapter(subject.id)}
                      className="flex items-center gap-2 p-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <Plus size={14} />
                      Add chapter
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

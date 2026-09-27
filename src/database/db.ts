import Dexie, { type Table } from 'dexie';

// ============ TYPES ============

export type ChapterStatus = 'not-started' | 'learning' | 'practising' | 'completed' | 'revision-due' | 'revised';

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  enabled: boolean;
  order: number;
  createdAt: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  status: ChapterStatus;
  order: number;
  enabled: boolean;
  archived: boolean;
  priority: 'high' | 'medium' | 'low';
  topics: Topic[];
  startDate?: string;
  completionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  optional: boolean;
}

export interface Task {
  id: string;
  title: string;
  type: 'learning' | 'practice' | 'recall' | 'revision' | 'test' | 'review';
  subjectId?: string;
  chapterId?: string;
  date: string;
  estimatedMinutes: number;
  actualMinutes?: number;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'skipped' | 'rescheduled';
  rescheduledFrom?: string;
  weekId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface WeekPlan {
  id: string;
  startDate: string;
  endDate: string;
  goals: string[];
  createdAt: string;
}

export interface RevisionItem {
  id: string;
  chapterId: string;
  subjectId: string;
  topicName?: string;
  nextReviewDate: string;
  lastReviewDate?: string;
  interval: number;
  easeFactor: number;
  reviewCount: number;
  status: 'pending' | 'done' | 'snoozed';
  snoozedUntil?: string;
  createdAt: string;
}

export interface TestRecord {
  id: string;
  name: string;
  subjectId: string;
  chapterIds: string[];
  date: string;
  maxMarks: number;
  obtainedMarks: number;
  durationMinutes?: number;
  notes?: string;
  createdAt: string;
}

export interface Mistake {
  id: string;
  questionOrTopic: string;
  mistakeType: 'conceptual' | 'calculation' | 'reading' | 'silly' | 'time-management';
  whyItHappened: string;
  correctConcept: string;
  nextAction: string;
  chapterId?: string;
  testId?: string;
  status: 'open' | 'reviewed' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export interface Settings {
  id: string;
  availableStudyHours: Record<string, { start: string; end: string }>;
  unavailableBlocks: { day: string; start: string; end: string; reason: string }[];
  breakDurationMinutes: number;
  bufferPercentage: number;
  revisionIntervals: number[];
  theme: 'dark' | 'light';
  createdAt: string;
  updatedAt: string;
}

export interface BackupData {
  schemaVersion: number;
  exportedAt: string;
  appName: string;
  subjects: Subject[];
  chapters: Chapter[];
  tasks: Task[];
  weekPlans: WeekPlan[];
  revisionItems: RevisionItem[];
  testRecords: TestRecord[];
  mistakes: Mistake[];
  settings: Settings[];
}

// ============ DATABASE ============

export const SCHEMA_VERSION = 1;

class StudyOSDatabase extends Dexie {
  subjects!: Table<Subject, string>;
  chapters!: Table<Chapter, string>;
  tasks!: Table<Task, string>;
  weekPlans!: Table<WeekPlan, string>;
  revisionItems!: Table<RevisionItem, string>;
  testRecords!: Table<TestRecord, string>;
  mistakes!: Table<Mistake, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('Class10StudyOS');
    this.version(SCHEMA_VERSION).stores({
      subjects: 'id, name, enabled, order',
      chapters: 'id, subjectId, status, enabled, archived, order',
      tasks: 'id, date, status, subjectId, chapterId, weekId, type',
      weekPlans: 'id, startDate',
      revisionItems: 'id, chapterId, subjectId, nextReviewDate, status',
      testRecords: 'id, subjectId, date',
      mistakes: 'id, chapterId, testId, status, mistakeType',
      settings: 'id',
    });
  }
}

export const db = new StudyOSDatabase();

// ============ SEED DATA ============

export async function seedDatabase() {
  const subjectCount = await db.subjects.count();
  if (subjectCount > 0) return;

  const subjects: Subject[] = [
    { id: 'maths', name: 'Mathematics', color: '#6366f1', icon: '📐', enabled: true, order: 0, createdAt: new Date().toISOString() },
    { id: 'science', name: 'Science', color: '#10b981', icon: '🔬', enabled: true, order: 1, createdAt: new Date().toISOString() },
    { id: 'social', name: 'Social Science', color: '#f59e0b', icon: '🌍', enabled: true, order: 2, createdAt: new Date().toISOString() },
  ];

  const mathsChapters: Chapter[] = [
    { id: 'math-1', subjectId: 'maths', name: 'Real Numbers', status: 'not-started', order: 0, enabled: true, archived: false, priority: 'high', topics: [{ id: 't1', name: 'Euclid\'s Division Lemma', completed: false, optional: false }, { id: 't2', name: 'Fundamental Theorem of Arithmetic', completed: false, optional: false }, { id: 't3', name: 'Irrational Numbers', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'math-2', subjectId: 'maths', name: 'Polynomials', status: 'not-started', order: 1, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't4', name: 'Zeros of a Polynomial', completed: false, optional: false }, { id: 't5', name: 'Division Algorithm', completed: false, optional: true }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'math-3', subjectId: 'maths', name: 'Pair of Linear Equations', status: 'not-started', order: 2, enabled: true, archived: false, priority: 'high', topics: [{ id: 't6', name: 'Graphical Method', completed: false, optional: false }, { id: 't7', name: 'Substitution Method', completed: false, optional: false }, { id: 't8', name: 'Elimination Method', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'math-4', subjectId: 'maths', name: 'Quadratic Equations', status: 'not-started', order: 3, enabled: true, archived: false, priority: 'high', topics: [{ id: 't9', name: 'Standard Form', completed: false, optional: false }, { id: 't10', name: 'Factorization', completed: false, optional: false }, { id: 't11', name: 'Quadratic Formula', completed: false, optional: false }, { id: 't12', name: 'Nature of Roots', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'math-5', subjectId: 'maths', name: 'Arithmetic Progressions', status: 'not-started', order: 4, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't13', name: 'nth Term', completed: false, optional: false }, { id: 't14', name: 'Sum of n Terms', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'math-6', subjectId: 'maths', name: 'Triangles', status: 'not-started', order: 5, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't15', name: 'Similar Triangles', completed: false, optional: false }, { id: 't16', name: 'BPT', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'math-7', subjectId: 'maths', name: 'Coordinate Geometry', status: 'not-started', order: 6, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't17', name: 'Distance Formula', completed: false, optional: false }, { id: 't18', name: 'Section Formula', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'math-8', subjectId: 'maths', name: 'Trigonometry', status: 'not-started', order: 7, enabled: true, archived: false, priority: 'high', topics: [{ id: 't19', name: 'Ratios', completed: false, optional: false }, { id: 't20', name: 'Standard Angles', completed: false, optional: false }, { id: 't21', name: 'Identities', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'math-9', subjectId: 'maths', name: 'Circles', status: 'not-started', order: 8, enabled: true, archived: false, priority: 'low', topics: [{ id: 't22', name: 'Tangent Properties', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'math-10', subjectId: 'maths', name: 'Surface Areas & Volumes', status: 'not-started', order: 9, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't23', name: 'Combination of Solids', completed: false, optional: false }, { id: 't24', name: 'Conversion of Solids', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'math-11', subjectId: 'maths', name: 'Statistics & Probability', status: 'not-started', order: 10, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't25', name: 'Mean', completed: false, optional: false }, { id: 't26', name: 'Median', completed: false, optional: false }, { id: 't27', name: 'Probability', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  const scienceChapters: Chapter[] = [
    { id: 'sci-1', subjectId: 'science', name: 'Chemical Reactions & Equations', status: 'not-started', order: 0, enabled: true, archived: false, priority: 'high', topics: [{ id: 't28', name: 'Types of Reactions', completed: false, optional: false }, { id: 't29', name: 'Balancing Equations', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'sci-2', subjectId: 'science', name: 'Acids, Bases & Salts', status: 'not-started', order: 1, enabled: true, archived: false, priority: 'high', topics: [{ id: 't30', name: 'pH Scale', completed: false, optional: false }, { id: 't31', name: 'Indicators', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'sci-3', subjectId: 'science', name: 'Metals & Non-Metals', status: 'not-started', order: 2, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't32', name: 'Properties', completed: false, optional: false }, { id: 't33', name: 'Reactivity Series', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'sci-4', subjectId: 'science', name: 'Life Processes', status: 'not-started', order: 3, enabled: true, archived: false, priority: 'high', topics: [{ id: 't34', name: 'Nutrition', completed: false, optional: false }, { id: 't35', name: 'Respiration', completed: false, optional: false }, { id: 't36', name: 'Transportation', completed: false, optional: false }, { id: 't37', name: 'Excretion', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'sci-5', subjectId: 'science', name: 'Control & Coordination', status: 'not-started', order: 4, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't38', name: 'Nervous System', completed: false, optional: false }, { id: 't39', name: 'Hormones', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'sci-6', subjectId: 'science', name: 'Light – Reflection & Refraction', status: 'not-started', order: 5, enabled: true, archived: false, priority: 'high', topics: [{ id: 't40', name: 'Mirror Formula', completed: false, optional: false }, { id: 't41', name: 'Lens Formula', completed: false, optional: false }, { id: 't42', name: 'Power of Lens', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'sci-7', subjectId: 'science', name: 'Human Eye & Colourful World', status: 'not-started', order: 6, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't43', name: 'Defects of Vision', completed: false, optional: false }, { id: 't44', name: 'Dispersion', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'sci-8', subjectId: 'science', name: 'Electricity', status: 'not-started', order: 7, enabled: true, archived: false, priority: 'high', topics: [{ id: 't45', name: 'Ohm\'s Law', completed: false, optional: false }, { id: 't46', name: 'Series & Parallel', completed: false, optional: false }, { id: 't47', name: 'Power & Energy', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'sci-9', subjectId: 'science', name: 'Magnetic Effects of Current', status: 'not-started', order: 8, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't48', name: 'Magnetic Field', completed: false, optional: false }, { id: 't49', name: 'Electromagnetic Induction', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'sci-10', subjectId: 'science', name: 'Our Environment', status: 'not-started', order: 9, enabled: true, archived: false, priority: 'low', topics: [{ id: 't50', name: 'Ecosystem', completed: false, optional: false }, { id: 't51', name: 'Ozone Layer', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  const socialChapters: Chapter[] = [
    { id: 'soc-1', subjectId: 'social', name: 'Rise of Nationalism in Europe', status: 'not-started', order: 0, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't52', name: 'French Revolution', completed: false, optional: false }, { id: 't53', name: 'Unification', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'soc-2', subjectId: 'social', name: 'Nationalism in India', status: 'not-started', order: 1, enabled: true, archived: false, priority: 'high', topics: [{ id: 't54', name: 'Non-Cooperation', completed: false, optional: false }, { id: 't55', name: 'Civil Disobedience', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'soc-3', subjectId: 'social', name: 'Money & Credit', status: 'not-started', order: 2, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't56', name: 'Money as Medium', completed: false, optional: false }, { id: 't57', name: 'Formal & Informal Credit', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'soc-4', subjectId: 'social', name: 'Resources & Development', status: 'not-started', order: 3, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't58', name: 'Types of Resources', completed: false, optional: false }, { id: 't59', name: 'Soil Types', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'soc-5', subjectId: 'social', name: 'Water Resources', status: 'not-started', order: 4, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't60', name: 'Water Scarcity', completed: false, optional: false }, { id: 't61', name: 'Rainwater Harvesting', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'soc-6', subjectId: 'social', name: 'Agriculture', status: 'not-started', order: 5, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't62', name: 'Types of Farming', completed: false, optional: false }, { id: 't63', name: 'Cropping Pattern', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'soc-7', subjectId: 'social', name: 'Manufacturing Industries', status: 'not-started', order: 6, enabled: true, archived: false, priority: 'low', topics: [{ id: 't64', name: 'Types of Industries', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'soc-8', subjectId: 'social', name: 'Democracy & Diversity', status: 'not-started', order: 7, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't65', name: 'Social Differences', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'soc-9', subjectId: 'social', name: 'Political Parties', status: 'not-started', order: 8, enabled: true, archived: false, priority: 'medium', topics: [{ id: 't66', name: 'Functions', completed: false, optional: false }, { id: 't67', name: 'Types', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'soc-10', subjectId: 'social', name: 'Globalization', status: 'not-started', order: 9, enabled: true, archived: false, priority: 'low', topics: [{ id: 't68', name: 'MNCs', completed: false, optional: false }, { id: 't69', name: 'Impact', completed: false, optional: false }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  const defaultSettings: Settings = {
    id: 'default',
    availableStudyHours: {
      '0': { start: '16:00', end: '21:00' },
      '1': { start: '16:00', end: '21:00' },
      '2': { start: '16:00', end: '21:00' },
      '3': { start: '16:00', end: '21:00' },
      '4': { start: '16:00', end: '21:00' },
      '5': { start: '09:00', end: '21:00' },
      '6': { start: '09:00', end: '21:00' },
    },
    unavailableBlocks: [],
    breakDurationMinutes: 10,
    bufferPercentage: 20,
    revisionIntervals: [1, 3, 7, 14, 30],
    theme: 'dark',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.transaction('rw', db.subjects, db.chapters, db.settings, async () => {
    await db.subjects.bulkAdd(subjects);
    await db.chapters.bulkAdd([...mathsChapters, ...scienceChapters, ...socialChapters]);
    await db.settings.add(defaultSettings);
  });
}

// ============ HELPERS ============

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getWeekDates(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function calculateChapterProgress(chapter: Chapter): number {
  if (!chapter.topics || chapter.topics.length === 0) {
    if (chapter.status === 'completed' || chapter.status === 'revised') return 100;
    if (chapter.status === 'not-started') return 0;
    return 50;
  }
  const enabledTopics = chapter.topics.filter(t => !t.optional);
  if (enabledTopics.length === 0) return 0;
  const completed = enabledTopics.filter(t => t.completed).length;
  return Math.round((completed / enabledTopics.length) * 100);
}

export function getChapterStatusLabel(status: ChapterStatus): string {
  const labels: Record<ChapterStatus, string> = {
    'not-started': 'Not Started',
    'learning': 'Learning',
    'practising': 'Practising',
    'completed': 'Completed',
    'revision-due': 'Revision Due',
    'revised': 'Revised',
  };
  return labels[status];
}

export function getChapterStatusColor(status: ChapterStatus): string {
  const colors: Record<ChapterStatus, string> = {
    'not-started': 'text-slate-400 bg-slate-700/50',
    'learning': 'text-blue-300 bg-blue-900/50',
    'practising': 'text-amber-300 bg-amber-900/50',
    'completed': 'text-emerald-300 bg-emerald-900/50',
    'revision-due': 'text-orange-300 bg-orange-900/50',
    'revised': 'text-purple-300 bg-purple-900/50',
  };
  return colors[status];
}

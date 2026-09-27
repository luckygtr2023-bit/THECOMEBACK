import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './features/Dashboard';
import { Subjects } from './features/Subjects';
import { ChapterDetail } from './features/ChapterDetail';
import { Planner } from './features/Planner';
import { Tasks } from './features/Tasks';
import { Revision } from './features/Revision';
import { Tests } from './features/Tests';
import { Mistakes } from './features/Mistakes';
import { Analytics } from './features/Analytics';
import { Settings } from './features/Settings';
import { seedDatabase } from './database/db';

function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await seedDatabase();
        setReady(true);
      } catch (e) {
        console.error('Failed to initialize database:', e);
        setError('Failed to initialize database. Please try refreshing.');
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
        <div className="text-center">
          <p className="text-xl mb-2">⚠️ Initialization Error</p>
          <p className="text-slate-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-lg text-slate-400">Loading Study OS...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="subjects/:subjectId/chapters/:chapterId" element={<ChapterDetail />} />
          <Route path="planner" element={<Planner />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="revision" element={<Revision />} />
          <Route path="tests" element={<Tests />} />
          <Route path="mistakes" element={<Mistakes />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;

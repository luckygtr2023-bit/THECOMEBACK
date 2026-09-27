import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SCHEMA_VERSION, type BackupData, type Settings } from '../database/db';
import { Download, Upload, Trash2, AlertTriangle, CheckCircle2, Database, Shield } from 'lucide-react';

export function Settings() {
  const settings = useLiveQuery(() => db.settings.get('default'), []);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [studyHours, setStudyHours] = useState<Record<string, { start: string; end: string }>>(
    settings?.availableStudyHours || {
      '0': { start: '16:00', end: '21:00' },
      '1': { start: '16:00', end: '21:00' },
      '2': { start: '16:00', end: '21:00' },
      '3': { start: '16:00', end: '21:00' },
      '4': { start: '16:00', end: '21:00' },
      '5': { start: '09:00', end: '21:00' },
      '6': { start: '09:00', end: '21:00' },
    }
  );
  const [breakDuration, setBreakDuration] = useState(settings?.breakDurationMinutes || 10);
  const [bufferPercent, setBufferPercent] = useState(settings?.bufferPercentage || 20);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleSaveSettings = async () => {
    if (settings) {
      await db.settings.update('default', {
        availableStudyHours: studyHours,
        breakDurationMinutes: breakDuration,
        bufferPercentage: bufferPercent,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const newSettings: Settings = {
        id: 'default',
        availableStudyHours: studyHours,
        unavailableBlocks: [],
        breakDurationMinutes: breakDuration,
        bufferPercentage: bufferPercent,
        revisionIntervals: [1, 3, 7, 14, 30],
        theme: 'dark',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.settings.add(newSettings);
    }
    alert('Settings saved!');
  };

  const handleExport = async () => {
    try {
      const backup: BackupData = {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        appName: 'Class 10 Study OS',
        subjects: await db.subjects.toArray(),
        chapters: await db.chapters.toArray(),
        tasks: await db.tasks.toArray(),
        weekPlans: await db.weekPlans.toArray(),
        revisionItems: await db.revisionItems.toArray(),
        testRecords: await db.testRecords.toArray(),
        mistakes: await db.mistakes.toArray(),
        settings: await db.settings.toArray(),
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-os-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExport(false);
    } catch (e) {
      alert('Export failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;

      // Validate backup structure
      if (!data.schemaVersion || !data.appName || !Array.isArray(data.subjects)) {
        throw new Error('Invalid backup file: missing required fields');
      }

      if (data.schemaVersion > SCHEMA_VERSION) {
        throw new Error(`Backup is from a newer version (v${data.schemaVersion}). Current version is v${SCHEMA_VERSION}.`);
      }

      // Count records
      const recordCount = data.subjects.length + data.chapters.length + data.tasks.length +
        data.revisionItems.length + data.testRecords.length + data.mistakes.length;

      const confirmed = confirm(
        `Import backup from ${data.exportedAt?.split('T')[0] || 'unknown date'}?\n\n` +
        `This will REPLACE all current data:\n` +
        `• ${data.subjects.length} subjects\n` +
        `• ${data.chapters.length} chapters\n` +
        `• ${data.tasks.length} tasks\n` +
        `• ${data.revisionItems.length} revision items\n` +
        `• ${data.testRecords.length} test records\n` +
        `• ${data.mistakes.length} mistakes\n\n` +
        `This cannot be undone. Consider exporting first.`
      );

      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Auto-backup before import
      const autoBackup: BackupData = {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        appName: 'Class 10 Study OS',
        subjects: await db.subjects.toArray(),
        chapters: await db.chapters.toArray(),
        tasks: await db.tasks.toArray(),
        weekPlans: await db.weekPlans.toArray(),
        revisionItems: await db.revisionItems.toArray(),
        testRecords: await db.testRecords.toArray(),
        mistakes: await db.mistakes.toArray(),
        settings: await db.settings.toArray(),
      };
      const autoBlob = new Blob([JSON.stringify(autoBackup, null, 2)], { type: 'application/json' });
      const autoUrl = URL.createObjectURL(autoBlob);
      const autoA = document.createElement('a');
      autoA.href = autoUrl;
      autoA.download = `study-os-auto-backup-before-import-${new Date().toISOString().split('T')[0]}.json`;
      autoA.click();
      URL.revokeObjectURL(autoUrl);

      // Perform import
      const allTables = [db.subjects, db.chapters, db.tasks, db.weekPlans,
        db.revisionItems, db.testRecords, db.mistakes, db.settings];
      await db.transaction('rw', allTables, async () => {
        await db.subjects.clear();
        await db.chapters.clear();
        await db.tasks.clear();
        await db.weekPlans.clear();
        await db.revisionItems.clear();
        await db.testRecords.clear();
        await db.mistakes.clear();
        await db.settings.clear();

        if (data.subjects.length > 0) await db.subjects.bulkAdd(data.subjects);
        if (data.chapters.length > 0) await db.chapters.bulkAdd(data.chapters);
        if (data.tasks.length > 0) await db.tasks.bulkAdd(data.tasks);
        if (data.weekPlans.length > 0) await db.weekPlans.bulkAdd(data.weekPlans);
        if (data.revisionItems.length > 0) await db.revisionItems.bulkAdd(data.revisionItems);
        if (data.testRecords.length > 0) await db.testRecords.bulkAdd(data.testRecords);
        if (data.mistakes.length > 0) await db.mistakes.bulkAdd(data.mistakes);
        if (data.settings.length > 0) await db.settings.bulkAdd(data.settings);
      });

      setImportStatus({ type: 'success', message: `Successfully imported ${recordCount} records. An auto-backup was saved before import.` });
      setShowImport(false);
    } catch (e) {
      setImportStatus({ type: 'error', message: e instanceof Error ? e.message : 'Import failed' });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAll = async () => {
    const allTables = [db.subjects, db.chapters, db.tasks, db.weekPlans,
      db.revisionItems, db.testRecords, db.mistakes, db.settings];
    await db.transaction('rw', allTables, async () => {
      await db.subjects.clear();
      await db.chapters.clear();
      await db.tasks.clear();
      await db.weekPlans.clear();
      await db.revisionItems.clear();
      await db.testRecords.clear();
      await db.mistakes.clear();
      await db.settings.clear();
    });
    setShowClearConfirm(false);
    window.location.reload();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Configure your study preferences and manage data</p>
      </div>

      {/* Import Status */}
      {importStatus && (
        <div className={`rounded-xl p-4 border ${
          importStatus.type === 'success' ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-rose-900/20 border-rose-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {importStatus.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-rose-400" />}
            <p className={`text-sm ${importStatus.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {importStatus.message}
            </p>
          </div>
          <button onClick={() => setImportStatus(null)} className="text-xs text-slate-400 mt-2 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Study Hours Configuration */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Database size={18} className="text-indigo-400" /> Study Schedule
        </h2>
        <p className="text-xs text-slate-500 mb-4">Set your available study hours for each day. The planner will respect these limits.</p>
        <div className="space-y-2">
          {Object.entries(studyHours).map(([day, hours]) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-24 text-sm text-slate-400">{dayNames[parseInt(day)]}</span>
              <input
                type="time"
                value={hours.start}
                onChange={e => setStudyHours({ ...studyHours, [day]: { ...hours, start: e.target.value } })}
                className="px-2 py-1.5 bg-slate-700 rounded text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-slate-500">to</span>
              <input
                type="time"
                value={hours.end}
                onChange={e => setStudyHours({ ...studyHours, [day]: { ...hours, end: e.target.value } })}
                className="px-2 py-1.5 bg-slate-700 rounded text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400">Break duration (minutes)</label>
            <input
              type="number"
              value={breakDuration}
              onChange={e => setBreakDuration(Number(e.target.value))}
              min={5}
              max={30}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Buffer time (%)</label>
            <input
              type="number"
              value={bufferPercent}
              onChange={e => setBufferPercent(Number(e.target.value))}
              min={0}
              max={50}
              className="w-full px-3 py-2 bg-slate-700 rounded-lg text-sm border border-slate-600 focus:border-indigo-500 focus:outline-none mt-1"
            />
          </div>
        </div>
        <button
          onClick={handleSaveSettings}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          Save Settings
        </button>
      </div>

      {/* Backup & Restore */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Shield size={18} className="text-emerald-400" /> Backup & Restore
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Your data is stored locally in your browser. Export backups regularly to prevent data loss.
          Browser storage can be cleared by the browser or system — backups are your safety net.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} /> Export Backup
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Upload size={16} /> Import Backup
          </button>
        </div>

        {/* Export Confirmation */}
        {showExport && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/30">
            <p className="text-sm text-emerald-300 mb-3">Export all your data as a JSON file?</p>
            <div className="flex gap-2">
              <button onClick={handleExport} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium">
                Yes, Export
              </button>
              <button onClick={() => setShowExport(false)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Import */}
        {showImport && (
          <div className="mt-4 p-3 rounded-lg bg-indigo-900/20 border border-indigo-500/30">
            <p className="text-sm text-indigo-300 mb-3">
              Select a backup file to import. This will replace all current data.
              An automatic backup will be created before importing.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="text-sm text-slate-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:text-xs file:font-medium file:cursor-pointer hover:file:bg-indigo-500"
            />
            <button onClick={() => setShowImport(false)} className="ml-3 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="glass-card rounded-xl p-5 border border-rose-500/20">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-rose-400">
          <AlertTriangle size={18} /> Danger Zone
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Clearing all data cannot be undone. Export a backup first if you want to keep your data.
        </p>
        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg text-sm text-rose-300 font-medium transition-colors"
          >
            <Trash2 size={16} /> Clear All Data
          </button>
        ) : (
          <div className="p-3 rounded-lg bg-rose-900/20 border border-rose-500/30">
            <p className="text-sm text-rose-300 mb-3">⚠️ This will permanently delete ALL your data. Are you sure?</p>
            <div className="flex gap-2">
              <button onClick={handleClearAll} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-medium">
                Yes, Delete Everything
              </button>
              <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* About */}
      <div className="glass-card rounded-xl p-5">
        <h2 className="font-semibold text-lg mb-3">About</h2>
        <div className="space-y-2 text-sm text-slate-400">
          <p><strong className="text-slate-300">Class 10 Study OS</strong> — v1.0.0</p>
          <p>A free, offline-capable study management app for Class 10 students.</p>
          <p className="text-xs">• All data stored locally in your browser (IndexedDB)</p>
          <p className="text-xs">• No account, no cloud, no tracking</p>
          <p className="text-xs">• Works offline after first load</p>
          <p className="text-xs">• Export backups to protect against data loss</p>
          <p className="text-xs mt-2 text-slate-500">
            Note: The starter syllabus is editable and may not reflect the latest official curriculum.
            Always verify with your school/board.
          </p>
        </div>
      </div>
    </div>
  );
}

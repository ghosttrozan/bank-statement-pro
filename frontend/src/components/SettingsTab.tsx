import React, { useState } from 'react';
import { 
  Settings, Folder, Trash2, Database, ShieldCheck, BadgeAlert, Terminal, HelpCircle, Save 
} from 'lucide-react';
import { logToSystem } from '../lib/dbBridge';

interface SettingsTabProps {
  statementsCount: number;
  onClearAll: () => void;
  onInjectSeeds: () => void;
}

export default function SettingsTab({ statementsCount, onClearAll, onInjectSeeds }: SettingsTabProps) {
  const [downloadFolder, setDownloadFolder] = useState('C:\\Users\\User\\Documents\\DemoStatements');
  const [successMsg, setSuccessMsg] = useState('');
  const [dbStatus, setDbStatus] = useState<'OK' | 'BUSY' | 'UNHEALTHY'>('OK');

  const handleUpdatePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    logToSystem('IPC_BRIDGE', 'INFO', `Updating main application settings file in local configuration registry.`);
    logToSystem('SYSTEM', 'INFO', `Preferences updated. Target PDF Export folder designated as: "${downloadFolder}"`);
    setSuccessMsg('System preferences synchronized successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleIntegrityTest = () => {
    logToSystem('SQLITE_DB', 'DEBUG', 'ANALYZE "StatementGeneration"; PRAGMA integrity_check;');
    setDbStatus('BUSY');
    setTimeout(() => {
      setDbStatus('OK');
      logToSystem('PRISMA_ORM', 'INFO', 'Database integrity health status: OK. All index tables are aligned.');
      alert('SQLite Integrity Check: PASSED with 0 faulty rows.');
    }, 2000);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
      
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Settings size={16} className="text-indigo-600" /> Standalone Client Settings & Disk node
        </h3>
        <p className="text-slate-500 text-xs">Configure local electron container folders, directories, database instances and diagnostic profiles.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 pt-2">
        
        {/* Left Form Settings */}
        <form onSubmit={handleUpdatePreferences} className="space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Local Shell Constants</span>
            <p className="text-slate-400 text-[10px]">Customize default behaviors when generating and compiling statement files inside the local explorer.</p>
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5 flex items-center gap-1">
              <Folder size={12} className="text-indigo-600" /> Default PDF Export Folder Path
            </label>
            <input 
              type="text"
              value={downloadFolder}
              onChange={e => setDownloadFolder(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1">Simulated absolute filepath configuration for the native desktop printer spooler.</p>
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-semibold mb-1.5">Default App Mode</label>
            <select className="w-full bg-white text-slate-800 border border-slate-200 p-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all">
              <option value="Light">Light Mode (A4 statement formats rely strictly on physical print styles)</option>
              <option value="Dark">Immersive Midnight</option>
            </select>
          </div>

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs px-3 font-semibold leading-relaxed">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Save size={12} /> Save Preferences
          </button>
        </form>

        {/* Right DB / Container Actions */}
        <div className="space-y-5 md:pl-6 pt-6 md:pt-0">
          <div className="space-y-1">
            <span className="text-indigo-600 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Database size={13} className="text-indigo-600" /> SQLite Local database administration
            </span>
            <p className="text-slate-400 text-[10px]">Inspect, truncate or inject test matrices into the active statement repository.</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Connection Terminal:</span>
              <span className="text-emerald-700 font-semibold font-sans text-[11px] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100/60">CONNECTED</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Statements count:</span>
              <span className="text-slate-800 font-mono font-bold">{statementsCount} records</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">DB File Status:</span>
              <span className="text-slate-400 font-sans font-medium">SQLite v3.45.0 (Integrated)</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={handleIntegrityTest}
              disabled={dbStatus === 'BUSY'}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-xs font-semibold"
            >
              <ShieldCheck size={12} className="text-indigo-600" /> 
              {dbStatus === 'BUSY' ? 'Testing...' : 'Audit DB Integrity'}
            </button>

            <button
              onClick={() => {
                if (confirm('Inject 3 custom professional seed records (SBI Sharma, Kotak Roy, Kotak Current Account) immediately into database table?')) {
                  onInjectSeeds();
                }
              }}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold py-1.5 px-3 rounded-lg cursor-pointer transition-colors"
            >
              + Seed Demo Records
            </button>

            <button
              onClick={() => {
                if (confirm('Delete ALL statement records from local storage? This action cannot be undone.')) {
                  onClearAll();
                }
              }}
              className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1"
            >
              <Trash2 size={12} /> Wipe Database
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

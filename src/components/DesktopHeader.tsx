import React, { useState, useEffect } from 'react';
import { Terminal, Database, Shield, Monitor, RefreshCw, Cpu, HardDrive } from 'lucide-react';
import { logToSystem } from '../lib/dbBridge';

interface DesktopHeaderProps {
  onResetDb: () => void;
  activeCount: number;
}

export default function DesktopHeader({ onResetDb, activeCount }: DesktopHeaderProps) {
  const [cpuUsage, setCpuUsage] = useState<number>(1.4);
  const [ramUsage, setRamUsage] = useState<number>(42);
  const [dbPing, setDbPing] = useState<number>(1);

  // Simulate minimal background OS telemetry fluctuations
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuUsage(prev => Math.max(0.5, Math.min(25, +(prev + (Math.random() * 2 - 1)).toFixed(1))));
      setRamUsage(prev => Math.max(30, Math.min(65, +(prev + (Math.random() * 0.4 - 0.2)).toFixed(1))));
      setDbPing(prev => Math.max(1, Math.min(3, Math.floor(Math.random() * 3 + 1))));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleManualReconnect = () => {
    logToSystem('IPC_BRIDGE', 'INFO', 'Manual SQLite Container Ping requested.');
    logToSystem('SQLITE_DB', 'DEBUG', 'PRAGMA integrity_check; SELECT count(*) FROM "StatementGeneration";');
    setDbPing(1);
    setTimeout(() => {
      logToSystem('PRISMA_ORM', 'INFO', `Local DB Connection verified. Serving ${activeCount} local records successfully.`);
    }, 4500);
  };

  return (
    <div className="bg-white text-slate-700 px-6 py-3 flex items-center justify-between border-b border-slate-200 select-none text-xs font-sans">
      {/* Brand Icon & Platform Status */}
      <div className="flex items-center space-x-3">
        <div className="flex space-x-1.5 items-center mr-2">
          <div className="w-3 h-3 rounded-full bg-rose-400 hover:scale-105 transition-transform" title="Close" />
          <div className="w-3 h-3 rounded-full bg-amber-400 hover:scale-105 transition-transform" title="Minimize" />
          <div className="w-3 h-3 rounded-full bg-emerald-400 hover:scale-105 transition-transform" title="Maximize" />
        </div>
        <div className="flex items-center space-x-1.5 font-bold text-slate-800">
          <Database size={14} className="text-indigo-600 animate-pulse" />
          <span className="font-mono tracking-wider">STATEMENT_LABS_v3.4_WIN64</span>
        </div>
        <span className="text-slate-200 font-mono">|</span>
        <div className="flex items-center space-x-1 bg-emerald-50 px-2.5 py-1 rounded text-emerald-700 font-sans font-bold border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1" />
          <span>SQLITE_ONLINE</span>
        </div>
      </div>

      {/* Center Simulated Native Operations Menubar */}
      <div className="hidden lg:flex items-center space-x-4 text-slate-500">
        <button onClick={handleManualReconnect} className="hover:text-indigo-600 font-semibold transition-colors flex items-center space-x-1">
          <RefreshCw size={11} />
          <span>Ping Engine</span>
        </button>
        <span className="text-slate-200">/</span>
        <button onClick={onResetDb} className="hover:text-rose-600 font-semibold transition-colors flex items-center space-x-1">
          <Shield size={11} />
          <span>Wipe SQLite SQLite-Store</span>
        </button>
        <span className="text-slate-200">/</span>
        <div className="flex items-center space-x-1 text-slate-400 font-medium">
          <Monitor size={11} />
          <span>Secure Sandbox Environment</span>
        </div>
      </div>

      {/* Right Hardware Diagnostics Stream */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 font-sans font-medium text-emerald-600" title="Simulated Client Sandbox CPU usage">
          <Cpu size={12} />
          <span>CPU:</span>
          <span className="font-mono font-semibold">{cpuUsage}%</span>
        </div>
        
        <div className="flex items-center space-x-1.5 font-sans font-medium text-amber-600" title="Simulated RAM allocated for statement assembly state buffers">
          <HardDrive size={12} />
          <span>RAM:</span>
          <span className="font-mono font-semibold">{ramUsage} MB</span>
        </div>

        <div className="flex items-center space-x-1 font-sans font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100" title="Database query turnaround latency">
          <span>LATENCY:</span>
          <span className="font-mono">{dbPing}ms</span>
        </div>
      </div>
    </div>
  );
}

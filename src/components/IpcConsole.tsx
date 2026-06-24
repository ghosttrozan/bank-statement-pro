import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, BadgeCheck, FileCode, AlertCircle, X, ChevronsUpDown, Trash2, Search, CornerDownRight } from 'lucide-react';
import { SystemLog } from '../types';
import { addLogListener, removeLogListener } from '../lib/dbBridge';

export default function IpcConsole() {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Load initial logs on mount
  useEffect(() => {
    const existing = sessionStorage.getItem('system_logs');
    if (existing) {
      setLogs(JSON.parse(existing));
    }
    
    // Listen to real-time logs
    const handleLog = (newLog: SystemLog) => {
      setLogs(prev => {
        const next = [...prev, newLog];
        return next.slice(-100); // cap at last 100
      });
    };
    
    addLogListener(handleLog);
    return () => removeLogListener(handleLog);
  }, []);

  // Auto-scroll terminal to bottom when new logs stream in
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const clearConsole = () => {
    setLogs([]);
    sessionStorage.removeItem('system_logs');
  };

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.level.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`border-t border-slate-200 transition-all bg-slate-950 text-xs font-mono select-text divide-y divide-slate-800 ${isOpen ? 'h-64' : 'h-8'}`}>
      
      {/* Console Dock Header Controls */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 text-slate-300 select-none">
        <div className="flex items-center space-x-2">
          <Terminal size={14} className="text-emerald-400 font-extrabold animate-pulse" />
          <span className="font-bold text-white tracking-wide text-[11px] uppercase">Local System Console</span>
          <span className="bg-indigo-900/50 text-indigo-200 border border-indigo-800 font-mono px-2 py-0.5 rounded-lg text-[9px] font-bold">
            {filteredLogs.length} TRACES
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Quick Search */}
          {isOpen && (
            <div className="relative flex items-center">
              <Search size={11} className="absolute left-2.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search trace ledger..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-slate-950 text-slate-100 py-0.5 pl-7 pr-2 rounded-lg text-[10px] w-48 border border-slate-800 focus:outline-none focus:border-indigo-500 transition-all font-sans placeholder-slate-600"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <button 
              onClick={clearConsole} 
              title="Clear Local Console Rows"
              className="p-1 hover:bg-slate-800 text-rose-400 hover:text-rose-300 rounded transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              title="Collapse Console Panel"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer"
            >
              <ChevronsUpDown size={13} className="rotate-90" />
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Rows Area */}
      {isOpen && (
        <div className="h-56 overflow-y-auto p-4 space-y-1.5 bg-slate-950 text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* Default boot sequence lines for ultra authentic sandbox console feel */}
          <div className="text-slate-500 border-b border-slate-900 pb-1.5 mb-2 flex items-center space-x-2">
            <BadgeCheck size={12} className="text-emerald-400" />
            <span>[SYSTEM] Secure Environment initialized at {new Date().toLocaleDateString()}</span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 p-2 italic flex items-center space-x-2">
              <AlertCircle size={12} className="text-slate-500" />
              <span>Diagnostic buffer empty. Trigger a statement generation or database change to stream system logs in real-time.</span>
            </div>
          ) : (
            filteredLogs.map(log => {
              // Level Styling color
              let color = 'text-slate-200';
              if (log.level === 'WARN') color = 'text-amber-300 font-semibold';
              if (log.level === 'ERROR') color = 'text-rose-400 font-bold';
              if (log.level === 'DEBUG') color = 'text-indigo-300';
 
              // Channel Badge Styling
              let channelBadge = 'bg-slate-800 text-slate-300 border border-slate-700';
              if (log.channel === 'PRISMA_ORM') channelBadge = 'bg-indigo-950/80 text-indigo-300 border border-indigo-900';
              if (log.channel === 'SQLITE_DB') channelBadge = 'bg-emerald-950/80 text-emerald-300 border border-emerald-900';
              if (log.channel === 'IPC_BRIDGE') channelBadge = 'bg-pink-950/80 text-pink-300 border border-pink-900';

              return (
                <div key={log.id} className="flex items-start space-x-2 hover:bg-slate-900/60 p-0.5 rounded transition-colors group">
                  <span className="text-slate-600 select-none text-[10px] whitespace-nowrap mt-0.5">[{log.timestamp}]</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono select-none ${channelBadge}`}>
                    {log.channel}
                  </span>
                  <span className={`font-mono font-bold select-none text-[10px] w-10 ${color}`}>
                    [{log.level}]
                  </span>
                  <div className="flex-1 flex items-start space-x-1">
                    <CornerDownRight size={10} className="text-slate-600 mt-1 flex-shrink-0" />
                    <span className="text-slate-100 break-all leading-normal text-[11px] selection:bg-slate-800">
                      {log.message}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={consoleBottomRef} />
        </div>
      )}

    </div>
  );
}

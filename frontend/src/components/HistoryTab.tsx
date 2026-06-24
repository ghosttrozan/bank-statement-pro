import React, { useState } from 'react';
import { 
  Search, Eye, Copy, Trash2, Calendar, FileText, IndianRupee, Landmark, ShieldAlert, ArrowUpDown, ChevronRight, HardDriveDownload
} from 'lucide-react';
import { StatementRecord } from '../types';
import { deleteStatementFromLocal, logToSystem } from '../lib/dbBridge';

interface HistoryTabProps {
  statements: StatementRecord[];
  onSelect: (record: StatementRecord) => void;
  onDeleteRecord: (id: string) => void;
  onDuplicateRecord: (record: StatementRecord) => void;
}

type SortField = 'createdAt' | 'holderName' | 'closingBalance' | 'transactionsCount';

export default function HistoryTab({ statements, onSelect, onDeleteRecord, onDuplicateRecord }: HistoryTabProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter
  const filtered = statements.filter(stmt => {
    const term = search.toLowerCase();
    return (
      stmt.customerDetails.accountHolderName.toLowerCase().includes(term) ||
      stmt.customerDetails.accountNumber.includes(term) ||
      stmt.settings.bankStyle.toLowerCase().includes(term) ||
      stmt.branchDetails.branchName.toLowerCase().includes(term)
    );
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal: any = 0;
    let bVal: any = 0;

    if (sortField === 'createdAt') {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    } else if (sortField === 'holderName') {
      aVal = a.customerDetails.accountHolderName;
      bVal = b.customerDetails.accountHolderName;
    } else if (sortField === 'closingBalance') {
      aVal = a.closingBalance;
      bVal = b.closingBalance;
    } else if (sortField === 'transactionsCount') {
      aVal = a.transactions.length;
      bVal = b.transactions.length;
    }

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
      
      {/* Search and control filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-indigo-600" /> Historical Statement ledger logs
          </h3>
          <p className="text-slate-500 text-xs">Simulated Electron SQLite file system cache list. Search, load or manage records.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search holder name, ACC #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white text-slate-900 border border-slate-200 py-2.5 pl-10 pr-4 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
          />
        </div>
      </div>

      {statements.length === 0 ? (
        <div className="border border-dashed border-slate-200 p-12 text-center rounded-xl bg-slate-50 text-slate-400">
          <HardDriveDownload size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-semibold text-slate-600">No saved statement profiles detected in current sandboxed database.</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Fill out the generator wizard and hit "Assemble" to insert logs.</span>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center p-8 text-slate-400 font-sans text-xs">
          No records matching "{search}" filter query.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-200">
            <thead className="bg-slate-50 font-sans text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3.5 select-none cursor-pointer hover:bg-slate-100 text-slate-700" onClick={() => toggleSort('holderName')}>
                  <span className="flex items-center gap-1">Account Holder <ArrowUpDown size={11} /></span>
                </th>
                <th className="p-3.5 select-none cursor-pointer hover:bg-slate-100 text-slate-700" onClick={() => toggleSort('createdAt')}>
                  <span className="flex items-center gap-1">Created Epoch <ArrowUpDown size={11} /></span>
                </th>
                <th className="p-3.5 text-slate-700">Details</th>
                <th className="p-3.5 select-none cursor-pointer hover:bg-slate-100 text-slate-700" onClick={() => toggleSort('transactionsCount')}>
                  <span className="flex items-center gap-1">Records <ArrowUpDown size={11} /></span>
                </th>
                <th className="p-3.5 select-none cursor-pointer hover:bg-slate-100 text-slate-700" onClick={() => toggleSort('closingBalance')}>
                  <span className="flex items-center gap-1">Terminal Balance <ArrowUpDown size={11} /></span>
                </th>
                <th className="p-3.5 text-right text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sorted.map(stmt => {
                const date = new Date(stmt.createdAt);
                const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                
                return (
                  <tr key={stmt.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="p-3.5 font-sans font-bold text-slate-900">
                      <div>{stmt.customerDetails.accountHolderName}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">ACC: {stmt.customerDetails.accountNumber}</div>
                    </td>
                    <td className="p-3.5 font-sans text-[11px] text-indigo-600 font-medium">
                      <div>{formattedDate}</div>
                      <div className="text-[9px] text-slate-400 font-mono font-normal">{stmt.id}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                          stmt.settings.bankStyle === 'SBI' ? 'bg-sky-50 text-sky-700 border border-sky-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {stmt.settings.bankStyle} Style
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">({stmt.settings.duration})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-sans">{stmt.branchDetails.branchName}</div>
                    </td>
                    <td className="p-3.5 font-mono text-indigo-600 font-bold">
                      {stmt.transactions.length} rows
                    </td>
                    <td className="p-3.5 font-mono text-emerald-600 font-bold text-sm">
                      ₹{stmt.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            logToSystem('IPC_BRIDGE', 'INFO', `Triggering layout canvas swap with index record "${stmt.id}"`);
                            onSelect(stmt);
                          }}
                          className="bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 hover:border-indigo-600 text-indigo-700 hover:text-white font-semibold py-1.5 px-3 rounded-lg text-[11px] duration-150 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          title="Generate printable dynamic view and analysis sheet"
                        >
                          <Eye size={12} /> Live View
                        </button>
                        
                        <button
                          onClick={() => {
                            logToSystem('PRISMA_ORM', 'INFO', `Duplicating statement record ledger schema. Inserting cloned payload.`);
                            onDuplicateRecord(stmt);
                          }}
                          className="bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Duplicate record to create safe sandbox variants"
                        >
                          <Copy size={12} />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Permanently erase statement record for ${stmt.customerDetails.accountHolderName} from SQLite container?`)) {
                              onDeleteRecord(stmt.id);
                            }
                          }}
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Delete statement from local machine database"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

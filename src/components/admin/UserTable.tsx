import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  Search, Filter, Edit, Ban, CheckCircle, Trash2, RefreshCw,
  Key, Eye, Crown, ChevronLeft, ChevronRight, Download, UserPlus
} from 'lucide-react';

interface UserTableProps {
  users: any[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  onFilterRole: (role: string) => void;
  onFilterStatus: (status: string) => void;
  onEdit: (user: any) => void;
  onBan: (user: any) => void;
  onUnban: (user: any) => void;
  onDelete: (user: any) => void;
  onForceLogout: (user: any) => void;
  onResetPassword: (user: any) => void;
  onViewDetail: (user: any) => void;
  onImpersonate?: (user: any) => void;
  onBulkBan: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkForceLogout: (ids: string[]) => void;
  onExportCSV: () => void;
  onCreateUser: () => void;
  showAdmins?: boolean;
}

export default function UserTable({
  users, total, page, pages, loading,
  onPageChange, onSearch, onFilterRole, onFilterStatus,
  onEdit, onBan, onUnban, onDelete, onForceLogout, onResetPassword,
  onViewDetail, onImpersonate, onBulkBan, onBulkDelete, onBulkForceLogout,
  onExportCSV, onCreateUser, showAdmins
}: UserTableProps) {
  const { user: currentUser } = useAuth();
  const isSuper = currentUser?.role === 'SUPER_ADMIN';

  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selected.length === users.length) setSelected([]);
    else setSelected(users.map(u => u._id));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  const planColors: Record<string, string> = {
    FREE: 'text-slate-400 bg-slate-800',
    BASIC: 'text-blue-400 bg-blue-500/10',
    PRO: 'text-purple-400 bg-purple-500/10',
    ENTERPRISE: 'text-amber-400 bg-amber-500/10',
  };

  return (
    <div className="space-y-4 select-none">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search name, username, phone..."
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs pl-9 pr-4 py-2.5 rounded-xl w-64 focus:outline-none focus:border-indigo-500 placeholder-slate-600 font-medium"
            />
          </div>

          {/* Role Filter */}
          {isSuper && !showAdmins && (
            <select
              onChange={e => onFilterRole(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-350 text-xs px-3 py-2.5 rounded-xl cursor-pointer focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          )}

          {/* Status Filter */}
          <select
            onChange={e => onFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-350 text-xs px-3 py-2.5 rounded-xl cursor-pointer focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onCreateUser}
            className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold px-3 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-indigo-900/10 cursor-pointer"
          >
            <UserPlus size={13} /> Add User
          </button>
          {isSuper && (
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-bold px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-800/50 px-4 py-3 rounded-xl flex items-center gap-4 text-xs">
          <span className="font-bold text-indigo-300">{selected.length} selected</span>
          <div className="flex gap-2">
            <button onClick={() => { onBulkBan(selected); setSelected([]); }}
              className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 font-bold px-3 py-1.5 rounded-lg cursor-pointer">
              Bulk Ban
            </button>
            <button onClick={() => { onBulkForceLogout(selected); setSelected([]); }}
              className="bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/20 font-bold px-3 py-1.5 rounded-lg cursor-pointer">
              Bulk Force Logout
            </button>
            <button onClick={() => { onBulkDelete(selected); setSelected([]); }}
              className="bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-bold px-3 py-1.5 rounded-lg cursor-pointer">
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3.5 w-10">
                  <input type="checkbox" checked={selected.length === users.length && users.length > 0}
                    onChange={toggleSelectAll} className="accent-indigo-500 cursor-pointer" />
                </th>
                <th className="p-3.5 text-left">User</th>
                <th className="p-3.5 text-left">Role</th>
                <th className="p-3.5 text-left">Status</th>
                <th className="p-3.5 text-left">Plan</th>
                <th className="p-3.5 text-right">Statements</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-slate-500 italic">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-slate-500 italic">No users found.</td></tr>
              ) : users.map(u => {
                const isSuperProtected = u.role === 'SUPER_ADMIN';
                return (
                  <tr key={u._id} className={`hover:bg-slate-800/30 transition-colors ${selected.includes(u._id) ? 'bg-indigo-950/20' : ''}`}>
                    <td className="p-3.5">
                      <input type="checkbox" checked={selected.includes(u._id)} disabled={isSuperProtected}
                        onChange={() => toggleSelect(u._id)} className="accent-indigo-500 cursor-pointer disabled:opacity-30" />
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        {isSuperProtected && <Crown size={12} className="text-amber-400 shrink-0" />}
                        <div>
                          <span className="font-bold text-slate-200 block">{u.fullName}</span>
                          <span className="text-slate-500 font-mono">@{u.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-black uppercase text-[9px] tracking-wider ${
                        u.role === 'SUPER_ADMIN' ? 'bg-amber-500/10 text-amber-400' :
                        u.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400' :
                        'bg-slate-800 text-slate-400'}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {u.isBanned ? (
                        <span className="px-2 py-0.5 rounded-md font-black uppercase text-[9px] tracking-wider bg-rose-500/10 text-rose-400">Banned</span>
                      ) : u.isDeleted ? (
                        <span className="px-2 py-0.5 rounded-md font-black uppercase text-[9px] tracking-wider bg-slate-800 text-slate-500">Deleted</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md font-black uppercase text-[9px] tracking-wider bg-emerald-500/10 text-emerald-400">Active</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase ${planColors[u.subscription?.plan] || 'bg-slate-800 text-slate-400'}`}>
                        {u.subscription?.plan || 'FREE'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-indigo-300">
                      {u.totalStatementsGenerated ?? 0}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onViewDetail(u)} title="View Details"
                          className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                          <Eye size={14} />
                        </button>
                        {!isSuperProtected && (
                          <>
                            <button onClick={() => onEdit(u)} title="Edit"
                              className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                              <Edit size={14} />
                            </button>
                            {u.isBanned ? (
                              <button onClick={() => onUnban(u)} title="Unban"
                                className="p-1.5 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer">
                                <CheckCircle size={14} />
                              </button>
                            ) : (
                              <button onClick={() => onBan(u)} title="Ban"
                                className="p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer">
                                <Ban size={14} />
                              </button>
                            )}
                            <button onClick={() => onForceLogout(u)} title="Force Logout"
                              className="p-1.5 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer">
                              <RefreshCw size={14} />
                            </button>
                            <button onClick={() => onResetPassword(u)} title="Reset Password"
                              className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                              <Key size={14} />
                            </button>
                            <button onClick={() => onDelete(u)} title="Delete"
                              className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                              <Trash2 size={14} />
                            </button>
                            {isSuper && onImpersonate && (
                              <button onClick={() => onImpersonate(u)} title="Impersonate"
                                className="p-1.5 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors cursor-pointer">
                                <Crown size={14} />
                              </button>
                            )}
                          </>
                        )}
                        {isSuperProtected && (
                          <span className="text-[9px] text-amber-500/60 font-bold uppercase tracking-wider px-2">Protected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="border-t border-slate-800 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">
              {total} total • Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 cursor-pointer">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => onPageChange(page + 1)} disabled={page === pages}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 cursor-pointer">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

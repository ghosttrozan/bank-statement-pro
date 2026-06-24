import React, { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import UserTable from '../../components/admin/UserTable';
import UserFormModal from '../../components/admin/UserFormModal';
import UserDetailDrawer from '../../components/admin/UserDetailDrawer';
import { ShieldCheck } from 'lucide-react';

export default function AdminsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [drawerUser, setDrawerUser] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [modalError, setModalError] = useState('');
  const [confirmMsg, setConfirmMsg] = useState('');

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10, role: 'ADMIN' };
      if (search) params.search = search;
      if (statusFilter === 'banned') params.isBanned = 'true';
      const res = await api.get('/api/users', { params });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch {} finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleCreateAdmin = async (data: any) => {
    try {
      await api.post('/api/users', { ...data, role: 'ADMIN' });
      setModalOpen(false);
      setConfirmMsg('Admin created successfully.');
      fetchAdmins();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to create admin.');
    }
  };

  const handleEditAdmin = async (data: any) => {
    try {
      await api.patch(`/api/users/${selectedUser._id}`, data);
      setModalOpen(false);
      setSelectedUser(null);
      setConfirmMsg('Admin updated.');
      fetchAdmins();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to update admin.');
    }
  };

  const handleBan = async (u: any) => {
    const reason = prompt(`Ban reason for @${u.username}:`);
    if (reason === null) return;
    try {
      await api.post(`/api/users/${u._id}/ban`, { reason });
      setConfirmMsg(`@${u.username} banned.`);
      fetchAdmins();
    } catch (err: any) { setConfirmMsg(err?.response?.data?.message || 'Ban failed.'); }
  };

  const handleUnban = async (u: any) => {
    try { await api.post(`/api/users/${u._id}/unban`); setConfirmMsg(`@${u.username} unbanned.`); fetchAdmins(); } catch {}
  };

  const handleDelete = async (u: any) => {
    if (!window.confirm(`Delete admin @${u.username}?`)) return;
    try { await api.delete(`/api/users/${u._id}`); setConfirmMsg(`@${u.username} deleted.`); fetchAdmins(); } catch (err: any) {
      setConfirmMsg(err?.response?.data?.message || 'Delete failed.');
    }
  };

  const handleForceLogout = async (u: any) => {
    if (!window.confirm(`Force logout @${u.username}?`)) return;
    try { await api.post(`/api/users/${u._id}/force-logout`); setConfirmMsg(`@${u.username} force-logged out.`); } catch {}
  };

  const handleResetPassword = async (u: any) => {
    const pwd = prompt(`New password for @${u.username} (min 8 chars):`);
    if (!pwd || pwd.length < 8) return;
    try { await api.post(`/api/users/${u._id}/reset-password`, { newPassword: pwd }); setConfirmMsg(`Password reset for @${u.username}.`); } catch {}
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/users/export/csv', { params: { role: 'ADMIN' }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `admins-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <ShieldCheck size={20} className="text-indigo-400" />
          <h1 className="text-xl font-black text-slate-100">Admins</h1>
        </div>
        <p className="text-xs text-slate-500 font-medium">Manage admin accounts — only accessible by Super Admin.</p>
      </div>

      {confirmMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-xs font-medium flex justify-between items-center">
          {confirmMsg}
          <button onClick={() => setConfirmMsg('')} className="ml-4 font-bold cursor-pointer">×</button>
        </div>
      )}

      <UserTable
        users={users}
        total={total}
        page={page}
        pages={pages}
        loading={loading}
        onPageChange={setPage}
        onSearch={q => { setSearch(q); setPage(1); }}
        onFilterRole={() => {}}
        onFilterStatus={s => { setStatusFilter(s); setPage(1); }}
        onEdit={u => { setSelectedUser(u); setEditMode(true); setModalError(''); setModalOpen(true); }}
        onBan={handleBan}
        onUnban={handleUnban}
        onDelete={handleDelete}
        onForceLogout={handleForceLogout}
        onResetPassword={handleResetPassword}
        onViewDetail={setDrawerUser}
        onBulkBan={async () => {}}
        onBulkDelete={async () => {}}
        onBulkForceLogout={async () => {}}
        onExportCSV={handleExportCSV}
        onCreateUser={() => { setSelectedUser(null); setEditMode(false); setModalError(''); setModalOpen(true); }}
        showAdmins={true}
      />

      {modalOpen && (
        <UserFormModal
          mode={editMode ? 'edit' : 'create'}
          initialData={editMode ? selectedUser : undefined}
          roleContext="super_admin"
          error={modalError}
          onSubmit={editMode ? handleEditAdmin : handleCreateAdmin}
          onClose={() => { setModalOpen(false); setSelectedUser(null); setModalError(''); }}
        />
      )}

      <UserDetailDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />
    </div>
  );
}

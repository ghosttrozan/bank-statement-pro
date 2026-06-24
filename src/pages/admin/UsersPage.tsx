import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import UserTable from '../../components/admin/UserTable';
import UserFormModal from '../../components/admin/UserFormModal';
import UserDetailDrawer from '../../components/admin/UserDetailDrawer';
import { Users } from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('USER');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [drawerUser, setDrawerUser] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [modalError, setModalError] = useState('');
  const [confirmMsg, setConfirmMsg] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter === 'banned') params.isBanned = 'true';
      const res = await api.get('/api/users', { params });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch {} finally { setLoading(false); }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreateUser = async (data: any) => {
    try {
      await api.post('/api/users', data);
      setModalOpen(false);
      setConfirmMsg('User created successfully.');
      fetchUsers();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleEditUser = async (data: any) => {
    try {
      await api.patch(`/api/users/${selectedUser._id}`, data);
      setModalOpen(false);
      setSelectedUser(null);
      setConfirmMsg('User updated successfully.');
      fetchUsers();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleBan = async (u: any) => {
    const reason = prompt(`Enter ban reason for @${u.username}:`);
    if (reason === null) return;
    try {
      await api.post(`/api/users/${u._id}/ban`, { reason });
      setConfirmMsg(`@${u.username} has been banned.`);
      fetchUsers();
    } catch (err: any) {
      setConfirmMsg(err?.response?.data?.message || 'Ban failed.');
    }
  };

  const handleUnban = async (u: any) => {
    try {
      await api.post(`/api/users/${u._id}/unban`);
      setConfirmMsg(`@${u.username} has been unbanned.`);
      fetchUsers();
    } catch {}
  };

  const handleDelete = async (u: any) => {
    if (!window.confirm(`Are you sure you want to delete @${u.username}? This is a soft delete.`)) return;
    try {
      await api.delete(`/api/users/${u._id}`);
      setConfirmMsg(`@${u.username} has been deleted.`);
      fetchUsers();
    } catch (err: any) {
      setConfirmMsg(err?.response?.data?.message || 'Delete failed.');
    }
  };

  const handleForceLogout = async (u: any) => {
    if (!window.confirm(`Force logout all sessions for @${u.username}?`)) return;
    try {
      await api.post(`/api/users/${u._id}/force-logout`);
      setConfirmMsg(`@${u.username} has been force-logged out.`);
      fetchUsers();
    } catch {}
  };

  const handleResetPassword = async (u: any) => {
    const newPassword = prompt(`Enter new password for @${u.username} (min 8 chars):`);
    if (!newPassword) return;
    if (newPassword.length < 8) { alert('Password must be at least 8 characters.'); return; }
    try {
      await api.post(`/api/users/${u._id}/reset-password`, { newPassword });
      setConfirmMsg(`Password reset for @${u.username}.`);
    } catch (err: any) {
      setConfirmMsg(err?.response?.data?.message || 'Password reset failed.');
    }
  };

  const handleBulkBan = async (ids: string[]) => {
    if (!window.confirm(`Ban ${ids.length} selected users?`)) return;
    try {
      await api.post('/api/users/bulk/ban', { userIds: ids, reason: 'Bulk ban by admin' });
      setConfirmMsg(`${ids.length} users banned.`);
      fetchUsers();
    } catch {}
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!window.confirm(`Delete ${ids.length} selected users?`)) return;
    try {
      await api.post('/api/users/bulk/delete', { userIds: ids });
      setConfirmMsg(`${ids.length} users deleted.`);
      fetchUsers();
    } catch {}
  };

  const handleBulkForceLogout = async (ids: string[]) => {
    try {
      await api.post('/api/users/bulk/force-logout', { userIds: ids });
      setConfirmMsg(`${ids.length} users force-logged out.`);
    } catch {}
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/users/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <Users size={20} className="text-indigo-400" />
          <h1 className="text-xl font-black text-slate-100">Users</h1>
        </div>
        <p className="text-xs text-slate-500 font-medium">Manage all users — create, edit, ban, or remove accounts.</p>
      </div>

      {confirmMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-xs font-medium flex justify-between items-center">
          {confirmMsg}
          <button onClick={() => setConfirmMsg('')} className="text-emerald-500 hover:text-emerald-300 ml-4 font-bold cursor-pointer">×</button>
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
        onFilterRole={r => { setRoleFilter(r); setPage(1); }}
        onFilterStatus={s => { setStatusFilter(s); setPage(1); }}
        onEdit={u => { setSelectedUser(u); setEditMode(true); setModalError(''); setModalOpen(true); }}
        onBan={handleBan}
        onUnban={handleUnban}
        onDelete={handleDelete}
        onForceLogout={handleForceLogout}
        onResetPassword={handleResetPassword}
        onViewDetail={setDrawerUser}
        onBulkBan={handleBulkBan}
        onBulkDelete={handleBulkDelete}
        onBulkForceLogout={handleBulkForceLogout}
        onExportCSV={handleExportCSV}
        onCreateUser={() => { setSelectedUser(null); setEditMode(false); setModalError(''); setModalOpen(true); }}
        showAdmins={false}
      />

      {modalOpen && (
        <UserFormModal
          mode={editMode ? 'edit' : 'create'}
          initialData={editMode ? selectedUser : undefined}
          roleContext={isSuperAdmin ? 'super_admin' : 'admin'}
          error={modalError}
          onSubmit={editMode ? handleEditUser : handleCreateUser}
          onClose={() => { setModalOpen(false); setSelectedUser(null); setModalError(''); }}
        />
      )}

      <UserDetailDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />
    </div>
  );
}

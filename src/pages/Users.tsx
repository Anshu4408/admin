import React, { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  UserX,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Pagination as PaginationControls } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { User, Pagination } from '../types';

export const UsersPage: React.FC = () => {
  const { canManageTeams } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingPaid, setExportingPaid] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [messFilter, setMessFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  // Modals state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const [isEditSaving, setIsEditSaving] = useState(false);

  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.users.downloadCsv();
    } catch {
      showNotification('error', 'Could not export users. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePaidExport = async () => {
    setExportingPaid(true);
    try {
      const { participantCount, teamCount } = await api.users.downloadPaidParticipantsCsv();
      showNotification('success', `Exported ${participantCount} participants from ${teamCount} paid teams.`);
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Could not export paid participants. Please try again.');
    } finally {
      setExportingPaid(false);
    }
  };

  const fetchUsers = useCallback(async (pageToLoad = 1) => {
    setLoading(true);
    try {
      const res = await api.users.list({
        search: search.trim() || undefined,
        hostel: hostelFilter || undefined,
        mess: messFilter || undefined,
        gender: genderFilter || undefined,
        has_team: teamFilter || undefined,
        page: pageToLoad,
        limit: 10,
      });

      if (res.success && res.data) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [search, hostelFilter, messFilter, genderFilter, teamFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      roll_number: user.roll_number || '',
      hostel: user.hostel || '',
      mess: user.mess || '',
      gender: user.gender || '',
      team_id: user.team_id || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsEditSaving(true);
    try {
      const res = await api.users.update(editingUser.user_id, editFormData);
      if (res.success) {
        showNotification('success', 'User profile updated successfully');
        setEditingUser(null);
        fetchUsers(pagination.page);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to update user');
    } finally {
      setIsEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const res = await api.users.delete(deletingUser.user_id);
      if (res.success) {
        showNotification('success', 'User removed successfully');
        setDeletingUser(null);
        fetchUsers(pagination.page);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveFromTeam = async (user: User) => {
    try {
      await api.users.update(user.user_id, {
        name: user.name,
        email: user.email,
        roll_number: user.roll_number,
        hostel: user.hostel,
        mess: user.mess,
        gender: user.gender,
        team_id: '',
      });
      showNotification('success', `${user.name || user.email} removed from team`);
      fetchUsers(pagination.page);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to disassociate team');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Navbar
        title="Participants"
        subtitle={`${pagination.total} registered participants`}
        actions={
          <>
            {canManageTeams && <button
              onClick={handlePaidExport}
              disabled={exportingPaid || exporting}
              title="Export every participant in paid teams with team details, across all pages and filters"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 transition-all disabled:opacity-50"
            >
              {exportingPaid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{exportingPaid ? 'Exporting paid participants…' : 'Export paid participants'}</span>
            </button>}
            <button
              onClick={handleExport}
              disabled={exporting || exportingPaid}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting all participants…' : 'Export all participants'}</span>
            </button>
          </>
        }
      />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {notification && (
          <div
            className={`notification p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}
          >
            <span>{notification.message}</span>
            <button data-icon-button aria-label="Dismiss notification" onClick={() => setNotification(null)} className="rounded-lg opacity-70 hover:bg-neutral-800 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl filter-bar p-4 flex flex-wrap gap-3 items-center">
          <div className="relative min-w-0 flex-[1_1_18rem] w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search names, emails or roll numbers…"
              className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Team Assigned */}
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-brand-500 font-medium"
            >
              <option value="">All Team Status</option>
              <option value="true">In a Team</option>
              <option value="false">Solo / Unassigned</option>
            </select>

            {/* Gender */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-brand-500 font-medium"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            {/* Reset */}
            {(search || hostelFilter || messFilter || genderFilter || teamFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setHostelFilter('');
                  setMessFilter('');
                  setGenderFilter('');
                  setTeamFilter('');
                }}
                className="px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-100 rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl overflow-hidden">

          <div className="record-list min-w-0">
            <table role="table" className="record-table participants-table w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-300 border-b border-neutral-800 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Participant</th>
                  <th className="py-3.5 px-4">Roll Number</th>
                  <th className="py-3.5 px-4">Hostel / Mess</th>
                  <th className="py-3.5 px-4">Gender</th>
                  <th className="py-3.5 px-4">Team Assignment</th>
                  <th className="py-3.5 px-4">Registered</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800 text-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                        <span className="font-medium">Loading participants directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8">
                      <EmptyState
                        icon={UsersIcon}
                        title="No participants found"
                        description="Try adjusting your search criteria or clearing active filters."
                      />
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.user_id} className="hover:bg-neutral-950/80 transition-colors">
                      <td data-label="Participant" className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {user.pfp ? (
                            <img src={user.pfp} alt={user.name} className="w-8 h-8 shrink-0 rounded-full object-cover ring-1 ring-neutral-800" />
                          ) : (
                            <div className="w-8 h-8 shrink-0 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center font-semibold text-xs text-brand-700">
                              {user.name ? user.name[0].toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-neutral-50">{user.name || 'Anonymous'}</p>
                            <p className="text-xs text-neutral-400 font-medium">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td data-label="Roll Number" className="py-3.5 px-4 font-mono font-medium text-neutral-200">
                        {user.roll_number || <span className="text-neutral-400 italic font-sans font-normal">None</span>}
                      </td>

                      <td data-label="Hostel / Mess" className="py-3.5 px-4 text-neutral-200">
                        <div>
                          <span className="font-medium">{user.hostel || '—'}</span>
                          {user.mess && <span className="text-xs text-neutral-400 block">{user.mess}</span>}
                        </div>
                      </td>

                      <td data-label="Gender" className="py-3.5 px-4">
                        <span className="capitalize font-medium">{user.gender || '—'}</span>
                      </td>

                      <td data-label="Team Assignment" className="py-3.5 px-4">
                        {user.team_id ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-mono text-xs font-semibold">
                            <span className="whitespace-nowrap">{user.team_id}</span>
                            <button data-icon-button
                              onClick={() => handleRemoveFromTeam(user)}
                              title="Remove from this team"
                              className="p-0.5 hover:text-rose-400 transition-colors"
                            >
                              <UserX className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-xs italic">Unassigned (Solo)</span>
                        )}
                      </td>

                      <td data-label="Registered" className="py-3.5 px-4 text-xs text-neutral-400 font-medium">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>

                      <td data-label="Actions" className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button data-icon-button
                            onClick={() => handleEditClick(user)}
                            title="Edit participant"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button data-icon-button
                            onClick={() => setDeletingUser(user)}
                            title="Delete user"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <PaginationControls pagination={pagination} onPageChange={fetchUsers} noun="participants" />
        </div>
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title="Edit Participant Profile"
          subtitle={`Modifying ${editingUser.email}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">Full Name</label>
              <input
                type="text"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">Email Address</label>
              <input
                type="email"
                value={editFormData.email || ''}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={editFormData.roll_number || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, roll_number: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-mono"
                  placeholder="e.g. 106122001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">Gender</label>
                <select
                  value={editFormData.gender || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
                >
                  <option value="">Unspecified</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">Hostel</label>
                <input
                  type="text"
                  value={editFormData.hostel || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, hostel: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
                  placeholder="e.g. Amber, Garnet"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">Mess</label>
                <input
                  type="text"
                  value={editFormData.mess || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, mess: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
                  placeholder="e.g. Mega Mess 1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">Assigned Team ID</label>
              <input
                type="text"
                value={editFormData.team_id || ''}
                onChange={(e) => setEditFormData({ ...editFormData, team_id: e.target.value })}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-mono"
                placeholder="Leave blank for solo participant"
              />
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-neutral-50 hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isEditSaving}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all disabled:opacity-50"
              >
                {isEditSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete User Confirmation */}
      {deletingUser && (
        <ConfirmDialog
          isOpen={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Participant"
          message={`Are you sure you want to delete ${deletingUser.name || deletingUser.email}? This will remove them from their assigned team and cannot be undone.`}
          confirmText="Delete Participant"
          isDanger
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers as LayersIcon,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  Crown,
  Copy,
  Check,
  Globe,
  Lock,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge, Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import type { Team, Pagination } from '../types';

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');

  // Modals & Drawers
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Team>>({});

  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTeamId(text);
    setTimeout(() => setCopiedTeamId(null), 2000);
  };

  const fetchTeams = useCallback(async (pageToLoad = 1) => {
    setLoading(true);
    try {
      const res = await api.teams.list({
        search: search.trim() || undefined,
        domain: domainFilter || undefined,
        payment_status: paymentFilter || undefined,
        is_public: visibilityFilter || undefined,
        page: pageToLoad,
        limit: 10,
      });

      if (res.success && res.data) {
        setTeams(res.data.teams || []);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  }, [search, domainFilter, paymentFilter, visibilityFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeams(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTeams]);

  const loadTeamDetails = async (teamId: string) => {
    try {
      const res = await api.teams.get(teamId);
      if (res.success && res.data) {
        setActiveTeam(res.data);
      }
    } catch {
      showNotification('error', 'Failed to load team details');
    }
  };

  const handleSaveEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    try {
      const res = await api.teams.update(editingTeam.team_id, editFormData);
      if (res.success) {
        showNotification('success', 'Team updated successfully');
        setEditingTeam(null);
        fetchTeams(pagination.page);
        if (activeTeam?.team_id === editingTeam.team_id) {
          loadTeamDetails(editingTeam.team_id);
        }
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to update team');
    }
  };

  const handleDeleteTeamConfirm = async () => {
    if (!deletingTeam) return;
    setIsDeleting(true);
    try {
      const res = await api.teams.delete(deletingTeam.team_id);
      if (res.success) {
        showNotification('success', 'Team deleted successfully');
        setDeletingTeam(null);
        if (activeTeam?.team_id === deletingTeam.team_id) {
          setActiveTeam(null);
        }
        fetchTeams(pagination.page);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to delete team');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !newMemberEmail.trim()) return;
    setIsAddingMember(true);
    try {
      const res = await api.teams.addMember(activeTeam.team_id, { email: newMemberEmail.trim() });
      if (res.success) {
        showNotification('success', `Added ${newMemberEmail} to squad`);
        setNewMemberEmail('');
        loadTeamDetails(activeTeam.team_id);
        fetchTeams(pagination.page);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to add participant to squad');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string, userName: string) => {
    try {
      const res = await api.teams.removeMember(teamId, userId);
      if (res.success) {
        showNotification('success', `Removed ${userName || 'member'} from squad`);
        loadTeamDetails(teamId);
        fetchTeams(pagination.page);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleChangeLeader = async (teamId: string, newLeaderUserId: string) => {
    try {
      const res = await api.teams.changeLeader(teamId, newLeaderUserId);
      if (res.success) {
        showNotification('success', 'Team leadership transferred successfully');
        loadTeamDetails(teamId);
        fetchTeams(pagination.page);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to change team leader');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Navbar
        title="Team Operations"
        subtitle={`Managing ${pagination.total} registered squads across tracks`}
        actions={
          <button
            onClick={() => api.teams.downloadCsv()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-all shadow-soft"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        }
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        {notification && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-soft flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by squad name, team ID code, or leader name..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-brand-500 font-medium"
            >
              <option value="">All Payment Statuses</option>
              <option value="Paid">Paid / Verified</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed / Rejected</option>
            </select>

            {/* Visibility Filter */}
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-brand-500 font-medium"
            >
              <option value="">All Visibility</option>
              <option value="true">Public</option>
              <option value="false">Private</option>
            </select>

            {(search || domainFilter || paymentFilter || visibilityFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setDomainFilter('');
                  setPaymentFilter('');
                  setVisibilityFilter('');
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Teams Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3.5 px-5">Team Name & Code</th>
                  <th className="py-3.5 px-4">Leader</th>
                  <th className="py-3.5 px-4">Domain</th>
                  <th className="py-3.5 px-4">Members</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4">Visibility</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                        <span className="font-medium">Loading squad roster...</span>
                      </div>
                    </td>
                  </tr>
                ) : teams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8">
                      <EmptyState
                        icon={LayersIcon}
                        title="No teams matching criteria"
                        description="No squads match your active search or filter query."
                      />
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => {
                    const memberCount = team.members?.length || 0;
                    return (
                      <tr key={team.team_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <div>
                            <p
                              onClick={() => loadTeamDetails(team.team_id)}
                              title="Click to inspect and manage squad roster"
                              className="font-bold text-slate-900 text-sm hover:text-brand-600 cursor-pointer transition-colors"
                            >
                              {team.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-500 font-medium">{team.team_id}</span>
                              <button
                                onClick={() => copyToClipboard(team.team_id)}
                                title="Copy Team ID"
                                className="p-0.5 text-slate-400 hover:text-brand-600 transition-colors"
                              >
                                {copiedTeamId === team.team_id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <div>
                              <p className="font-semibold text-slate-800">{team.leader || 'Unassigned'}</p>
                              {team.contact && <p className="text-[10px] text-slate-500">{team.contact}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant="indigo">{team.domain || 'Open Track'}</Badge>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              memberCount >= 3
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {memberCount} / 5 members
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={team.payment_status} />
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {team.ispublic ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                              <Globe className="w-3 h-3" /> Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                              <Lock className="w-3 h-3" /> Private
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingTeam(team);
                                setEditFormData({
                                  name: team.name,
                                  contact: team.contact,
                                  domain: team.domain || '',
                                  problem_statement: team.problem_statement || '',
                                  ispublic: team.ispublic,
                                });
                              }}
                              title="Edit details"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingTeam(team)}
                              title="Disband squad"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pagination.total > 0 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
              <span>
                Showing <strong className="text-slate-900 font-bold">{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
                <strong className="text-slate-900 font-bold">{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{pagination.total}</strong> squads
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchTeams(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - pagination.page) <= 1)
                    .map((p, idx, arr) => {
                      const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsisBefore && <span className="px-1 text-slate-400">...</span>}
                          <button
                            onClick={() => fetchTeams(p)}
                            className={`min-w-8 h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                              p === pagination.page
                                ? 'bg-brand-600 text-white shadow-soft'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => fetchTeams(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Team Details & Member Management Modal */}
      {activeTeam && (
        <Modal
          isOpen={!!activeTeam}
          onClose={() => setActiveTeam(null)}
          title={activeTeam.name}
          subtitle={`Team ID: ${activeTeam.team_id} • Domain: ${activeTeam.domain || 'Unspecified'}`}
          maxWidth="xl"
        >
          <div className="space-y-6">
            {/* Meta tags summary */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Payment</span>
                <StatusBadge status={activeTeam.payment_status} />
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Contact</span>
                <span className="font-semibold text-slate-800">{activeTeam.contact || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Visibility</span>
                <span className="font-semibold text-slate-800">{activeTeam.ispublic ? 'Public' : 'Private'}</span>
              </div>
            </div>

            {/* Problem Statement */}
            {activeTeam.problem_statement && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Problem Statement</h5>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">{activeTeam.problem_statement}</p>
              </div>
            )}

            {/* Members Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <LayersIcon className="w-3.5 h-3.5 text-brand-600" />
                  Roster Members ({activeTeam.members?.length || 0} / 5)
                </h4>
              </div>

              <div className="space-y-2">
                {activeTeam.members && activeTeam.members.length > 0 ? (
                  activeTeam.members.map((member) => {
                    const isLeader = member.user_id === activeTeam.leader_user_id;
                    return (
                      <div
                        key={member.user_id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center font-bold text-xs text-brand-700">
                            {member.name ? member.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900">{member.name || 'Anonymous'}</p>
                              {isLeader && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Crown className="w-3 h-3 text-amber-500" /> Leader
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{member.email} • Roll: {member.roll_number || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!isLeader && (
                            <button
                              onClick={() => handleChangeLeader(activeTeam.team_id, member.user_id)}
                              title="Promote to Team Leader"
                              className="px-2.5 py-1 text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 shadow-soft"
                            >
                              <Crown className="w-3 h-3 text-amber-500" />
                              Make Leader
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(activeTeam.team_id, member.user_id, member.name)}
                            title="Remove from squad"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No members currently assigned to this squad.</p>
                )}
              </div>
            </div>

            {/* Add Member form */}
            {(activeTeam.members?.length || 0) < 5 && (
              <form onSubmit={handleAddMember} className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Add Participant by Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Participant's registered email address..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 font-medium"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isAddingMember}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-soft"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isAddingMember ? 'Adding...' : 'Add Member'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <Modal
          isOpen={!!editingTeam}
          onClose={() => setEditingTeam(null)}
          title="Edit Squad Details"
          subtitle={`Editing ${editingTeam.name} (${editingTeam.team_id})`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEditTeam} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Team Name</label>
              <input
                type="text"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={editFormData.contact || ''}
                onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Domain</label>
                <input
                  type="text"
                  value={editFormData.domain || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, domain: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                <div className="space-y-2 py-1">
                  <StatusBadge status={editingTeam.payment_status} />
                  <p className="text-[11px] text-slate-500">Manage payment approvals and rejections in QR Codes &amp; UTR.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Problem Statement</label>
              <textarea
                rows={3}
                value={editFormData.problem_statement || ''}
                onChange={(e) => setEditFormData({ ...editFormData, problem_statement: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-ispublic"
                checked={editFormData.ispublic || false}
                onChange={(e) => setEditFormData({ ...editFormData, ispublic: e.target.checked })}
                className="w-4 h-4 text-brand-600 bg-slate-50 border-slate-300 rounded focus:ring-brand-500"
              />
              <label htmlFor="edit-ispublic" className="text-xs text-slate-700 font-medium cursor-pointer">
                Public Squad Listing
              </label>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-soft"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Team Confirmation */}
      {deletingTeam && (
        <ConfirmDialog
          isOpen={!!deletingTeam}
          onClose={() => setDeletingTeam(null)}
          onConfirm={handleDeleteTeamConfirm}
          title="Disband Team Squad"
          message={`Are you sure you want to disband '${deletingTeam.name}' (${deletingTeam.team_id})? All members will be safely returned to unassigned status and all payment records will be purged.`}
          confirmText="Disband Squad"
          isDanger
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

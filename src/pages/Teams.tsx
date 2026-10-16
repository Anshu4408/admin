import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editErrorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editError) {
      editErrorRef.current?.focus();
      editErrorRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [editError]);

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
    if (!editingTeam || isSavingEdit) return;
    setEditError(null);
    const payload: Partial<Pick<Team, 'name' | 'contact' | 'domain' | 'ispublic'>> = {};
    if (editFormData.name?.trim() !== editingTeam.name) payload.name = editFormData.name?.trim();
    if (editFormData.contact?.trim() !== editingTeam.contact) payload.contact = editFormData.contact?.trim();
    if ((editFormData.domain || '').trim() !== (editingTeam.domain || '')) payload.domain = editFormData.domain?.trim();
    if (editFormData.ispublic !== editingTeam.ispublic) payload.ispublic = editFormData.ispublic;
    if (!Object.keys(payload).length) { setEditingTeam(null); return; }
    setIsSavingEdit(true);
    try {
      const res = await api.teams.update(editingTeam.team_id, payload);
      if (!res.success) throw new Error(res.message || 'Failed to update team');
      showNotification('success', 'Team updated successfully');
      setEditingTeam(null);
      fetchTeams(pagination.page);
      if (activeTeam?.team_id === editingTeam.team_id) loadTeamDetails(editingTeam.team_id);
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.message || 'Failed to update team');
    } finally {
      setIsSavingEdit(false);
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
        title="Teams"
        subtitle={`${pagination.total} registered teams`}
        actions={
          <button
            onClick={() => api.teams.downloadCsv()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        }
      />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {notification && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams, IDs or leaders…"
              className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-brand-500 font-medium"
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
              className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-brand-500 font-medium"
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
                className="px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-100 rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Teams Table */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl overflow-hidden">
          <p className="border-b border-neutral-800 px-4 py-2 text-xs text-neutral-500 sm:hidden">Scroll sideways to see all columns and actions.</p>
          <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Scrollable records" tabIndex={0}>
            <table className="min-w-[740px] w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-300 border-b border-neutral-800 uppercase tracking-wider text-xs font-semibold">
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

              <tbody className="divide-y divide-neutral-800 text-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
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
                      <tr key={team.team_id} className="hover:bg-neutral-950/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <div>
                            <p
                              onClick={() => loadTeamDetails(team.team_id)}
                              title="Click to inspect and manage squad roster"
                              className="font-semibold text-neutral-50 text-sm hover:text-brand-600 cursor-pointer transition-colors"
                            >
                              {team.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-xs text-neutral-400 font-medium">{team.team_id}</span>
                              <button
                                onClick={() => copyToClipboard(team.team_id)}
                                title="Copy Team ID"
                                className="p-0.5 text-neutral-400 hover:text-brand-600 transition-colors"
                              >
                                {copiedTeamId === team.team_id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
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
                              <p className="font-semibold text-neutral-100">{team.leader || 'Unassigned'}</p>
                              {team.contact && <p className="text-xs text-neutral-400">{team.contact}</p>}
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
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
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
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                              <Globe className="w-3 h-3" /> Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-neutral-400 font-semibold">
                              <Lock className="w-3 h-3" /> Private
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditError(null);
                                setEditingTeam(team);
                                setEditFormData({
                                  name: team.name,
                                  contact: team.contact,
                                  domain: team.domain || '',
                                  ispublic: team.ispublic,
                                });
                              }}
                              title="Edit details"
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingTeam(team)}
                              title="Disband squad"
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
            <div className="p-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400 font-medium">
              <span>
                Showing <strong className="text-neutral-50 font-semibold">{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
                <strong className="text-neutral-50 font-semibold">{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
                <strong className="text-neutral-50 font-semibold">{pagination.total}</strong> squads
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchTeams(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
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
                          {showEllipsisBefore && <span className="px-1 text-neutral-400">...</span>}
                          <button
                            onClick={() => fetchTeams(p)}
                            className={`min-w-8 h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                              p === pagination.page
                                ? 'bg-brand-600 text-white '
                                : 'text-neutral-300 hover:bg-neutral-800'
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
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
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
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-400 block text-xs uppercase font-semibold">Payment</span>
                <StatusBadge status={activeTeam.payment_status} />
              </div>
              <div>
                <span className="text-neutral-400 block text-xs uppercase font-semibold">Contact</span>
                <span className="font-semibold text-neutral-100">{activeTeam.contact || 'None'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-xs uppercase font-semibold">Visibility</span>
                <span className="font-semibold text-neutral-100">{activeTeam.ispublic ? 'Public' : 'Private'}</span>
              </div>
            </div>

            {/* Problem Statement */}
            {activeTeam.problem_statement && (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Problem Statement</h5>
                <p className="text-xs text-neutral-200 leading-relaxed font-medium">{activeTeam.problem_statement}</p>
              </div>
            )}

            {/* Members Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-50 flex items-center gap-1.5">
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
                        className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center font-semibold text-xs text-brand-700">
                            {member.name ? member.name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-neutral-50">{member.name || 'Anonymous'}</p>
                              {isLeader && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                                  <Crown className="w-3 h-3 text-amber-500" /> Leader
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400">{member.email} • Roll: {member.roll_number || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!isLeader && (
                            <button
                              onClick={() => handleChangeLeader(activeTeam.team_id, member.user_id)}
                              title="Promote to Team Leader"
                              className="px-2.5 py-1 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Crown className="w-3 h-3 text-amber-500" />
                              Make Leader
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(activeTeam.team_id, member.user_id, member.name)}
                            title="Remove from squad"
                            className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-neutral-400 py-4 text-center">No members currently assigned to this squad.</p>
                )}
              </div>
            </div>

            {/* Add Member form */}
            {(activeTeam.members?.length || 0) < 5 && (
              <form onSubmit={handleAddMember} className="pt-3 border-t border-neutral-800">
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">Add Participant by Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Participant's registered email address..."
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-brand-500 font-medium"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isAddingMember}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
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
            {editError && <div ref={editErrorRef} tabIndex={-1} role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-300">{editError}</div>}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">Team Name</label>
              <input
                type="text"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">Contact Phone</label>
              <input
                type="text"
                value={editFormData.contact || ''}
                onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">Domain</label>
                <input
                  type="text"
                  value={editFormData.domain || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, domain: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">Payment Status</label>
                <div className="space-y-2 py-1">
                  <StatusBadge status={editingTeam.payment_status} />
                  <p className="text-xs text-neutral-400">Manage payment approvals and rejections in QR Codes &amp; UTR.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">Problem Statement</label>
              <p className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{editingTeam.problem_statement || 'Not selected'}</p>
              <p className="mt-2 text-xs text-neutral-400">Selected by the team leader on the registration website when selection is open.</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-ispublic"
                checked={editFormData.ispublic || false}
                onChange={(e) => setEditFormData({ ...editFormData, ispublic: e.target.checked })}
                className="w-4 h-4 text-brand-600 bg-neutral-950 border-neutral-700 rounded focus:ring-brand-500"
              />
              <label htmlFor="edit-ispublic" className="text-xs text-neutral-200 font-medium cursor-pointer">
                Public Squad Listing
              </label>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-neutral-50 hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all"
              >
                {isSavingEdit ? 'Saving…' : 'Save Changes'}
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

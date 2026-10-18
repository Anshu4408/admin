import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layers as LayersIcon,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Crown,
  Copy,
  Check,
  Globe,
  Lock,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Pagination as PaginationControls } from '../components/Pagination';
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
  const [rosterTeam, setRosterTeam] = useState<Team | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const rosterRequest = useRef(0);

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

      if (!res.success || !res.data) throw new Error(res.message || 'Could not load teams');
      if (res.data) {
        setTeams(res.data.teams || []);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || err.message || 'Failed to fetch teams');
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

  const closeRoster = () => {
    rosterRequest.current += 1;
    setRosterTeam(null);
    setActiveTeam(null);
    setRosterError(null);
  };

  const loadTeamDetails = async (teamId: string) => {
    const requestId = ++rosterRequest.current;
    setRosterTeam(teams.find(team => team.team_id === teamId) || activeTeam);
    setActiveTeam(null);
    setRosterLoading(true);
    setRosterError(null);
    try {
      const res = await api.teams.get(teamId);
      if (!res.success || !res.data || !Array.isArray(res.data.members)) throw new Error(res.message || 'Team members were not returned. Please retry.');
      if (requestId !== rosterRequest.current) return;
      setActiveTeam(res.data);
      setTeams(current => current.map(team => team.team_id === teamId ? { ...team, member_count: res.data!.members!.length } : team));
    } catch (err: any) {
      if (requestId === rosterRequest.current) setRosterError(err.response?.data?.message || err.message || 'Could not load team members');
    } finally {
      if (requestId === rosterRequest.current) setRosterLoading(false);
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
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl filter-bar p-4 flex flex-wrap gap-3 items-center">
          <div className="relative min-w-0 flex-[1_1_18rem] w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams, IDs or leaders…"
              className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
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

          <div className="record-list min-w-0">
            <table role="table" className="record-table teams-table w-full text-left text-xs">
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
                    const memberCount = team.member_count ?? (Array.isArray(team.members) ? team.members.length : undefined);
                    return (
                      <tr key={team.team_id} className="hover:bg-neutral-950/80 transition-colors">
                        <td data-label="Team Name & Code" className="py-3.5 px-5">
                          <div>
                            <button
                              onClick={() => loadTeamDetails(team.team_id)}
                              aria-label={`View members of ${team.name}`}
                              className="text-left font-semibold text-neutral-50 text-sm hover:text-brand-600 transition-colors"
                            >
                              {team.name}
                            </button>
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

                        <td data-label="Leader" className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <div>
                              <p className="font-semibold text-neutral-100">{team.leader || 'Unassigned'}</p>
                              {team.contact && <p className="text-xs text-neutral-400">{team.contact}</p>}
                            </div>
                          </div>
                        </td>

                        <td data-label="Domain" className="py-3.5 px-4">
                          <Badge variant="indigo">{team.domain || 'Open Track'}</Badge>
                        </td>

                        <td data-label="Members" className="py-3.5 px-4">
                          <div className="flex flex-col items-start gap-2">
                            <Badge variant={memberCount === undefined ? 'slate' : memberCount >= 4 ? 'emerald' : 'amber'}>{memberCount === undefined ? 'Count unavailable' : `${memberCount} / 5 members`}</Badge>
                            <button onClick={() => loadTeamDetails(team.team_id)} className="text-left text-xs text-neutral-300 underline underline-offset-4 hover:text-white">View members</button>
                          </div>
                        </td>

                        <td data-label="Payment Status" className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={team.payment_status} />
                          </div>
                        </td>

                        <td data-label="Visibility" className="py-3.5 px-4">
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

                        <td data-label="Actions" className="py-3.5 px-5 text-right">
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
          <PaginationControls pagination={pagination} onPageChange={fetchTeams} noun="teams" />
        </div>
      </main>

      {/* Member details are fetched only when the roster is opened. */}
      {rosterTeam && (
        <Modal isOpen onClose={closeRoster} title={`${rosterTeam.name} · Members`} subtitle={`Team ${rosterTeam.team_id}`} maxWidth="xl">
          {rosterLoading ? <div role="status" className="flex items-center gap-3 py-8 text-sm text-neutral-400"><Loader2 className="h-5 w-5 animate-spin" />Loading team members…</div>
            : rosterError ? <div role="alert" className="space-y-4"><p className="text-sm text-rose-300">{rosterError}</p><button onClick={() => loadTeamDetails(rosterTeam.team_id)} className="rounded-lg border border-neutral-700 px-4 py-2 text-sm">Retry</button></div>
            : activeTeam && <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400"><StatusBadge status={activeTeam.payment_status} /><span>{activeTeam.members!.length} / 5 members</span><span>{activeTeam.domain || 'No domain'}</span></div>
              <ul className="space-y-3" aria-label="Team members">
                {activeTeam.members!.map(member => <li key={member.user_id} className="min-w-0 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-2"><p className="min-w-0 break-words text-sm font-medium text-neutral-100">{member.name || 'Name not provided'}</p>{member.user_id === activeTeam.leader_user_id && <Badge variant="amber"><Crown className="h-3 w-3" />Leader</Badge>}</div>
                  <p className="mt-2 break-all text-xs text-neutral-400">{member.email || 'Email not provided'}</p>
                  <p className="mt-2 break-words text-xs text-neutral-400">Roll number: {member.roll_number || 'Not provided'}</p>
                </li>)}
              </ul>
              {!activeTeam.members!.length && <p className="text-sm text-neutral-400">No participants are assigned to this team.</p>}
            </div>}
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

            <div className="pt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800">
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

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Lock,
  Users,
  Layers,
  CreditCard,
  Shield,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Badge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { AdminUser } from '../types';

export const AdminsPage: React.FC = () => {
  const { admin: currentAdmin, isSuperAdmin, canManageAdmins } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Admin Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    name: '',
    role: 'admin',
    can_manage_users: true,
    can_manage_teams: true,
    can_manage_payments: false,
    can_manage_admins: false,
  });
  const [isAdding, setIsAdding] = useState(false);

  // Edit Admin Modal
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editAdminData, setEditAdminData] = useState<Partial<AdminUser>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Delete Admin
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await api.admins.list();
      if (res.success && res.data) {
        setAdmins(res.data);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageAdmins || isSuperAdmin) {
      fetchAdmins();
    }
  }, [canManageAdmins, isSuperAdmin]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminData.email.trim()) return;
    setIsAdding(true);
    try {
      const res = await api.admins.create(newAdminData);
      if (res.success) {
        showNotification('success', `Granted admin authorization to ${newAdminData.email}`);
        setIsAddModalOpen(false);
        setNewAdminData({
          email: '',
          name: '',
          role: 'admin',
          can_manage_users: true,
          can_manage_teams: true,
          can_manage_payments: false,
          can_manage_admins: false,
        });
        fetchAdmins();
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to add administrator');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditClick = (adm: AdminUser) => {
    setEditingAdmin(adm);
    setEditAdminData({
      name: adm.name,
      role: adm.role,
      can_manage_users: adm.can_manage_users,
      can_manage_teams: adm.can_manage_teams,
      can_manage_payments: adm.can_manage_payments,
      can_manage_admins: adm.can_manage_admins,
      is_active: adm.is_active,
    });
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setIsSaving(true);
    try {
      const res = await api.admins.update(editingAdmin.admin_id, editAdminData);
      if (res.success) {
        showNotification('success', 'Admin permissions updated successfully');
        setEditingAdmin(null);
        fetchAdmins();
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to update admin');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAdmin) return;
    setIsDeleting(true);
    try {
      const res = await api.admins.delete(deletingAdmin.admin_id);
      if (res.success) {
        showNotification('success', `Admin access revoked for ${deletingAdmin.email}`);
        setDeletingAdmin(null);
        fetchAdmins();
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to delete admin');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canManageAdmins && !isSuperAdmin) {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar title="Access Control" subtitle="Role-based permissions" />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-md text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-neutral-50 mb-1">Restricted Permission Area</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-medium">
              Only Super Administrators or members with RBAC delegation rights can view and adjust admin accounts.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Navbar
        title="Admin Roles & Permissions (RBAC)"
        subtitle="Manage authorized Google emails and configure granular permissions"
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Admin Email</span>
          </button>
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

        {/* Info Banner */}
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-start gap-3.5 text-xs">
          <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <div className="text-neutral-300 leading-relaxed font-medium">
            <strong className="text-neutral-50">Google OAuth Whitelist Security:</strong> When an admin signs in with Google, their email address is authenticated and checked against this database list. If not authorized, access is denied.
          </div>
        </div>

        {/* Admins Table */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl overflow-hidden">

          <div className="record-list min-w-0">
            <table role="table" className="record-table admins-table w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-300 border-b border-neutral-800 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Administrator</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-center">User Mgmt</th>
                  <th className="py-3.5 px-4 text-center">Team Mgmt</th>
                  <th className="py-3.5 px-4 text-center">Payment Mgmt</th>
                  <th className="py-3.5 px-4 text-center">Admin RBAC</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800 text-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                        <span className="font-medium">Loading authorized administrators...</span>
                      </div>
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-400">
                      No admin users found. Click 'Add Admin Email' to whitelist an administrator.
                    </td>
                  </tr>
                ) : (
                  admins.map((adm) => {
                    const isSelf = currentAdmin?.admin_id === adm.admin_id;
                    const isSuper = adm.role === 'superadmin';

                    return (
                      <tr key={adm.admin_id} className="hover:bg-neutral-950/80 transition-colors">
                        <td data-label="Administrator" className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            {adm.picture ? (
                              <img src={adm.picture} alt={adm.name} className="w-8 h-8 shrink-0 rounded-full object-cover ring-1 ring-neutral-800" />
                            ) : (
                              <div className="w-8 h-8 shrink-0 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center font-semibold text-xs text-brand-700">
                                {adm.name ? adm.name[0].toUpperCase() : 'A'}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-neutral-50">{adm.name || 'Administrator'}</p>
                                {isSelf && (
                                  <span className="text-xs px-1.5 py-0.2 rounded bg-brand-50 text-brand-700 font-semibold border border-brand-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 font-medium">{adm.email}</p>
                            </div>
                          </div>
                        </td>

                        <td data-label="Role" className="py-3.5 px-4">
                          {isSuper ? (
                            <Badge variant="emerald">Superadmin</Badge>
                          ) : (
                            <Badge variant="indigo">Admin</Badge>
                          )}
                        </td>

                        {/* User Mgmt */}
                        <td data-label="User Mgmt" className="py-3.5 px-4 text-center">
                          {isSuper || adm.can_manage_users ? (
                            <span className="inline-flex p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-md bg-neutral-800 text-neutral-400">
                              <X className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>

                        {/* Team Mgmt */}
                        <td data-label="Team Mgmt" className="py-3.5 px-4 text-center">
                          {isSuper || adm.can_manage_teams ? (
                            <span className="inline-flex p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-md bg-neutral-800 text-neutral-400">
                              <X className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>

                        {/* Payment Mgmt */}
                        <td data-label="Payment Mgmt" className="py-3.5 px-4 text-center">
                          {isSuper || adm.can_manage_payments ? (
                            <span className="inline-flex p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-md bg-neutral-800 text-neutral-400">
                              <X className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>

                        {/* Admin RBAC */}
                        <td data-label="Admin RBAC" className="py-3.5 px-4 text-center">
                          {isSuper || adm.can_manage_admins ? (
                            <span className="inline-flex p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-md bg-neutral-800 text-neutral-400">
                              <X className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>

                        <td data-label="Status" className="py-3.5 px-4">
                          {adm.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Deactivated
                            </span>
                          )}
                        </td>

                        <td data-label="Actions" className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button data-icon-button
                              onClick={() => handleEditClick(adm)}
                              title="Edit permissions"
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isSelf && (
                              <button data-icon-button
                                onClick={() => setDeletingAdmin(adm)}
                                title="Revoke admin access"
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Admin Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Authorize New Administrator"
          subtitle="Add an authorized email address and grant granular RBAC permissions"
          maxWidth="md"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Google Account Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={newAdminData.email}
                onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                placeholder="e.g. member@transfinitte.com"
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">Name / Title</label>
              <input
                type="text"
                value={newAdminData.name}
                onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                placeholder="e.g. Core Organizer"
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">Role Hierarchy</label>
              <select
                value={newAdminData.role}
                onChange={(e) => setNewAdminData({ ...newAdminData, role: e.target.value })}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
              >
                <option value="admin">Standard Administrator (Custom Permissions)</option>
                <option value="superadmin">Super Administrator (Full Unrestricted Access)</option>
              </select>
            </div>

            {newAdminData.role === 'admin' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-neutral-200 mb-2">
                  Granular Permissions
                </label>

                <div className="space-y-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <label className="flex items-center gap-2.5 text-xs text-neutral-200 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAdminData.can_manage_users}
                      onChange={(e) => setNewAdminData({ ...newAdminData, can_manage_users: e.target.checked })}
                      className="w-4 h-4 text-brand-600 bg-neutral-900 border-neutral-700 rounded focus:ring-brand-500"
                    />
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-brand-600" />
                      <span><strong>User Directory:</strong> View, edit & manage participants</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-neutral-200 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAdminData.can_manage_teams}
                      onChange={(e) => setNewAdminData({ ...newAdminData, can_manage_teams: e.target.checked })}
                      className="w-4 h-4 text-brand-600 bg-neutral-900 border-neutral-700 rounded focus:ring-brand-500"
                    />
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span><strong>Team Management:</strong> Manage squads and promote leaders</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-neutral-200 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAdminData.can_manage_payments}
                      onChange={(e) => setNewAdminData({ ...newAdminData, can_manage_payments: e.target.checked })}
                      className="w-4 h-4 text-brand-600 bg-neutral-900 border-neutral-700 rounded focus:ring-brand-500"
                    />
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span><strong>Payment Management:</strong> Audit and review transaction records</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-neutral-200 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAdminData.can_manage_admins}
                      onChange={(e) => setNewAdminData({ ...newAdminData, can_manage_admins: e.target.checked })}
                      className="w-4 h-4 text-brand-600 bg-neutral-900 border-neutral-700 rounded focus:ring-brand-500"
                    />
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      <span><strong>Admin Delegation:</strong> Whitelist new admin emails</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="pt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-neutral-50 hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all disabled:opacity-50"
              >
                {isAdding ? 'Authorizing...' : 'Authorize Admin'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <Modal
          isOpen={!!editingAdmin}
          onClose={() => setEditingAdmin(null)}
          title="Adjust Administrator Permissions"
          subtitle={`Modifying privileges for ${editingAdmin.email}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">Name / Title</label>
              <input
                type="text"
                value={editAdminData.name || ''}
                onChange={(e) => setEditAdminData({ ...editAdminData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">Role Hierarchy</label>
              <select
                value={editAdminData.role || 'admin'}
                onChange={(e) => setEditAdminData({ ...editAdminData, role: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500 font-medium"
              >
                <option value="admin">Standard Administrator</option>
                <option value="superadmin">Super Administrator</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-neutral-200 mb-2">
                Assigned Permissions
              </label>

              <div className="space-y-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <label className="flex items-center gap-2.5 text-xs text-neutral-200 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAdminData.can_manage_users || false}
                    onChange={(e) => setEditAdminData({ ...editAdminData, can_manage_users: e.target.checked })}
                    className="w-4 h-4 text-brand-600 bg-neutral-900 border-neutral-700 rounded focus:ring-brand-500"
                  />
                  <span>User Directory Management</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-neutral-200 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAdminData.can_manage_teams || false}
                    onChange={(e) => setEditAdminData({ ...editAdminData, can_manage_teams: e.target.checked })}
                    className="w-4 h-4 text-brand-600 bg-neutral-900 border-neutral-700 rounded focus:ring-brand-500"
                  />
                  <span>Team Squad Management</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-neutral-200 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAdminData.can_manage_payments || false}
                    onChange={(e) => setEditAdminData({ ...editAdminData, can_manage_payments: e.target.checked })}
                    className="w-4 h-4 text-brand-600 bg-neutral-900 border-neutral-700 rounded focus:ring-brand-500"
                  />
                  <span>Payment Transactions & Auditing</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-neutral-200 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAdminData.can_manage_admins || false}
                    onChange={(e) => setEditAdminData({ ...editAdminData, can_manage_admins: e.target.checked })}
                    className="w-4 h-4 text-brand-600 bg-neutral-900 border-neutral-700 rounded focus:ring-brand-500"
                  />
                  <span>Admin User Delegation & RBAC Rights</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is-active-check"
                checked={editAdminData.is_active || false}
                onChange={(e) => setEditAdminData({ ...editAdminData, is_active: e.target.checked })}
                className="w-4 h-4 text-brand-600 bg-neutral-900 border-neutral-700 rounded focus:ring-brand-500"
              />
              <label htmlFor="is-active-check" className="text-xs text-neutral-200 font-medium cursor-pointer">
                Account Active (uncheck to temporarily deactivate access)
              </label>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-neutral-50 hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Admin Confirmation */}
      {deletingAdmin && (
        <ConfirmDialog
          isOpen={!!deletingAdmin}
          onClose={() => setDeletingAdmin(null)}
          onConfirm={handleDeleteConfirm}
          title="Revoke Admin Access"
          message={`Are you sure you want to revoke administrator authorization for ${deletingAdmin.email}? They will immediately lose all access to the admin portal.`}
          confirmText="Revoke Access"
          isDanger
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

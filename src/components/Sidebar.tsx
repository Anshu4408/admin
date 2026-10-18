import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Layers, CreditCard, QrCode, ShieldCheck, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { admin, isSuperAdmin, canManageUsers, canManageTeams, canManagePayments, canManageAdmins, logout } = useAuth();
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, allowed: true },
    { to: '/users', label: 'Participants', icon: Users, allowed: canManageUsers },
    { to: '/teams', label: 'Teams', icon: Layers, allowed: canManageTeams },
    { to: '/payments', label: 'Payments', icon: CreditCard, allowed: canManagePayments },
    { to: '/qr-payments', label: 'QR codes & UTR', icon: QrCode, allowed: canManagePayments },
    { to: '/admins', label: 'Administrators', icon: ShieldCheck, allowed: canManageAdmins || isSuperAdmin },
  ];
  return (
    <aside className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950 lg:fixed lg:bottom-0 lg:left-0 lg:w-60 lg:border-b-0 lg:border-r lg:flex lg:flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-neutral-800 px-4 lg:h-24 lg:px-6">
        <NavLink to="/" onClick={() => setOpen(false)} className="flex min-w-0 items-center gap-3" aria-label="TransfiNITTe admin overview">
          <img src="/motif.svg" alt="" className="h-7 w-10 shrink-0 object-contain" />
          <div><p className="text-sm font-semibold text-white">TransfiNITTe</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-neutral-400">Administration / 2026</p></div>
        </NavLink>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="admin-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-700 text-neutral-200 lg:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <div id="admin-navigation" className={`${open ? 'flex' : 'hidden'} min-h-0 max-h-[calc(100dvh-4rem)] flex-col overflow-y-auto lg:flex lg:max-h-none lg:flex-1`} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
        <nav aria-label="Admin navigation" className="shrink-0 space-y-1 p-3 lg:pt-6">
          <p className="px-3 pb-3 pt-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500">Workspace</p>
          {navItems.filter(item => item.allowed).map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg border px-3 text-[13px] transition-colors ${isActive ? 'border-neutral-700 bg-neutral-800 text-white' : 'border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-white'}`}>
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto shrink-0 space-y-4 border-t border-neutral-800 p-4">
          <div className="flex min-w-0 items-center gap-3">
            {admin?.picture ? <img src={admin.picture} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-sm">{admin?.name?.[0]?.toUpperCase() || 'A'}</div>}
            <div className="min-w-0 flex-1"><p className="truncate text-xs text-neutral-200">{admin?.name || 'Administrator'}</p><p className="mt-1 truncate text-[11px] text-neutral-500" title={admin?.email}>{admin?.email}</p></div>
            <button onClick={() => logout()} aria-label="Sign out" title="Sign out" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </aside>
  );
};

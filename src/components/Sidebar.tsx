import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Layers,
  CreditCard,
  QrCode,
  ShieldCheck,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { admin, isSuperAdmin, canManageUsers, canManageTeams, canManagePayments, canManageAdmins, logout } = useAuth();

  const navItems = [
    {
      to: '/',
      label: 'Overview',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      to: '/users',
      label: 'Users',
      icon: Users,
      allowed: canManageUsers,
    },
    {
      to: '/teams',
      label: 'Teams',
      icon: Layers,
      allowed: canManageTeams,
    },
    {
      to: '/payments',
      label: 'Payments',
      icon: CreditCard,
      allowed: canManagePayments,
    },
    {
      to: '/qr-payments',
      label: 'QR Codes & UTR',
      icon: QrCode,
      allowed: canManagePayments,
    },
    {
      to: '/admins',
      label: 'Admin RBAC',
      icon: ShieldCheck,
      allowed: canManageAdmins || isSuperAdmin,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 shadow-soft">
      {/* Brand Header */}
      <div>
        <div className="p-6 pb-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-500 flex items-center justify-center shadow-md shadow-brand-500/20 text-white font-bold text-base">
              TF
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                TransfiNITTe
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200/60">
                  Admin
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Control Center 2025</p>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <div className="p-3 space-y-1">
          <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Management
          </p>
          {navItems.filter(item => item.allowed).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 border border-brand-200/80 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:text-brand-600 hover:bg-white rounded-xl transition-colors mb-2 border border-transparent hover:border-slate-200"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            Live Portal Site
          </span>
          <span className="text-[11px] text-slate-400">&rarr;</span>
        </a>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between shadow-soft">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {admin?.picture ? (
              <img
                src={admin.picture}
                alt={admin.name || 'Admin'}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center font-bold text-xs text-brand-700">
                {admin?.name ? admin.name[0].toUpperCase() : 'A'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 truncate">{admin?.name || 'Administrator'}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <p className="text-[10px] text-slate-500 capitalize font-medium">{admin?.role || 'Admin'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Users,
  Layers,
  IndianRupee,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/Badge';
import { api } from '../lib/api';
import type { DashboardStats } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingUsers, setExportingUsers] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleUserExport = async () => {
    setExportingUsers(true);
    setExportError(null);
    try {
      await api.users.downloadCsv();
    } catch {
      setExportError('Could not export users. Please try again.');
    } finally {
      setExportingUsers(false);
    }
  };

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const res = await api.dashboard.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const paidRate = stats?.total_teams
    ? Math.round((stats.paid_teams / stats.total_teams) * 100)
    : 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Navbar
        title="Dashboard Overview"
        subtitle="Real-time participant counts, team rosters and payment status"
        actions={
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all shadow-soft disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
            <span>Refresh Data</span>
          </button>
        }
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-7">
        {exportError && <div role="alert" className="p-4 rounded-xl text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-700">{exportError}</div>}
        {/* Top 4 Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard
            title="Total Users"
            value={loading ? '...' : (stats?.total_users ?? 0)}
            subtitle={`${stats?.users_with_team ?? 0} in teams • ${stats?.users_without_team ?? 0} solo`}
            icon={Users}
            color="teal"
          />

          <StatsCard
            title="Total Teams"
            value={loading ? '...' : (stats?.total_teams ?? 0)}
            subtitle={`${stats?.public_teams ?? 0} public squads`}
            icon={Layers}
            color="indigo"
          />

          <StatsCard
            title="Paid & Verified"
            value={loading ? '...' : (stats?.paid_teams ?? 0)}
            subtitle={`${paidRate}% of total teams`}
            icon={CheckCircle2}
            color="emerald"
            trend={`${paidRate}% conversion`}
            trendPositive={paidRate >= 50}
          />

          <StatsCard
            title="Total Revenue"
            value={loading ? '...' : `₹${stats?.total_revenue?.toLocaleString('en-IN') ?? 0}`}
            subtitle="Verified collections"
            icon={IndianRupee}
            color="amber"
          />
        </div>

        {/* 2 Clean Focused Analytics Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Domain Breakdown */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                Domain Distribution
              </h3>
              <span className="text-xs text-slate-400 font-medium">By Squads</span>
            </div>

            <div className="space-y-4">
              {stats?.domain_stats && Object.keys(stats.domain_stats).length > 0 ? (
                Object.entries(stats.domain_stats).map(([domain, count]) => {
                  const pct = stats.total_teams ? Math.round((count / stats.total_teams) * 100) : 0;
                  return (
                    <div key={domain} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">{domain}</span>
                        <span className="text-slate-500 font-medium">{count} squads ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No domain data recorded</p>
              )}
            </div>
          </div>

          {/* Payment & Compliance Health */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Payment Summary
                </h3>
                <span className="text-xs text-slate-400 font-medium">Team Cap: {stats?.team_cap ?? "..."}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-xs font-semibold text-emerald-700 block mb-1">Paid / Approved</span>
                  <h4 className="text-2xl font-bold text-slate-900">{stats?.paid_teams ?? 0}</h4>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">{paidRate}% rate</p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-xs font-semibold text-amber-700 block mb-1">Pending Verification</span>
                  <h4 className="text-2xl font-bold text-slate-900">{stats?.pending_teams ?? 0}</h4>
                  <p className="text-[11px] text-amber-600 font-medium mt-1">{100 - paidRate}% remaining</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Total Active Squads: <strong className="text-slate-800 font-semibold">{stats?.total_teams ?? 0}</strong></span>
              <span>Total Participants: <strong className="text-slate-800 font-semibold">{stats?.total_users ?? 0}</strong></span>
            </div>
          </div>
        </div>

        {/* Live Registrations & Payments Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Registrations */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                Recent Participants
              </h3>
              <button
                onClick={handleUserExport}
                disabled={exportingUsers}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {stats?.recent_registrations && stats.recent_registrations.length > 0 ? (
                stats.recent_registrations.map((user) => (
                  <div key={user.user_id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-brand-700">
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{user.name || 'Participant'}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{user.email}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        user.team_id ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.team_id || 'Solo'}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No participants registered yet</p>
              )}
            </div>
          </div>

          {/* Recent Payments Feed */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Recent Payments
              </h3>
              <button
                onClick={() => api.payments.downloadCsv()}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {stats?.recent_payments && stats.recent_payments.length > 0 ? (
                stats.recent_payments.map((p) => (
                  <div key={p.payment_id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {p.team_name || p.team_id}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {p.order_id || p.payment_id}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-bold text-slate-900">₹{p.amount}</span>
                        <StatusBadge status={p.payment_status} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No payment transactions recorded</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Pagination as PaginationControls } from '../components/Pagination';
import { StatusBadge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import type { Payment, Pagination } from '../types';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchPayments = useCallback(async (pageToLoad = 1) => {
    setLoading(true);
    try {
      const res = await api.payments.list({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        page: pageToLoad,
        limit: 10,
      });

      if (res.success && res.data) {
        setPayments(res.data.payments || []);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPayments]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Navbar
        title="Payment Transactions"
        subtitle={`${pagination.total} payment records`}
        actions={
          <button
            onClick={() => api.payments.downloadCsv()}
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
              placeholder="Search by order ID, team ID, squad name, transaction ID, or participant email..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-brand-500 font-medium"
            >
              <option value="">All Payment Records</option>
              <option value="SUCCESS">SUCCESS / PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED / CANCELLED</option>
            </select>

            {(search || statusFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                }}
                className="px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-100 rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl overflow-hidden">

          <div className="record-list min-w-0">
            <table role="table" className="record-table payments-table w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-300 border-b border-neutral-800 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Order / Payment ID</th>
                  <th className="py-3.5 px-4">Team Squad</th>
                  <th className="py-3.5 px-4">Paid By</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Gateway Reference</th>
                  <th className="py-3.5 px-5 text-right">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800 text-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                        <span className="font-medium">Fetching payment transaction logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8">
                      <EmptyState
                        icon={CreditCard}
                        title="No payment logs found"
                        description="No transactions match your current search or filter query."
                      />
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.payment_id} className="hover:bg-neutral-950/80 transition-colors">
                      <td data-label="Order / Payment ID" className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-semibold text-neutral-50">{p.order_id || p.payment_id}</span>
                          <button data-icon-button
                            aria-label="Copy payment reference"
                            title="Copy payment reference"
                            onClick={() => copyToClipboard(p.order_id || p.payment_id)}
                            className="p-0.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-brand-600 transition-colors"
                          >
                            {copiedId === (p.order_id || p.payment_id) ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td data-label="Team Squad" className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-neutral-100">{p.team_name || p.team_id}</p>
                          <span className="text-xs text-neutral-400 font-mono font-medium">{p.team_id}</span>
                        </div>
                      </td>

                      <td data-label="Paid By" className="py-3.5 px-4">
                        <div>
                          <p className="font-medium text-neutral-100">{p.user_name || 'System / Direct'}</p>
                          {p.user_email && <p className="text-xs text-neutral-400">{p.user_email}</p>}
                        </div>
                      </td>

                      <td data-label="Amount" className="py-3.5 px-4">
                        <span className="font-semibold text-neutral-50 text-sm">
                          ₹{p.amount?.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td data-label="Status" className="py-3.5 px-4">
                        <StatusBadge status={p.payment_status} />
                      </td>

                      <td data-label="Gateway Reference" className="py-3.5 px-4 font-mono text-xs text-neutral-300 font-medium">
                        {p.transaction_id || <span className="italic text-neutral-400 font-normal">Automated Gateway</span>}
                        {p.raw_webhook_data && (
                          <span className="block text-xs text-neutral-400 truncate max-w-xs">{p.raw_webhook_data}</span>
                        )}
                      </td>

                      <td data-label="Date" className="py-3.5 px-5 text-right text-xs text-neutral-400 font-medium">
                        <div>
                          <span className="text-neutral-100 font-semibold block">{new Date(p.created_at).toLocaleDateString()}</span>
                          <span>{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <PaginationControls pagination={pagination} onPageChange={fetchPayments} noun="records" />
        </div>
      </main>
    </div>
  );
};

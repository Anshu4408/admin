import React, { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  Upload,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Eye,
  ExternalLink,
  CheckCircle,
  Edit2,
  Plus,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { api, getMediaUrl, loadPaymentScreenshot } from '../lib/api';
import type { QRCode, QRPayment } from '../types';

export const QRPaymentsPage: React.FC = () => {
  // Tabs: 'qrs' (Rotating QR Codes) or 'submissions' (UTR Submissions)
  const [activeTab, setActiveTab] = useState<'qrs' | 'submissions'>('qrs');

  // QR Codes state
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [loadingQrs, setLoadingQrs] = useState(true);

  // Submissions state
  const [submissions, setSubmissions] = useState<QRPayment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  // Action states
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Upload/Edit QR Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadSlotIndex, setUploadSlotIndex] = useState<number>(0);
  const [uploadLabel, setUploadLabel] = useState<string>('');
  const [uploadUpiId, setUploadUpiId] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadImageUrl, setUploadImageUrl] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmittingQR, setIsSubmittingQR] = useState(false);

  // Reject Modal
  const [rejectPaymentTarget, setRejectPaymentTarget] = useState<QRPayment | null>(null);
  const [rejectNote, setRejectNote] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Direct Manual Team Verification Modal
  const [isManualTeamModalOpen, setIsManualTeamModalOpen] = useState(false);
  const [manualTeamId, setManualTeamId] = useState<string>('');
  const [isVerifyingTeam, setIsVerifyingTeam] = useState(false);

  // Image Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    const url = lightboxImage?.url;
    return () => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); };
  }, [lightboxImage]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Fetch QR codes & current rotation slot
  const fetchQRCodes = useCallback(async () => {
    setLoadingQrs(true);
    try {
      const [codesRes, activeRes] = await Promise.all([
        api.qr.getCodes().catch(() => ({ success: false, data: [] })),
        api.qr.getActive().catch(() => ({ success: false, data: { qr: null, slot_index: 0 } })),
      ]);

      if (codesRes.success) {
        setQrCodes(Array.isArray(codesRes.data) ? codesRes.data : []);
      }
      if (activeRes.success) {
        setActiveSlot(activeRes.data?.slot_index ?? (activeRes as any).slot_index ?? 0);
      } else if ((activeRes as any)?.slot !== undefined) {
        setActiveSlot((activeRes as any).slot);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to fetch QR codes');
    } finally {
      setLoadingQrs(false);
    }
  }, []);

  // Fetch UTR payment submissions
  const fetchSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const res = await api.qr.getPayments({ status: statusFilter || undefined });
      if (res.success) {
        setSubmissions(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to fetch submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchQRCodes();
  }, [fetchQRCodes]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Open Upload Modal with optional prefilled slot
  const handleOpenUploadModal = (slot: number = 0) => {
    const existing = qrCodes.find((q) => q.slot_index === slot);
    setUploadSlotIndex(slot);
    setUploadLabel(existing?.label || `QR Slot ${slot + 1}`);
    setUploadUpiId(existing?.upi_id || '');
    setUploadFile(null);
    setUploadImageUrl(existing?.image_url || '');
    setImagePreview(existing?.image_url ? getMediaUrl(existing.image_url) : null);
    setIsUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', 'Image size must be less than 5MB');
        return;
      }
      setUploadFile(file);
      setUploadImageUrl('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !uploadImageUrl) {
      showNotification('error', 'Please upload a QR code image or provide an image URL');
      return;
    }

    setIsSubmittingQR(true);
    try {
      const formData = new FormData();
      formData.append('slot_index', uploadSlotIndex.toString());
      formData.append('label', uploadLabel.trim());
      formData.append('upi_id', uploadUpiId.trim());

      if (uploadFile) {
        formData.append('image', uploadFile);
      } else if (uploadImageUrl) {
        formData.append('image_url', uploadImageUrl.trim());
      }

      const res = await api.qr.upsertCode(formData);
      if (res.success) {
        showNotification('success', `QR Code for Slot ${uploadSlotIndex} updated successfully!`);
        setIsUploadModalOpen(false);
        fetchQRCodes();
      } else {
        showNotification('error', res.message || 'Failed to update QR code');
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Error uploading QR code');
    } finally {
      setIsSubmittingQR(false);
    }
  };

  // Approve UTR payment
  const handleApprovePayment = async (payment: QRPayment) => {
    setProcessingId(payment.id);
    try {
      const res = await api.qr.approvePayment(payment.id);
      if (res.success) {
        showNotification('success', `Payment for team ${payment.team_id} approved and marked PAID!`);
        fetchSubmissions();
      } else {
        showNotification('error', res.message || 'Approval failed');
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Error approving payment');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject UTR payment
  const handleRejectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectPaymentTarget) return;

    setIsRejecting(true);
    try {
      const res = await api.qr.rejectPayment(rejectPaymentTarget.id, rejectNote.trim());
      if (res.success) {
        showNotification('success', `Payment rejected and team ${rejectPaymentTarget.team_id} status reverted to Pending`);
        setRejectPaymentTarget(null);
        setRejectNote('');
        fetchSubmissions();
      } else {
        showNotification('error', res.message || 'Rejection failed');
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Error rejecting payment');
    } finally {
      setIsRejecting(false);
    }
  };

  // Manual direct team verification (mark ANY team as PAID)
  const handleManualTeamVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tid = manualTeamId.trim();
    if (!tid) return;

    setIsVerifyingTeam(true);
    try {
      const res = await api.teams.updatePaymentStatus(tid, 'PAID');
      if (res.success) {
        showNotification('success', `Team ${tid} payment status successfully updated to PAID!`);
        setIsManualTeamModalOpen(false);
        setManualTeamId('');
      } else {
        showNotification('error', res.message || 'Verification failed');
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || `Failed to update team ${tid}`);
    } finally {
      setIsVerifyingTeam(false);
    }
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.team_id?.toLowerCase().includes(q) ||
      p.utr?.toLowerCase().includes(q) ||
      p.admin_note?.toLowerCase().includes(q) ||
      p.verified_by?.toLowerCase().includes(q)
    );
  });

  const pendingCount = submissions.filter((p) => p.status?.toLowerCase() === 'processing').length;
  const paidCount = submissions.filter((p) => p.status?.toLowerCase() === 'paid').length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC]">
      <Navbar
        title="QR Codes & UTR Verification"
        subtitle="Upload and manage rotating payment QR codes and verify participant UTR transactions"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchQRCodes();
                fetchSubmissions();
              }}
              title="Refresh Data"
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-soft"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsManualTeamModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all shadow-soft"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Direct Team Verify</span>
            </button>
            <button
              onClick={() => handleOpenUploadModal(0)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-all shadow-soft"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload QR Code</span>
            </button>
          </div>
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

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Live QR Slot */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-soft">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span>Live Rotating Slot</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-slate-900">
                Slot {activeSlot !== null ? activeSlot : 0}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Active in Rotation
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              {qrCodes.find((q) => q.slot_index === activeSlot)?.label || 'Current client checkout target'}
            </p>
          </div>

          {/* Configured Slots */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-soft">
            <div className="text-xs text-slate-500 font-medium mb-1">Configured QR Slots</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-slate-900">{qrCodes.length}</span>
              <span className="text-xs text-slate-500">of 4 total slots</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Rotating across participant submissions</p>
          </div>

          {/* Pending Submissions */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-soft">
            <div className="text-xs text-slate-500 font-medium mb-1">Pending Verification</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-amber-600">{pendingCount}</span>
              <span className="text-xs text-slate-500">submissions</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Requires admin approval or rejection</p>
          </div>

          {/* Verified Payments */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-soft">
            <div className="text-xs text-slate-500 font-medium mb-1">Verified via QR</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-emerald-600">{paidCount}</span>
              <span className="text-xs text-slate-500">teams marked PAID</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Approved offline transactions</p>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('qrs')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'qrs'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Rotating QR Codes (Slots 0 - 3)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
              {qrCodes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'submissions'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>UTR Payment Submissions</span>
            {pendingCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold animate-pulse">
                {pendingCount} Pending
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                {submissions.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: QR CODES GRID */}
        {activeTab === 'qrs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Configured Rotating QR Slots</h3>
                <p className="text-xs text-slate-500">
                  The backend automatically rotates through these 4 slots so payments are evenly distributed.
                </p>
              </div>
              <button
                onClick={() => handleOpenUploadModal(0)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-soft transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Update QR</span>
              </button>
            </div>

            {loadingQrs ? (
              <div className="p-12 text-center text-slate-500 bg-white border border-slate-200/80 rounded-2xl">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                  <span className="text-xs font-medium">Loading QR slots...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[0, 1, 2, 3].map((slotIdx) => {
                  const qr = qrCodes.find((q) => q.slot_index === slotIdx);
                  const isLive = activeSlot === slotIdx;

                  return (
                    <div
                      key={slotIdx}
                      className={`bg-white rounded-2xl border transition-all shadow-soft flex flex-col justify-between overflow-hidden ${
                        isLive ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200/80'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-800">Slot {slotIdx}</span>
                          {isLive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleOpenUploadModal(slotIdx)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 p-1 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{qr ? 'Replace' : 'Upload'}</span>
                        </button>
                      </div>

                      {/* QR Preview Area */}
                      <div className="p-5 flex flex-col items-center justify-center min-h-[220px]">
                        {qr?.image_url ? (
                          <div className="relative group">
                            <img
                              src={getMediaUrl(qr.image_url)}
                              alt={qr.label || `QR Slot ${slotIdx}`}
                              className="w-40 h-40 object-contain rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition-transform group-hover:scale-105"
                            />
                            <button
                              onClick={() =>
                                setLightboxImage({
                                  url: getMediaUrl(qr.image_url),
                                  title: qr.label || `QR Slot ${slotIdx}`,
                                })
                              }
                              className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1.5 transition-opacity"
                            >
                              <Maximize2 className="w-4 h-4" />
                              <span>View Full</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl w-full">
                            <QrCode className="w-10 h-10 text-slate-300 mb-2" />
                            <p className="text-xs font-bold text-slate-700">Not Configured</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">No QR image assigned to Slot {slotIdx}</p>
                            <button
                              onClick={() => handleOpenUploadModal(slotIdx)}
                              className="mt-3 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-xl border border-brand-200/80 transition-colors"
                            >
                              Upload QR
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Details & Info */}
                      <div className="p-4 border-t border-slate-100 bg-white space-y-2">
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Label</p>
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {qr?.label || <span className="text-slate-400 italic">Empty Slot</span>}
                          </p>
                        </div>

                        {qr?.upi_id && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">UPI ID</p>
                            <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60 font-mono text-xs text-slate-700">
                              <span className="truncate">{qr.upi_id}</span>
                              <button
                                onClick={() => copyToClipboard(qr.upi_id!)}
                                className="p-0.5 text-slate-400 hover:text-brand-600 transition-colors"
                                title="Copy UPI ID"
                              >
                                {copiedText === qr.upi_id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {qr?.updated_at && (
                          <p className="text-[10px] text-slate-400 pt-1">
                            Updated {new Date(qr.updated_at).toLocaleDateString()} at{' '}
                            {new Date(qr.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: UTR PAYMENT SUBMISSIONS */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            {/* Search & Status Filters */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-soft flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Team ID, UTR reference number, or admin notes..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 font-medium transition-colors"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Status:</span>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-brand-500 font-medium"
                >
                  <option value="">All Submissions</option>
                  <option value="processing">Processing (Pending Review)</option>
                  <option value="paid">Paid (Approved)</option>
                  <option value="rejected">Rejected</option>
                </select>

                {(searchQuery || statusFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('');
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                    <tr>
                      <th className="py-3.5 px-5">Team ID</th>
                      <th className="py-3.5 px-4">UTR / Transaction Ref</th>
                      <th className="py-3.5 px-4">Amount & Slot</th>
                      <th className="py-3.5 px-4">Proof Screenshot</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Submitted At</th>
                      <th className="py-3.5 px-4">Audit Note</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loadingSubmissions ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                            <span className="font-medium">Loading UTR payment submissions...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8">
                          <EmptyState
                            icon={CheckCircle2}
                            title="No UTR submissions found"
                            description={
                              searchQuery || statusFilter
                                ? 'No payment records match your active search filter.'
                                : 'Participants who submit payments via rotating QR will appear here for verification.'
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((sub) => {
                        const isProcessing = sub.status?.toLowerCase() === 'processing';
                        const isPaid = sub.status?.toLowerCase() === 'paid';

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Team ID */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="font-bold text-slate-900">{sub.team_id}</span>
                                <button
                                  onClick={() => copyToClipboard(sub.team_id)}
                                  className="p-0.5 text-slate-400 hover:text-brand-600 transition-colors"
                                  title="Copy Team ID"
                                >
                                  {copiedText === sub.team_id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* UTR */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 font-mono bg-slate-100/80 px-2 py-1 rounded-lg w-fit border border-slate-200">
                                <span className="font-bold text-slate-900 text-xs">{sub.utr}</span>
                                <button
                                  onClick={() => copyToClipboard(sub.utr)}
                                  className="p-0.5 text-slate-400 hover:text-brand-600 transition-colors"
                                  title="Copy UTR"
                                >
                                  {copiedText === sub.utr ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Amount & Slot */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-xs">
                                  ₹{sub.amount?.toLocaleString('en-IN') || '400'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">Slot {sub.qr_slot_index}</span>
                              </div>
                            </td>

                            {/* Screenshot Proof */}
                            <td className="py-3.5 px-4">
                              {sub.screenshot_url ? (
                                <button
                                  onClick={async () => {
                                    try {
                                      const url = await loadPaymentScreenshot(sub.screenshot_url!);
                                      setLightboxImage({ url, title: `Payment Proof - Team ${sub.team_id} (UTR: ${sub.utr})` });
                                    } catch { showNotification('error', 'Could not load payment screenshot'); }
                                  }}
                                  className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200/60 font-semibold transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Slip</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No image attached</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <StatusBadge status={sub.status} />
                            </td>

                            {/* Submitted At */}
                            <td className="py-3.5 px-4 text-[11px] text-slate-500 font-medium">
                              <div>
                                <span className="text-slate-800 font-semibold block">
                                  {new Date(sub.submitted_at).toLocaleDateString()}
                                </span>
                                <span>
                                  {new Date(sub.submitted_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </td>

                            {/* Audit Note / Verified By */}
                            <td className="py-3.5 px-4 text-[11px] text-slate-500">
                              {sub.admin_note ? (
                                <span className="text-slate-800 font-medium block truncate max-w-xs">
                                  {sub.admin_note}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">None</span>
                              )}
                              {sub.verified_by && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                                  By: {sub.verified_by}
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isProcessing && (
                                  <>
                                    <button
                                      onClick={() => handleApprovePayment(sub)}
                                      disabled={processingId === sub.id}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-soft transition-all disabled:opacity-50"
                                      title="Verify UTR and mark team as PAID"
                                    >
                                      {processingId === sub.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Check className="w-3 h-3" />
                                      )}
                                      <span>Approve</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setRejectPaymentTarget(sub);
                                        setRejectNote('');
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors"
                                      title="Reject payment"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      <span>Reject</span>
                                    </button>
                                  </>
                                )}

                                {isPaid && (
                                  <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200/60">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Verified</span>
                                  </span>
                                )}

                                {!isProcessing && !isPaid && (
                                  <button
                                    onClick={() => handleApprovePayment(sub)}
                                    disabled={processingId === sub.id}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-soft transition-all disabled:opacity-50"
                                    title="Re-approve payment"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Re-approve</span>
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
          </div>
        )}
      </main>

      {/* UPLOAD / UPDATE QR CODE MODAL */}
      {isUploadModalOpen && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title={`Upload / Update QR Code (Slot ${uploadSlotIndex})`}
          subtitle="Configure one of the rotating QR payment slots for participants"
          maxWidth="md"
        >
          <form onSubmit={handleQRSubmit} className="space-y-4">
            {/* Slot index selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rotating Slot Index <span className="text-rose-500">*</span>
              </label>
              <select
                value={uploadSlotIndex}
                onChange={(e) => {
                  const s = parseInt(e.target.value, 10);
                  setUploadSlotIndex(s);
                  const existing = qrCodes.find((q) => q.slot_index === s);
                  if (existing) {
                    setUploadLabel(existing.label);
                    setUploadUpiId(existing.upi_id || '');
                    setUploadImageUrl(existing.image_url);
                    setImagePreview(getMediaUrl(existing.image_url));
                    setUploadFile(null);
                  }
                }}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-500"
              >
                <option value={0}>Slot 0 {activeSlot === 0 ? '(Currently Active)' : ''}</option>
                <option value={1}>Slot 1 {activeSlot === 1 ? '(Currently Active)' : ''}</option>
                <option value={2}>Slot 2 {activeSlot === 2 ? '(Currently Active)' : ''}</option>
                <option value={3}>Slot 3 {activeSlot === 3 ? '(Currently Active)' : ''}</option>
              </select>
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Label / Display Name
              </label>
              <input
                type="text"
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                placeholder="e.g. HDFC Merchant Account, Treasurer UPI"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* UPI ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Associated UPI ID (Optional)
              </label>
              <input
                type="text"
                value={uploadUpiId}
                onChange={(e) => setUploadUpiId(e.target.value)}
                placeholder="e.g. transfinitte26@okaxis or 9876543210@paytm"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-medium focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Image Upload Area */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                QR Code Image <span className="text-rose-500">*</span>
              </label>

              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="space-y-2 text-center">
                  {imagePreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-contain rounded-xl border border-slate-200 bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFile(null);
                          setUploadImageUrl('');
                          setImagePreview(null);
                        }}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <>
                      <QrCode className="mx-auto h-10 w-10 text-slate-400" />
                      <div className="flex text-xs text-slate-600 justify-center">
                        <label
                          htmlFor="qr-file-upload"
                          className="relative cursor-pointer rounded-md font-bold text-brand-600 hover:text-brand-500 focus-within:outline-none"
                        >
                          <span>Upload an image</span>
                          <input
                            id="qr-file-upload"
                            name="image"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            className="sr-only"
                            onChange={handleFileChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-[10px] text-slate-400">PNG, JPG, or WEBP up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Image URL fallback */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Or direct image URL (Optional)
              </label>
              <input
                type="text"
                value={uploadImageUrl}
                onChange={(e) => {
                  setUploadImageUrl(e.target.value);
                  if (e.target.value) {
                    setImagePreview(getMediaUrl(e.target.value));
                    setUploadFile(null);
                  }
                }}
                placeholder="https://example.com/qr-image.png or /uploads/qr-codes/..."
                className="w-full px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingQR}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-soft disabled:opacity-50"
              >
                {isSubmittingQR ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving QR...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Save QR Code</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* REJECT SUBMISSION MODAL */}
      {rejectPaymentTarget && (
        <Modal
          isOpen={!!rejectPaymentTarget}
          onClose={() => setRejectPaymentTarget(null)}
          title="Reject UTR Payment Submission"
          subtitle={`Reject payment for Team ${rejectPaymentTarget.team_id} and revert their status to Pending`}
          maxWidth="md"
        >
          <form onSubmit={handleRejectPayment} className="space-y-4">
            <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3 text-xs text-rose-800">
              <p className="font-bold">Team: {rejectPaymentTarget.team_id}</p>
              <p className="font-mono mt-0.5">Submitted UTR: {rejectPaymentTarget.utr}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason / Admin Note (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. UTR did not match bank statement, or amount paid was insufficient"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectPaymentTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRejecting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-soft disabled:opacity-50"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DIRECT TEAM MANUAL VERIFY MODAL */}
      {isManualTeamModalOpen && (
        <Modal
          isOpen={isManualTeamModalOpen}
          onClose={() => setIsManualTeamModalOpen(false)}
          title="Direct Team Payment Verification"
          subtitle="Manually approve payment and mark any team as PAID in the system"
          maxWidth="md"
        >
          <form onSubmit={handleManualTeamVerifySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Team ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={manualTeamId}
                onChange={(e) => setManualTeamId(e.target.value)}
                placeholder="e.g. TEAM-ABC12345 or full team code"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:outline-none focus:border-brand-500"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter the exact Team ID. This will update the team's payment_status to PAID immediately.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsManualTeamModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifyingTeam}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-soft disabled:opacity-50"
              >
                {isVerifyingTeam ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Team...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Mark as PAID</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* IMAGE LIGHTBOX / PREVIEW MODAL */}
      {lightboxImage && (
        <Modal
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          title={lightboxImage.title}
          maxWidth="lg"
        >
          <div className="flex flex-col items-center justify-center p-2">
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-h-[70vh] max-w-full object-contain rounded-xl border border-slate-200 bg-slate-50"
            />
            <div className="mt-4 flex items-center justify-between w-full pt-3 border-t border-slate-100">
              <a
                href={lightboxImage.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in full resolution</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

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
  Link2,
  FileImage,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { api, getMediaUrl, loadPaymentScreenshot } from '../lib/api';
import type { QRCode, QRPayment, QRPaymentRecipientSummary, Team } from '../types';

export const QRPaymentsPage: React.FC = () => {
  // Tabs: 'qrs' (Rotating QR Codes) or 'submissions' (UTR Submissions)
  const [activeTab, setActiveTab] = useState<'qrs' | 'submissions'>('qrs');

  // QR Codes state
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [loadingQrs, setLoadingQrs] = useState(true);
  const [recipientSummaries, setRecipientSummaries] = useState<QRPaymentRecipientSummary[]>([]);

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

  const [reverseTarget, setReverseTarget] = useState<QRPayment | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseConfirmed, setReverseConfirmed] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [isReversing, setIsReversing] = useState(false);

  // Direct Manual Team Verification Modal
  const [isManualTeamModalOpen, setIsManualTeamModalOpen] = useState(false);
  const [manualTeamId, setManualTeamId] = useState<string>('');
  const [isVerifyingTeam, setIsVerifyingTeam] = useState(false);

  // Image Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [lightboxPayment, setLightboxPayment] = useState<QRPayment | null>(null);

  // Teams list for mapping picker
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);

  // Remap Payment Modal State
  const [remapTarget, setRemapTarget] = useState<QRPayment | null>(null);
  const [remapTargetTeamId, setRemapTargetTeamId] = useState<string>('');
  const [remapTargetQrSlot, setRemapTargetQrSlot] = useState<number>(0);
  const [remapTeamSearch, setRemapTeamSearch] = useState<string>('');
  const [remapApprove, setRemapApprove] = useState<boolean>(true);
  const [remapNote, setRemapNote] = useState<string>('');
  const [isRemapping, setIsRemapping] = useState<boolean>(false);
  const [remapError, setRemapError] = useState<string | null>(null);
  const [remapScreenshotUrl, setRemapScreenshotUrl] = useState<string | null>(null);

  // Direct Create Mapped Payment Modal State
  const [isCreateMappedModalOpen, setIsCreateMappedModalOpen] = useState(false);
  const [newMappedTeamId, setNewMappedTeamId] = useState<string>('');
  const [newMappedTeamSearch, setNewMappedTeamSearch] = useState<string>('');
  const [newMappedUtr, setNewMappedUtr] = useState<string>('');
  const [newMappedAmount, setNewMappedAmount] = useState<number>(400);
  const [newMappedFile, setNewMappedFile] = useState<File | null>(null);
  const [newMappedPreview, setNewMappedPreview] = useState<string | null>(null);
  const [newMappedApprove, setNewMappedApprove] = useState<boolean>(true);
  const [newMappedNote, setNewMappedNote] = useState<string>('');
  const [isCreatingMapped, setIsCreatingMapped] = useState<boolean>(false);
  const [newMappedError, setNewMappedError] = useState<string | null>(null);

  useEffect(() => {
    const url = lightboxImage?.url;
    return () => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); };
  }, [lightboxImage]);

  // Revoke the exact URL owned by this request, including late responses after closing.
  useEffect(() => {
    let active = true;
    let ownedUrl: string | null = null;
    setRemapScreenshotUrl(null);
    if (remapTarget?.screenshot_url) {
      loadPaymentScreenshot(remapTarget.screenshot_url).then(url => {
        if (!active) { URL.revokeObjectURL(url); return; }
        ownedUrl = url;
        setRemapScreenshotUrl(url);
      }).catch(() => { if (active) setRemapScreenshotUrl(null); });
    }
    return () => { active = false; if (ownedUrl) URL.revokeObjectURL(ownedUrl); };
  }, [remapTarget]);

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
      const [codesRes, activeRes, recipientsRes] = await Promise.all([
        api.qr.getCodes().catch(() => ({ success: false, data: [] })),
        api.qr.getActive().catch(() => ({ success: false, data: { qr: null, slot_index: 0 } })),
        api.qr.getRecipientSummaries().catch(() => ({ success: false, data: [] })),
      ]);

      if (codesRes.success) {
        setQrCodes(Array.isArray(codesRes.data) ? codesRes.data : []);
      }
      if (activeRes.success) {
        setActiveSlot(activeRes.data?.slot_index ?? (activeRes as any).slot_index ?? 0);
      } else if ((activeRes as any)?.slot !== undefined) {
        setActiveSlot((activeRes as any).slot);
      }
      if (recipientsRes.success) {
        setRecipientSummaries(Array.isArray(recipientsRes.data) ? recipientsRes.data : []);
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

  const fetchAllTeams = useCallback(async () => {
    try {
      const res = await api.teams.list({ limit: 1000 });
      if (res.success && res.data?.teams) {
        setAvailableTeams(res.data.teams);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchQRCodes();
    fetchAllTeams();
  }, [fetchQRCodes, fetchAllTeams]);

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

  const handleMarkUnpaid = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reverseTarget || !reverseConfirmed || !reverseReason.trim() || isReversing) return;
    setIsReversing(true);
    setReverseError(null);
    try {
      const res = await api.qr.reversePayment(reverseTarget.id, reverseReason.trim());
      if (!res.success) throw new Error(res.message || 'Could not mark payment unpaid');
      showNotification('success', `Team ${reverseTarget.team_id} is now unpaid (Pending). The correction is recorded.`);
      setReverseTarget(null);
      setReverseReason('');
      setReverseConfirmed(false);
      await fetchSubmissions();
    } catch (error: any) {
      const missingUpdate = error.response?.status === 404;
      setReverseError(missingUpdate
        ? error.response?.data?.message || 'The payment could not be found or the backend update is not deployed yet.'
        : error.response?.data?.message || error.message || 'Could not mark payment unpaid');
    } finally {
      setIsReversing(false);
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

  // Submit Remap payment to target team
  const handleRemapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remapTarget || isRemapping) return;
    const tid = remapTargetTeamId.trim();
    if (!tid) {
      setRemapError('Please select or enter the target Team ID');
      return;
    }

    setIsRemapping(true);
    setRemapError(null);
    try {
      const res = await api.qr.remapPayment(remapTarget.id, {
        target_team_id: tid,
        target_qr_slot_index: remapTargetQrSlot,
        admin_note: remapNote.trim(),
        approve: remapApprove,
      });

      if (res.success) {
        showNotification('success', res.message || `Payment mapped to team ${tid} successfully!`);
        setRemapTarget(null);
        setRemapTargetTeamId('');
        setRemapTargetQrSlot(remapTarget.qr_slot_index);
        setRemapTeamSearch('');
        setRemapNote('');
        fetchSubmissions();
        fetchAllTeams();
      } else {
        setRemapError(res.message || 'Failed to remap payment');
      }
    } catch (err: any) {
      setRemapError(err.response?.data?.message || err.message || 'Failed to remap payment');
    } finally {
      setIsRemapping(false);
    }
  };

  // Submit Direct Created Mapped Payment
  const handleCreateMappedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingMapped) return;
    setNewMappedError(null);
    const tid = newMappedTeamId.trim();
    const utrVal = newMappedUtr.trim();
    if (!tid) {
      setNewMappedError('Please select or enter the target Team ID');
      return;
    }
    if (utrVal.length < 6 || utrVal.length > 64) {
      setNewMappedError('UTR must contain 6 to 64 characters');
      return;
    }
    if (!newMappedFile) {
      setNewMappedError('Please upload the payment screenshot proof');
      return;
    }

    setIsCreatingMapped(true);
    try {
      const formData = new FormData();
      formData.append('team_id', tid);
      formData.append('utr', utrVal);
      formData.append('amount', String(newMappedAmount));
      formData.append('approve', newMappedApprove ? 'true' : 'false');
      formData.append('admin_note', newMappedNote.trim());
      formData.append('screenshot', newMappedFile);

      const res = await api.qr.createMappedPayment(formData);
      if (res.success) {
        showNotification('success', `Payment mapped from screenshot to team ${tid} successfully!`);
        setIsCreateMappedModalOpen(false);
        setNewMappedTeamId('');
        setNewMappedUtr('');
        setNewMappedFile(null);
        setNewMappedPreview(null);
        fetchSubmissions();
        fetchAllTeams();
      } else {
        setNewMappedError(res.message || 'Failed to record mapped payment');
      }
    } catch (err: any) {
      setNewMappedError(err.response?.data?.message || 'Error creating mapped payment');
    } finally {
      setIsCreatingMapped(false);
    }
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.team_id?.toLowerCase().includes(q) ||
      p.team_name?.toLowerCase().includes(q) ||
      p.team_leader?.toLowerCase().includes(q) ||
      p.utr?.toLowerCase().includes(q) ||
      p.admin_note?.toLowerCase().includes(q) ||
      p.verified_by?.toLowerCase().includes(q)
    );
  });

  const pendingCount = submissions.filter((p) => p.status?.toLowerCase() === 'processing').length;
  const paidCount = submissions.filter((p) => p.status?.toLowerCase() === 'paid').length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-neutral-950">
      <Navbar
        title="QR codes & payment review"
        subtitle="Upload and manage rotating payment QR codes and verify participant UTR transactions"
        actions={
          <div className="flex items-center gap-2">
            <button data-icon-button
              onClick={() => {
                fetchQRCodes();
                fetchSubmissions();
                fetchAllTeams();
              }}
              title="Refresh Data"
              className="p-2 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-neutral-50 hover:bg-neutral-950 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setIsCreateMappedModalOpen(true);
                setNewMappedError(null);
                setNewMappedTeamId('');
                setNewMappedTeamSearch('');
                setNewMappedUtr('');
                setNewMappedAmount(400);
                setNewMappedFile(null);
                setNewMappedPreview(null);
                setNewMappedApprove(true);
                setNewMappedNote('');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-500/40 bg-brand-500/10 hover:bg-brand-500/20 text-xs font-semibold text-brand-400 transition-all"
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>Map New Screenshot</span>
            </button>
            <button
              onClick={() => setIsManualTeamModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-950 text-xs font-semibold text-neutral-200 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Find team payment</span>
            </button>
            <button
              onClick={() => handleOpenUploadModal(0)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload QR Code</span>
            </button>
          </div>
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

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Active Live QR Slot */}
          <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-medium mb-1">
              <span>Live Rotating Slot</span>
              <span className="flex h-2 w-2 relative">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold text-neutral-50">
                Slot {activeSlot !== null ? activeSlot : 0}
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                Active in Rotation
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 truncate">
              {qrCodes.find((q) => q.slot_index === activeSlot)?.label || 'Current client checkout target'}
            </p>
          </div>

          {/* Configured Slots */}
          <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl p-4">
            <div className="text-xs text-neutral-400 font-medium mb-1">Configured QR Slots</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold text-neutral-50">{qrCodes.length}</span>
              <span className="text-xs text-neutral-400">of 4 total slots</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Rotating across participant submissions</p>
          </div>

          {/* Pending Submissions */}
          <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl p-4">
            <div className="text-xs text-neutral-400 font-medium mb-1">Pending Verification</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold text-amber-400">{pendingCount}</span>
              <span className="text-xs text-neutral-400">submissions</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Requires admin approval or rejection</p>
          </div>

          {/* Verified Payments */}
          <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl p-4">
            <div className="text-xs text-neutral-400 font-medium mb-1">Verified via QR</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-semibold text-emerald-400">{paidCount}</span>
              <span className="text-xs text-neutral-400">teams marked PAID</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Approved offline transactions</p>
          </div>
        </div>

        <section className="bg-neutral-900 border border-neutral-800/80 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-50">Payment receipts by QR</h3>
              <p className="text-xs text-neutral-400">
                Amounts grouped by the QR slot recorded on each submission. Paid totals exclude processing, rejected, and reversed payments.
              </p>
            </div>
            <span className="text-xs text-neutral-500">Historical records included</span>
          </div>
          {recipientSummaries.length === 0 ? (
            <p className="text-xs text-neutral-500 py-3">No configured QR recipients or payment records found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {recipientSummaries.map((summary) => (
                <div key={summary.slot_index} className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-neutral-100">{summary.label}</p>
                      <p className="text-[11px] text-neutral-500">Slot {summary.slot_index}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">₹{summary.paid_amount.toFixed(2)}</span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-400 truncate" title={summary.upi_id || 'UPI recipient not configured'}>
                    Received by: <span className="text-neutral-200">{summary.upi_id || 'UPI ID not configured'}</span>
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p className="text-neutral-500">Paid</p>
                      <p className="text-emerald-400">{summary.paid_count}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Review</p>
                      <p className="text-amber-400">₹{summary.processing_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">All records</p>
                      <p className="text-neutral-200">{summary.payment_count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tab Toggle Navigation */}
        <div className="qr-tabs flex flex-col gap-1 border-b border-neutral-800 sm:flex-row sm:gap-4">
          <button
            onClick={() => setActiveTab('qrs')}
            className={`flex min-w-0 flex-wrap items-center justify-start gap-2 px-3 py-3 text-left text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'qrs'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-neutral-400 hover:text-neutral-100'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR codes</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-800 text-neutral-200 font-semibold">
              {qrCodes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex min-w-0 flex-wrap items-center justify-start gap-2 px-3 py-3 text-left text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'submissions'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-neutral-400 hover:text-neutral-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Payment submissions</span>
            {pendingCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-400 font-semibold">
                {pendingCount} Pending
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-800 text-neutral-200 font-semibold">
                {submissions.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: QR CODES GRID */}
        {activeTab === 'qrs' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-50">Configured Rotating QR Slots</h3>
                <p className="text-xs text-neutral-400">
                  The backend automatically rotates through these 4 slots so payments are evenly distributed.
                </p>
              </div>
              <button
                onClick={() => handleOpenUploadModal(0)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Update QR</span>
              </button>
            </div>

            {loadingQrs ? (
              <div className="p-12 text-center text-neutral-400 bg-neutral-900 border border-neutral-800/80 rounded-xl">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                  <span className="text-xs font-medium">Loading QR slots...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-5">
                {[0, 1, 2, 3].map((slotIdx) => {
                  const qr = qrCodes.find((q) => q.slot_index === slotIdx);
                  const isLive = activeSlot === slotIdx;

                  return (
                    <div
                      key={slotIdx}
                      className={`bg-neutral-900 rounded-xl border transition-all  flex flex-col justify-between overflow-hidden ${
                        isLive ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-neutral-800/80'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-100">Slot {slotIdx}</span>
                          {isLive && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-300 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleOpenUploadModal(slotIdx)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 px-2 py-2 min-h-11 hover:bg-brand-50 rounded-lg transition-colors"
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
                              className="w-40 h-40 object-contain rounded-xl border border-neutral-800 bg-white p-2"
                            />
                            <button
                              onClick={() =>
                                setLightboxImage({
                                  url: getMediaUrl(qr.image_url),
                                  title: qr.label || `QR Slot ${slotIdx}`,
                                })
                              }
                              className="absolute inset-0 bg-neutral-950/40 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1.5 transition-opacity"
                            >
                              <Maximize2 className="w-4 h-4" />
                              <span>View Full</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-800 rounded-xl w-full">
                            <QrCode className="w-10 h-10 text-neutral-500 mb-2" />
                            <p className="text-xs font-semibold text-neutral-200">Not Configured</p>
                            <p className="text-xs text-neutral-400 mt-0.5">No QR image assigned to Slot {slotIdx}</p>
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
                      <div className="p-4 border-t border-neutral-800 bg-neutral-900 space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Label</p>
                          <p className="text-xs font-semibold text-neutral-100 truncate">
                            {qr?.label || <span className="text-neutral-400 italic">Empty Slot</span>}
                          </p>
                        </div>

                        {qr?.upi_id && (
                          <div>
                            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">UPI ID</p>
                            <div className="flex items-center justify-between bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800/60 font-mono text-xs text-neutral-200">
                              <span className="truncate">{qr.upi_id}</span>
                              <button data-icon-button
                                onClick={() => copyToClipboard(qr.upi_id!)}
                                className="p-0.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-brand-600 transition-colors"
                                title="Copy UPI ID"
                              >
                                {copiedText === qr.upi_id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {qr?.updated_at && (
                          <p className="text-xs text-neutral-400 pt-1">
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
            <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl filter-bar p-4 flex flex-wrap gap-3 items-center">
              <div className="relative min-w-0 flex-[1_1_18rem] w-full">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Team ID, UTR reference number, or admin notes..."
                  className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand-500 font-medium transition-colors"
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
                  <option value="">All Submissions</option>
                  <option value="processing">Processing (Pending Review)</option>
                  <option value="paid">Paid (Approved)</option>
                  <option value="rejected">Rejected</option>
                  <option value="reversed">Unpaid (Reversed)</option>
                </select>

                {(searchQuery || statusFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('');
                    }}
                    className="px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-100 rounded-xl hover:bg-neutral-800 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-neutral-900 border border-neutral-800/80 rounded-xl overflow-hidden">

          <div className="record-list min-w-0">
                <table role="table" className="record-table submissions-table w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-300 border-b border-neutral-800 uppercase tracking-wider text-xs font-semibold">
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

                  <tbody className="divide-y divide-neutral-800 text-neutral-200">
                    {loadingSubmissions ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-neutral-400">
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
                        const isReversed = sub.status?.toLowerCase() === 'reversed';

                        return (
                          <tr key={sub.id} className="hover:bg-neutral-950/80 transition-colors">
                            {/* Team ID */}
                            <td data-label="Team ID" className="py-3.5 px-5">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="whitespace-nowrap font-semibold text-neutral-50">{sub.team_id}</span>
                                  <button data-icon-button
                                    onClick={() => copyToClipboard(sub.team_id)}
                                    className="p-0.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-brand-600 transition-colors"
                                    title="Copy Team ID"
                                  >
                                    {copiedText === sub.team_id ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                {sub.team_name && (
                                  <span className="text-xs text-brand-400 font-medium truncate max-w-[170px]" title={sub.team_name}>
                                    {sub.team_name}
                                  </span>
                                )}
                                {sub.team_leader && (
                                  <span className="text-xs text-neutral-400 truncate max-w-[170px]" title={`Leader: ${sub.team_leader}`}>
                                    {sub.team_leader}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* UTR */}
                            <td data-label="UTR / Transaction Ref" className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 font-mono bg-neutral-800/80 px-2 py-1 rounded-lg w-fit border border-neutral-800">
                                <span className="font-semibold text-neutral-50 text-xs">{sub.utr}</span>
                                <button data-icon-button
                                  onClick={() => copyToClipboard(sub.utr)}
                                  className="p-0.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-brand-600 transition-colors"
                                  title="Copy UTR"
                                >
                                  {copiedText === sub.utr ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Amount & Slot */}
                            <td data-label="Amount & Slot" className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-neutral-50 text-xs">
                                  ₹{sub.amount?.toLocaleString('en-IN') || '400'}
                                </span>
                                <span className="text-xs text-neutral-400 font-medium">Slot {sub.qr_slot_index}</span>
                              </div>
                            </td>

                            {/* Screenshot Proof */}
                            <td data-label="Proof Screenshot" className="py-3.5 px-4">
                              {sub.screenshot_url ? (
                                <button
                                  onClick={async () => {
                                    try {
                                      const url = await loadPaymentScreenshot(sub.screenshot_url!);
                                      setLightboxPayment(sub);
                                      setLightboxImage({ url, title: `Payment Proof - Team ${sub.team_id} (UTR: ${sub.utr})` });
                                    } catch { showNotification('error', 'Could not load payment screenshot'); }
                                  }}
                                  className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200/60 font-semibold transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Slip</span>
                                </button>
                              ) : (
                                <span className="text-neutral-400 italic text-xs">No image attached</span>
                              )}
                            </td>

                            {/* Status */}
                            <td data-label="Status" className="py-3.5 px-4">
                              <StatusBadge status={sub.status} />
                            </td>

                            {/* Submitted At */}
                            <td data-label="Submitted At" className="py-3.5 px-4 text-xs text-neutral-400 font-medium">
                              <div>
                                <span className="text-neutral-100 font-semibold block">
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
                            <td data-label="Audit Note" className="py-3.5 px-4 text-xs text-neutral-400">
                              {sub.reversal_reason && (
                                <div className="mb-1 text-rose-400 max-w-xs break-words">
                                  <p className="font-semibold">Marked unpaid: {sub.reversal_reason}</p>
                                  <p className="text-xs">By: {sub.reversed_by || 'Administrator'}{sub.reversed_at ? ` · ${new Date(sub.reversed_at).toLocaleString()}` : ''}</p>
                                </div>
                              )}
                              {sub.admin_note ? (
                                <span className="text-neutral-100 font-medium block truncate max-w-xs">
                                  {sub.admin_note}
                                </span>
                              ) : (
                                <span className="text-neutral-400 italic">None</span>
                              )}
                              {sub.verified_by && (
                                <span className="text-xs text-neutral-400 block truncate max-w-xs">
                                  By: {sub.verified_by}
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td data-label="Actions" className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Map to Team button (Available for all submissions) */}
                                <button
                                  onClick={() => {
                                    setRemapTarget(sub);
                                    setRemapTargetTeamId('');
                                    setRemapTeamSearch('');
                                    setRemapApprove(sub.status?.toLowerCase() === 'processing');
                                    setRemapNote('');
                                    setRemapError(null);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 border border-brand-500/30 text-brand-400 hover:bg-brand-500/10 rounded-lg text-xs font-semibold transition-colors"
                                  title="Map / reassign this payment screenshot to another team"
                                >
                                  <Link2 className="w-3 h-3" />
                                  <span>Map</span>
                                </button>

                                {isProcessing && (
                                  <>
                                    <button
                                      onClick={() => handleApprovePayment(sub)}
                                      disabled={processingId === sub.id}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
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
                                      className="flex items-center gap-1 px-2 py-1 border border-rose-500/25 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-semibold transition-colors"
                                      title="Reject payment"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      <span>Reject</span>
                                    </button>
                                  </>
                                )}

                                {isPaid && (
                                  <>
                                    <span className="flex items-center gap-1 text-emerald-400 font-semibold text-xs bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/25">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Verified</span>
                                    </span>
                                    <button
                                      onClick={() => {
                                        setReverseTarget(sub);
                                        setReverseReason('');
                                        setReverseConfirmed(false);
                                        setReverseError(null);
                                      }}
                                      disabled={isReversing || processingId !== null}
                                      className="px-2.5 py-1 rounded-lg border border-rose-500/25 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold disabled:opacity-50"
                                    >
                                      Mark as unpaid
                                    </button>
                                  </>
                                )}

                                {!isProcessing && !isPaid && !isReversed && (
                                  <button
                                    onClick={() => handleApprovePayment(sub)}
                                    disabled={processingId === sub.id}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
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
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
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
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 font-medium focus:outline-none focus:border-brand-500"
              >
                <option value={0}>Slot 0 {activeSlot === 0 ? '(Currently Active)' : ''}</option>
                <option value={1}>Slot 1 {activeSlot === 1 ? '(Currently Active)' : ''}</option>
                <option value={2}>Slot 2 {activeSlot === 2 ? '(Currently Active)' : ''}</option>
                <option value={3}>Slot 3 {activeSlot === 3 ? '(Currently Active)' : ''}</option>
              </select>
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Label / Display Name
              </label>
              <input
                type="text"
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                placeholder="e.g. HDFC Merchant Account, Treasurer UPI"
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 font-medium focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* UPI ID */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Associated UPI ID (Optional)
              </label>
              <input
                type="text"
                value={uploadUpiId}
                onChange={(e) => setUploadUpiId(e.target.value)}
                placeholder="e.g. transfinitte26@okaxis or 9876543210@paytm"
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 font-mono font-medium focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Image Upload Area */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                QR Code Image <span className="text-rose-500">*</span>
              </label>

              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-800 border-dashed rounded-xl bg-neutral-950/50 hover:bg-neutral-950 transition-colors">
                <div className="space-y-2 text-center">
                  {imagePreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-contain rounded-xl border border-neutral-800 bg-neutral-900 p-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUploadFile(null);
                          setUploadImageUrl('');
                          setImagePreview(null);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-400 font-semibold"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <>
                      <QrCode className="mx-auto h-10 w-10 text-neutral-400" />
                      <div className="flex flex-wrap gap-y-1 text-xs text-neutral-300 justify-center">
                        <label
                          htmlFor="qr-file-upload"
                          className="relative cursor-pointer rounded-md font-semibold text-brand-600 hover:text-brand-500 focus-within:outline-none"
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
                      <p className="text-xs text-neutral-400">PNG, JPG, or WEBP up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Image URL fallback */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
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
                className="w-full px-3.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-neutral-50 hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingQR}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all disabled:opacity-50"
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

      {reverseTarget && (
        <Modal
          isOpen={!!reverseTarget}
          onClose={() => { if (!isReversing) setReverseTarget(null); }}
          title="Mark approved payment as unpaid"
          subtitle={`Team ${reverseTarget.team_id} · UTR ${reverseTarget.utr}`}
          maxWidth="md"
        >
          <form onSubmit={handleMarkUnpaid} className="space-y-4">
            <div className="p-3 rounded-xl border border-rose-500/25 bg-rose-500/10 text-xs text-rose-400 space-y-1">
              <p>This returns the team to Pending and removes this payment from verified totals. The original approval and this correction remain in the history.</p>
              <p className="font-semibold">This does not issue a refund.</p>
            </div>
            {reverseError && <p role="alert" className="text-xs text-rose-400">{reverseError}</p>}
            <div>
              <label htmlFor="reverse-payment-reason" className="block text-xs font-semibold text-neutral-200 mb-1">Reason (required)</label>
              <textarea
                id="reverse-payment-reason"
                required
                maxLength={1000}
                rows={3}
                disabled={isReversing}
                value={reverseReason}
                onChange={(event) => setReverseReason(event.target.value)}
                placeholder="Explain why the approval needs to be corrected"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-950 text-xs text-neutral-50"
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-neutral-200">
              <input type="checkbox" required checked={reverseConfirmed} disabled={isReversing} onChange={(event) => setReverseConfirmed(event.target.checked)} className="mt-0.5" />
              <span>I confirm that Team <strong>{reverseTarget.team_id}</strong> should be marked unpaid.</span>
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 pt-4">
              <button type="button" disabled={isReversing} onClick={() => setReverseTarget(null)} className="px-4 py-2 text-xs font-semibold rounded-xl text-neutral-300 hover:bg-neutral-800 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={isReversing || !reverseConfirmed || !reverseReason.trim()} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50">
                {isReversing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isReversing ? 'Updating...' : 'Confirm — mark as unpaid'}
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
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 text-xs text-rose-400">
              <p className="font-semibold">Team: {rejectPaymentTarget.team_id}</p>
              <p className="font-mono mt-0.5">Submitted UTR: {rejectPaymentTarget.utr}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Rejection Reason / Admin Note (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. UTR did not match bank statement, or amount paid was insufficient"
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setRejectPaymentTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-neutral-50 hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRejecting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all disabled:opacity-50"
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
          title="Review a team payment"
          subtitle="Approve an existing payment submission using its team ID"
          maxWidth="md"
        >
          <form onSubmit={handleManualTeamVerifySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Target Team ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={manualTeamId}
                onChange={(e) => setManualTeamId(e.target.value)}
                placeholder="e.g. TEAM-ABC12345 or full team code"
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 font-mono font-medium focus:outline-none focus:border-brand-500"
                required
              />
              <p className="text-xs text-neutral-400 mt-1">
                Enter the exact Team ID. This will update the team's payment_status to PAID immediately.
              </p>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsManualTeamModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-neutral-50 hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifyingTeam}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all disabled:opacity-50"
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
              className="max-h-[70vh] max-w-full object-contain rounded-xl border border-neutral-800 bg-neutral-950"
            />
            <div className="mt-4 flex flex-wrap gap-3 items-center justify-between w-full pt-3 border-t border-neutral-800">
              <div className="flex items-center gap-3">
                <a
                  href={lightboxImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in full resolution</span>
                </a>
                {lightboxPayment && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = lightboxPayment;
                      setLightboxImage(null);
                      setRemapTarget(target);
                      setRemapTargetTeamId('');
                      setRemapTeamSearch('');
                      setRemapApprove(target.status?.toLowerCase() === 'processing');
                      setRemapNote('');
                      setRemapError(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 rounded-xl transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Map This Screenshot to Team</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setLightboxImage(null);
                  setLightboxPayment(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* REMAP PAYMENT / SCREENSHOT TO CORRECT TEAM MODAL */}
      {remapTarget && (
        <Modal
          isOpen={!!remapTarget}
          onClose={() => { if (!isRemapping) setRemapTarget(null); }}
          title="Map Payment Screenshot to Correct Team"
          subtitle={`Submission #${remapTarget.id} · UTR: ${remapTarget.utr} · Currently assigned to Team ${remapTarget.team_id}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleRemapSubmit} className="space-y-4">
            {remapError && (
              <div role="alert" className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-400">
                {remapError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Screenshot & Current Info */}
              <div className="space-y-3 bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">Proof Screenshot</span>
                  {remapScreenshotUrl && (
                    <a
                      href={remapScreenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Full view</span>
                    </a>
                  )}
                </div>

                <div className="flex justify-center items-center bg-black/40 rounded-xl border border-neutral-800 p-2 min-h-[180px] max-h-[260px] overflow-hidden">
                  {remapScreenshotUrl ? (
                    <img
                      src={remapScreenshotUrl}
                      alt="Payment proof"
                      className="max-h-[240px] w-auto object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-neutral-500 text-xs flex flex-col items-center gap-1">
                      <FileImage className="w-8 h-8 opacity-40" />
                      <span>No screenshot image preview</span>
                    </div>
                  )}
                </div>

                {/* Current Details */}
                <div className="text-xs space-y-1.5 border-t border-neutral-800/80 pt-2 text-neutral-300">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Current Team:</span>
                    <span className="font-mono font-semibold text-neutral-200">
                      {remapTarget.team_id} {remapTarget.team_name ? `(${remapTarget.team_name})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Submitted UTR:</span>
                    <span className="font-mono text-neutral-200">{remapTarget.utr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Amount & Slot:</span>
                    <span className="text-neutral-200">₹{remapTarget.amount} (Slot {remapTarget.qr_slot_index})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Current Status:</span>
                    <StatusBadge status={remapTarget.status} />
                  </div>
                </div>
              </div>

              {/* Right Column: Target Team Selector & Options */}
              <div className="space-y-3.5">
                <div>
                  <label htmlFor="target-qr-slot" className="block text-xs font-semibold text-neutral-200 mb-1">
                    QR shown in screenshot <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="target-qr-slot"
                    value={remapTargetQrSlot}
                    onChange={(e) => setRemapTargetQrSlot(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-50 focus:outline-none focus:border-brand-500"
                  >
                    {[0, 1, 2, 3].map((slot) => {
                      const qr = qrCodes.find((item) => item.slot_index === slot);
                      return (
                        <option key={slot} value={slot} disabled={!qr?.is_active}>
                          Slot {slot}{qr ? ` - ${qr.label}` : ' - not configured'}
                        </option>
                      );
                    })}
                  </select>
                  <p className="mt-1 text-xs text-neutral-400">
                    Select the QR whose UPI/merchant details are visible in the payment screenshot.
                  </p>
                </div>
                {/* Search Target Team */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-200 mb-1">
                    Search Target Team (by Name, ID, or Leader)
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={remapTeamSearch}
                      onChange={(e) => setRemapTeamSearch(e.target.value)}
                      placeholder="Type team name, 6-digit ID, or leader email..."
                      className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Team suggestions list */}
                  {remapTeamSearch.trim() && (
                    <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1 bg-neutral-950 border border-neutral-800 rounded-xl p-1.5 shadow-lg">
                      {availableTeams
                        .filter((t) => {
                          const q = remapTeamSearch.toLowerCase();
                          return (
                            t.team_id?.toLowerCase().includes(q) ||
                            t.name?.toLowerCase().includes(q) ||
                            t.leader?.toLowerCase().includes(q) ||
                            t.contact?.toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 5)
                        .map((team) => (
                          <div
                            key={team.team_id}
                            onClick={() => {
                              setRemapTargetTeamId(team.team_id);
                              setRemapTeamSearch('');
                            }}
                            className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              remapTargetTeamId === team.team_id
                                ? 'bg-brand-600/20 border border-brand-500/40 text-brand-300'
                                : 'hover:bg-neutral-900 text-neutral-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{team.name}</p>
                              <p className="text-xs text-neutral-400 font-mono truncate">
                                ID: {team.team_id} · Leader: {team.leader || 'N/A'}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 font-medium whitespace-nowrap ml-2">
                              {team.payment_status}
                            </span>
                          </div>
                        ))}
                      {availableTeams.filter((t) => {
                        const q = remapTeamSearch.toLowerCase();
                        return (
                          t.team_id?.toLowerCase().includes(q) ||
                          t.name?.toLowerCase().includes(q) ||
                          t.leader?.toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                        <p className="text-xs text-neutral-400 p-2 text-center">No matching teams found</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Target Team ID input */}
                <div>
                  <label htmlFor="target-team-id-input" className="block text-xs font-semibold text-neutral-200 mb-1">
                    Selected Target Team ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="target-team-id-input"
                    type="text"
                    required
                    value={remapTargetTeamId}
                    onChange={(e) => setRemapTargetTeamId(e.target.value.trim())}
                    placeholder="e.g. 123456"
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-50 focus:outline-none focus:border-brand-500"
                  />
                  {/* Selected target preview */}
                  {remapTargetTeamId && (
                    <div className="mt-1 text-xs">
                      {(() => {
                        const target = availableTeams.find((t) => t.team_id === remapTargetTeamId);
                        if (target) {
                          return (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Target: {target.name} (Leader: {target.leader}) · Current Status: {target.payment_status}
                            </span>
                          );
                        }
                        return (
                          <span className="text-neutral-400">
                            Custom team ID entered: {remapTargetTeamId}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Checkbox: Approve immediately */}
                <label className="flex items-start gap-2 text-xs text-neutral-200 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={remapApprove}
                    onChange={(e) => setRemapApprove(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-800 bg-neutral-950 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    <strong>Approve and mark target team as PAID immediately</strong>
                    <span className="block text-neutral-400 text-xs">
                      If checked, marks the target team status as PAID and approves this submission. If unchecked, keeps the existing submission status. An already paid submission remains paid when moved.
                    </span>
                  </span>
                </label>

                {/* Reason Note */}
                <div>
                  <label htmlFor="remap-note-input" className="block text-xs font-semibold text-neutral-200 mb-1">
                    Audit Note / Reason for Remapping
                  </label>
                  <textarea
                    id="remap-note-input"
                    required maxLength={1000}
                    rows={2}
                    value={remapNote}
                    onChange={(e) => setRemapNote(e.target.value)}
                    placeholder="e.g. Verified from payment slip screenshot; payer is John Doe belonging to this team"
                    className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800 pt-3 mt-2">
              <p className="text-xs text-neutral-400">
                The previous team's status will be reverted to Pending if it has no other valid payments.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isRemapping}
                  onClick={() => setRemapTarget(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRemapping || !remapTargetTeamId.trim() || !remapNote.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50"
                >
                  {isRemapping ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mapping Payment...</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Confirm & Map to Team</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE NEW MAPPED PAYMENT FROM SCREENSHOT MODAL */}
      {isCreateMappedModalOpen && (
        <Modal
          isOpen={isCreateMappedModalOpen}
          onClose={() => { if (!isCreatingMapped) setIsCreateMappedModalOpen(false); }}
          title="Map New Payment from Screenshot Proof"
          subtitle="Record and map an offline UPI payment proof directly to a team"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateMappedSubmit} className="space-y-4">
            {newMappedError && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{newMappedError}</div>}
            {/* Target Team Selection */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Target Team <span className="text-rose-500">*</span>
              </label>
              <div className="relative mb-1.5">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={newMappedTeamSearch}
                  onChange={(e) => setNewMappedTeamSearch(e.target.value)}
                  placeholder="Search team by name, ID, or leader..."
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand-500"
                />
              </div>

              {newMappedTeamSearch.trim() && (
                <div className="max-h-36 overflow-y-auto space-y-1 bg-neutral-950 border border-neutral-800 rounded-xl p-1.5 mb-2 shadow-lg">
                  {availableTeams
                    .filter((t) => {
                      const q = newMappedTeamSearch.toLowerCase();
                      return (
                        t.team_id?.toLowerCase().includes(q) ||
                        t.name?.toLowerCase().includes(q) ||
                        t.leader?.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 5)
                    .map((team) => (
                      <div
                        key={team.team_id}
                        onClick={() => {
                          setNewMappedTeamId(team.team_id);
                          setNewMappedTeamSearch('');
                        }}
                        className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          newMappedTeamId === team.team_id
                            ? 'bg-brand-600/20 border border-brand-500/40 text-brand-300'
                            : 'hover:bg-neutral-900 text-neutral-200'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{team.name}</p>
                          <p className="text-xs text-neutral-400 font-mono">
                            ID: {team.team_id} · {team.leader || 'No leader'}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 font-medium">
                          {team.payment_status}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              <input
                type="text"
                required
                value={newMappedTeamId}
                onChange={(e) => setNewMappedTeamId(e.target.value.trim())}
                placeholder="Team ID (e.g. 123456)"
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-50 focus:outline-none focus:border-brand-500"
              />
              {newMappedTeamId && (
                <div className="mt-1 text-xs">
                  {(() => {
                    const target = availableTeams.find((t) => t.team_id === newMappedTeamId);
                    if (target) {
                      return (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Target: {target.name} ({target.team_id}) · Status: {target.payment_status}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>

            {/* UTR & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">
                  UTR / Transaction Reference <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newMappedUtr}
                  onChange={(e) => setNewMappedUtr(e.target.value.trim())}
                  placeholder="e.g. 428198273641"
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-50 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="0.01" step="0.01" required
                  value={newMappedAmount}
                  onChange={(e) => setNewMappedAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-50 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Screenshot File Upload */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Payment Screenshot Proof <span className="text-rose-500">*</span>
              </label>

              <div className="border-2 border-neutral-800 border-dashed rounded-xl p-4 bg-neutral-950/50 hover:bg-neutral-950 text-center transition-colors">
                {newMappedPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={newMappedPreview}
                      alt="Screenshot Preview"
                      className="max-h-36 object-contain rounded-lg border border-neutral-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewMappedFile(null);
                        setNewMappedPreview(null);
                      }}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Remove image
                    </button>
                  </div>
                ) : (
                  <div>
                    <FileImage className="mx-auto h-8 w-8 text-neutral-400 mb-1" />
                    <label
                      htmlFor="new-mapped-screenshot"
                      className="relative cursor-pointer rounded-md font-semibold text-brand-600 hover:text-brand-500 text-xs"
                    >
                      <span>Upload payment screenshot</span>
                      <input
                        id="new-mapped-screenshot"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              setNewMappedError('Screenshot size must be under 5MB');
                              return;
                            }
                            setNewMappedFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setNewMappedPreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <p className="text-xs text-neutral-400 mt-0.5">PNG, JPG, or WEBP up to 5MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox: Approve immediately */}
            <label className="flex items-start gap-2 text-xs text-neutral-200 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={newMappedApprove}
                onChange={(e) => setNewMappedApprove(e.target.checked)}
                className="mt-0.5 rounded border-neutral-800 bg-neutral-950 text-brand-600 focus:ring-brand-500"
              />
              <span>
                <strong>Approve and mark target team as PAID immediately</strong>
                <span className="block text-neutral-400 text-xs">
                  Updates team payment status to PAID and records verified payment record.
                </span>
              </span>
            </label>

            {/* Admin Note */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Admin Note / Audit Reason
              </label>
              <textarea
                rows={2}
                required maxLength={1000}
                value={newMappedNote}
                onChange={(e) => setNewMappedNote(e.target.value)}
                placeholder="e.g. Mapped from offline payment proof submitted via support"
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800">
              <button
                type="button"
                disabled={isCreatingMapped}
                onClick={() => setIsCreateMappedModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-neutral-50 hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingMapped || !newMappedTeamId.trim() || !newMappedUtr.trim() || !newMappedFile || !newMappedNote.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all disabled:opacity-50"
              >
                {isCreatingMapped ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Map Payment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

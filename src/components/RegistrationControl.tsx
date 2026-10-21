import { useCallback, useEffect, useState } from 'react';
import { Loader2, LockKeyhole, UnlockKeyhole } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import type { RegistrationState } from '../types';

export function RegistrationControl() {
  const { canManageTeams } = useAuth();
  const [status, setStatus] = useState<RegistrationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<RegistrationState | null>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await api.registration.get();
      if (!response.success || !response.data) throw new Error('Could not load registration status.');
      setStatus(response.data); setError(null);
    } catch { setError('Registration status is unavailable. Refresh to try again.'); setStatus(null); }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);
  const save = async () => {
    if (!pending || busy) return;
    setBusy(true); setError(null);
    try {
      const response = await api.registration.update(!pending.registration_open, pending.version);
      if (!response.success || !response.data) throw new Error('Could not change registration status.');
      setStatus(response.data); setPending(null);
    } catch (cause: any) {
      setError(cause.response?.data?.message || cause.message || 'Could not change registration status.');
      setStatus(null); setPending(null);
    } finally { setBusy(false); }
  };
  const open = status?.registration_open;
  return <section className="min-w-0 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-6" aria-label="Registration control">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
          {open ? <UnlockKeyhole className="h-4 w-4 text-emerald-400" /> : <LockKeyhole className="h-4 w-4 text-neutral-400" />}
          Registration {status ? (open ? 'is open' : 'is closed') : 'status'}
        </h2>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-400">Closing stops new accounts, team creation/joining and payment submissions. Existing participants can still sign in; admin reviews and corrections stay available.</p>
        {status && <p className="mt-2 break-all text-xs text-neutral-500">{status.updated_by ? `Updated by ${status.updated_by} · ${new Date(status.updated_at).toLocaleString()}` : 'Registration is open by default until changed here.'}</p>}
      </div>
      <div className="flex min-w-0 max-w-full flex-wrap gap-2">
        <button type="button" onClick={() => { void refresh(); }} disabled={busy} className="min-h-11 rounded-lg border border-neutral-700 px-4 py-2 text-xs hover:bg-neutral-800 disabled:opacity-50">Refresh status</button>
        {canManageTeams && status && <button type="button" onClick={() => setPending(status)} disabled={busy} className={`min-h-11 rounded-lg border px-4 py-2 text-xs font-semibold disabled:opacity-50 ${open ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10' : 'border-neutral-200 bg-neutral-200 text-neutral-950 hover:bg-white'}`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}{open ? 'Close registration' : 'Open registration'}
        </button>}
      </div>
    </div>
    {error && <p role="alert" className="mt-3 text-xs leading-relaxed text-rose-300">{error}</p>}
    <ConfirmDialog isOpen={!!pending} onClose={() => { if (!busy) setPending(null); }} onConfirm={() => { void save(); }} title={pending?.registration_open ? 'Close registration?' : 'Open registration?'} message={pending?.registration_open ? 'This stops new accounts, new teams, joining teams and new payment submissions across the website. Existing sign-in and admin reviews remain available.' : 'Participants will be able to register, create or join teams and submit payments again. The existing team cap still applies.'} confirmText={pending?.registration_open ? 'Close registration' : 'Open registration'} isDanger={pending?.registration_open} isLoading={busy} />
  </section>;
}

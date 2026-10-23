import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import { eventControls } from '../lib/eventControls';
import type { EventFeature, EventSettings } from '../lib/eventControls';

const controls: { key: EventFeature; label: string; description: string }[] = [
  { key: 'mid_review', label: 'Mid-review submissions', description: 'Allow team leaders to upload or replace their mid-review presentation.' },
  { key: 'final_review', label: 'Final-review submissions', description: 'Allow team leaders to upload or replace their final presentation.' },
  { key: 'raise_issue', label: 'Ticket raising', description: 'Allow team members to submit new issues for their team.' },
  { key: 'problem_statement', label: 'Problem-statement selection', description: 'Allow leaders to select from the published problem statements.' },
];
type Change = { key: EventFeature; label: string; enabled: boolean; version: number };

export function EventControls() {
  const { canManageTeams } = useAuth();
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Change | null>(null);
  const sequence = useRef(0);
  const writing = useRef(false);
  const refresh = useCallback(async () => {
    if (writing.current) return;
    const request = ++sequence.current;
    setLoading(true);
    try {
      const response = await eventControls.get();
      if (!response.success || !response.data) throw new Error('Could not load event controls.');
      if (request === sequence.current) { setSettings(response.data); setError(null); }
    } catch {
      if (request === sequence.current) { setSettings(null); setError('Event controls are unavailable. Refresh to try again.'); }
    } finally { if (request === sequence.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { ++sequence.current; window.removeEventListener('focus', focus); };
  }, [refresh]);
  const save = async () => {
    if (!pending || writing.current) return;
    writing.current = true;
    ++sequence.current;
    setBusy(true); setLoading(false); setError(null);
    try {
      const response = await eventControls.update(pending.key, pending.enabled, pending.version);
      if (!response.success || !response.data) throw new Error('Could not update event controls.');
      setSettings(response.data);
    } catch (cause: any) {
      setSettings(null);
      setError(cause.response?.data?.message || cause.message || 'Could not update event controls.');
    } finally { writing.current = false; setBusy(false); setPending(null); }
  };
  return <section aria-label="Event controls" className="min-w-0 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-6">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-neutral-100">Event controls</h2>
        <p className="mt-2 text-xs leading-relaxed text-neutral-400">Open or close each activity independently. Changes are saved immediately; participant pages refresh within 30 seconds or when they return to the tab.</p>
      </div>
      <button type="button" disabled={busy || loading} onClick={() => { void refresh(); }} className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-xs hover:bg-neutral-800 disabled:opacity-50">
        {loading && <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />}Refresh controls
      </button>
    </div>
    {error && <p role="alert" className="mt-4 text-xs leading-relaxed text-rose-300">{error}</p>}
    <div className="mt-4 divide-y divide-neutral-800">
      {controls.map(control => {
        const enabled = settings?.[control.key];
        return <div key={control.key} className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm text-neutral-100">{control.label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">{control.description}</p>
          </div>
          <div className="flex max-w-full shrink-0 flex-wrap items-center gap-3">
            <span role="status" className={`text-xs ${settings && enabled ? 'text-emerald-400' : 'text-neutral-400'}`}>{settings ? (enabled ? 'Open' : 'Closed') : (loading ? 'Loading…' : 'Unavailable')}</span>
            {canManageTeams && <button type="button" aria-label={`${enabled ? 'Close' : 'Open'} ${control.label.toLowerCase()}`} disabled={!settings || busy || loading} onClick={() => { if (settings) setPending({ key: control.key, label: control.label, enabled: !enabled, version: settings.version }); }} className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 text-xs font-semibold disabled:opacity-50 ${enabled ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10' : 'border-neutral-700 text-neutral-100 hover:bg-neutral-800'}`}>{enabled ? 'Close' : 'Open'}</button>}
          </div>
        </div>;
      })}
    </div>
    {settings?.updated_by && <p className="mt-2 break-words text-xs text-neutral-500">Updated by {settings.updated_by} · {new Date(settings.updated_at).toLocaleString()}</p>}
    <ConfirmDialog isOpen={!!pending} onClose={() => { if (!writing.current) setPending(null); }} onConfirm={() => { void save(); }} title={`${pending?.enabled ? 'Open' : 'Close'} ${pending?.label.toLowerCase()}?`} message={pending?.enabled ? 'Participants will be able to use this activity. Existing team permissions and file requirements still apply.' : 'New submissions or changes for this activity will be blocked. Saved submissions and existing issues will be retained.'} confirmText={pending?.enabled ? 'Open activity' : 'Close activity'} isDanger={!pending?.enabled} isLoading={busy} />
  </section>;
}

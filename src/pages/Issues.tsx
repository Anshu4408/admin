import { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { Pagination as PaginationControls } from '../components/Pagination';
import { eventOperations, operationError } from '../lib/eventOperations';
import type { Issue } from '../lib/eventOperations';
import type { Pagination } from '../types';
const field = 'min-h-11 w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm';
const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-700 px-4 py-2 text-xs hover:bg-neutral-800 disabled:opacity-50';
export function IssuesPage() {
  const [items, setItems] = useState<Issue[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Issue | null>(null);
  const [nextStatus, setNextStatus] = useState<Issue['status']>('open');
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => { let active = true; setLoading(true); eventOperations.issues({ page, status, search }).then(r => { if (!r.success || !r.data) throw new Error('Could not load tickets'); if (active) { setItems(r.data.issues); setPagination(r.data.pagination); setError(''); } }).catch(e => { if (active) setError(operationError(e, 'Could not load tickets')); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [page, status, search, revision]);
  const edit = (issue: Issue) => { setSelected(issue); setNextStatus(issue.status); setResolution(issue.resolution); setSaveError(''); };
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (!selected || busy) return; setBusy(true); setSaveError(''); try { const r = await eventOperations.updateIssue(selected, nextStatus, resolution); if (!r.success) throw new Error(r.message); setSelected(null); setRevision(v => v + 1); } catch (e) { setSaveError(operationError(e, 'Could not update ticket')); } finally { setBusy(false); } };
  return <><Navbar title="Tickets" subtitle="Review participant issues, track progress and publish resolutions." actions={<button className={button} disabled={loading} onClick={() => setRevision(v => v + 1)}>Refresh tickets</button>} />
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[1fr_220px]"><input className={field} aria-label="Search tickets" placeholder="Search title, team name or ID" value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} /><select className={field} aria-label="Ticket status" value={status} onChange={e => { setPage(1); setStatus(e.target.value); }}><option value="">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></div>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {loading ? <p role="status">Loading tickets…</p> : !error && !items.length ? <p className="rounded-xl border border-neutral-800 p-6 text-sm text-neutral-400">No tickets match these filters.</p> : !error && items.map(issue => <article key={issue.issue_id} className="min-w-0 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-5"><div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="break-words text-sm font-semibold">{issue.title}</h2><p className="mt-2 break-words text-xs text-neutral-400">{issue.team_name || 'Former team'} · {issue.team_id || 'No team'} · {issue.issue_type}</p><p className="mt-2 text-xs text-neutral-300">{issue.status.replace('_', ' ')} · {new Date(issue.created_at).toLocaleString()}</p></div><button className={button} onClick={() => edit(issue)} aria-label={`Review ${issue.title}`}>Review</button></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-400">{issue.description}</p>{issue.resolution && <p className="mt-3 whitespace-pre-wrap break-words border-t border-neutral-800 pt-3 text-xs leading-relaxed">Resolution: {issue.resolution}</p>}</article>)}
      {!loading && !error && <PaginationControls pagination={pagination} onPageChange={setPage} noun="tickets" />}
    </main>
    <Modal isOpen={!!selected} onClose={() => { if (!busy) setSelected(null); }} title="Review ticket" subtitle={selected?.title} maxWidth="xl"><form onSubmit={save} className="space-y-4">
      {saveError && <p role="alert" className="text-sm text-rose-300">{saveError}</p>}
      <p className="break-words text-xs leading-6 text-neutral-400">{selected?.name || 'Participant'} · {selected?.email} · {selected?.team_name} · {selected?.domain}</p>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{selected?.description}</p>
      <label className="block space-y-2 text-xs">Status<select className={field} value={nextStatus} onChange={e => setNextStatus(e.target.value as Issue['status'])}><option value="open">Open / reopen</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label>
      <label className="block space-y-2 text-xs">Resolution / participant-visible update<textarea className={field} rows={5} maxLength={10000} required={nextStatus === 'resolved'} value={resolution} onChange={e => setResolution(e.target.value)} /></label>
      {selected?.updated_by && <p className="break-words text-xs text-neutral-500">Last updated by {selected.updated_by}</p>}
      <div className="flex flex-wrap justify-end gap-2"><button type="button" className={button} disabled={busy} onClick={() => setSelected(null)}>Cancel</button><button className={button} disabled={busy}>{busy ? 'Saving…' : 'Save ticket'}</button></div>
    </form></Modal>
  </>;
}

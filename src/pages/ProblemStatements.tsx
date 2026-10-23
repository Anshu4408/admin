import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { eventOperations, operationError, standardDomains } from '../lib/eventOperations';
import type { ProblemStatement } from '../lib/eventOperations';
const field = 'min-h-11 w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-xs hover:bg-neutral-800 disabled:opacity-50';
const empty = { title: '', description: '', active: false, sort_order: 0 };
export function ProblemStatementsPage() {
  const [items, setItems] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<{ item: ProblemStatement | null } | null>(null);
  const [draft, setDraft] = useState(empty);
  const [allDomains, setAllDomains] = useState(true);
  const [domains, setDomains] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const load = async () => { setLoading(true); try { const r = await eventOperations.problems(); if (!r.success || !r.data) throw new Error('Could not load statements'); setItems(r.data); setError(''); } catch (e) { setError(operationError(e, 'Could not load statements')); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const edit = (item: ProblemStatement | null) => { setEditor({ item }); setDraft(item || empty); setAllDomains(!item?.domains.length); setDomains(item?.domains.filter(d => standardDomains.includes(d)) || []); setCustom(item?.domains.filter(d => !standardDomains.includes(d)).join(', ') || ''); setSaveError(''); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy || !editor) return;
    const allowed = allDomains ? [] : [...new Set([...domains, ...custom.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)])];
    if (!allDomains && !allowed.length) { setSaveError('Choose at least one allowed domain or allow all domains.'); return; }
    setBusy(true); setSaveError('');
    try { const r = await eventOperations.saveProblem(editor.item?.statement_id || null, { ...draft, domains: allowed, version: editor.item?.version }); if (!r.success) throw new Error(r.message); setEditor(null); await load(); } catch (e) { setSaveError(operationError(e, 'Could not save statement')); } finally { setBusy(false); }
  };
  return <><Navbar title="Problem statements" subtitle="Publish challenges and choose which domains can select each one." actions={<><button className={button} disabled={loading} onClick={() => { void load(); }}><RefreshCw className="h-4 w-4 shrink-0" />Refresh</button><button className={button} onClick={() => edit(null)}><Plus className="h-4 w-4 shrink-0" />Add statement</button></>} />
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4 p-4 sm:p-6 lg:p-8">
      <p className="text-xs leading-6 text-neutral-400">Published statements appear on the registration dashboard for eligible teams. Open selection in Overview → Event controls. Unpublishing retains existing selections. Renaming updates selected titles.</p>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {loading ? <p role="status">Loading statements…</p> : !items.length && !error ? <p className="rounded-xl border border-neutral-800 p-6 text-sm text-neutral-400">No problem statements yet. Add your first challenge.</p> : items.map(item => <article key={item.statement_id} className="min-w-0 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="break-words text-sm font-semibold">{item.title}</h2><p className={`mt-2 text-xs ${item.active ? 'text-emerald-400' : 'text-neutral-400'}`}>{item.active ? 'Published' : 'Draft / unpublished'}</p></div><button className={button} onClick={() => edit(item)} aria-label={`Edit ${item.title}`}>Edit</button></div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-400">{item.description || 'No description'}</p>
        <p className="mt-3 break-words text-xs text-neutral-300">Allowed domains: {item.domains.length ? item.domains.join(', ') : 'All domains'} · Display order: {item.sort_order}</p>
      </article>)}
    </main>
    <Modal isOpen={!!editor} onClose={() => { if (!busy) setEditor(null); }} title={editor?.item ? 'Edit problem statement' : 'Add problem statement'} maxWidth="xl">
      <form onSubmit={save} className="space-y-4">
        {saveError && <p role="alert" className="text-sm text-rose-300">{saveError}</p>}
        <label className="block space-y-2 text-xs">Title<input className={field} value={draft.title} required maxLength={500} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label className="block space-y-2 text-xs">Description<textarea className={field} rows={5} maxLength={20000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
        <fieldset className="min-w-0 space-y-3 rounded-lg border border-neutral-800 p-3"><legend className="px-1 text-xs">Eligible domains</legend>
          <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={allDomains} onChange={e => setAllDomains(e.target.checked)} />Allow all domains</label>
          {!allDomains && <><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{standardDomains.map(d => <label key={d} className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={domains.includes(d)} onChange={e => setDomains(e.target.checked ? [...domains, d] : domains.filter(v => v !== d))} />{d}</label>)}</div><label className="block space-y-2 text-xs">Other allowed domains (comma separated)<input className={field} value={custom} onChange={e => setCustom(e.target.value)} placeholder="design, robotics" /></label></>}
        </fieldset>
        <label className="block space-y-2 text-xs">Display order<input className={field} type="number" min={0} max={100000} required value={draft.sort_order} onChange={e => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></label>
        <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />Publish on registration website</label>
        <div className="flex flex-wrap justify-end gap-2"><button type="button" className={button} disabled={busy} onClick={() => setEditor(null)}>Cancel</button><button className={button} disabled={busy}>{busy ? 'Saving…' : 'Save statement'}</button></div>
      </form>
    </Modal>
  </>;
}

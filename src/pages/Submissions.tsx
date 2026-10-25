import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Pagination } from '../components/Pagination';
import { safeSubmissionLink, saveSubmission, submissionError, submissionsApi } from '../lib/submissions';
import type { ReviewStage, SubmissionFile, SubmissionTeam } from '../lib/submissions';
const button = 'inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50';
const field = 'min-h-11 w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs';
const label = (stage: ReviewStage) => stage === 'mid' ? 'Mid-review' : 'Final-review';
export function SubmissionsPage() {
  const [teams, setTeams] = useState<SubmissionTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<ReviewStage | 'all'>('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [download, setDownload] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const downloading = useRef(false);
  useEffect(() => {
    let active = true; setLoading(true);
    submissionsApi.list().then(r => { if (!r.success || !r.data) throw new Error(r.message || 'Unable to load submissions'); if (active) { setTeams(r.data); setListError(''); } }).catch(async e => { const message = await submissionError(e); if (active) setListError(message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const downloadFile = async (team: SubmissionTeam, review: ReviewStage, file: SubmissionFile) => {
    if (downloading.current) return; downloading.current = true; setDownload(`${team.team_id}-${review}`); setProgress(null); setError('');
    try { saveSubmission(await submissionsApi.file(team.team_id, review), `${team.team_id}_${review}_${file.filename}`); }
    catch (e) { setError(await submissionError(e)); }
    finally { downloading.current = false; setDownload(null); }
  };
  const downloadZip = async (review: ReviewStage | 'all') => {
    if (downloading.current) return; downloading.current = true; setDownload(`${review}-zip`); setProgress(null); setError('');
    try { const blob = await submissionsApi.archive(review, setProgress); saveSubmission(blob, `transfinitte_submissions_${review}_${new Date().toISOString().slice(0, 10)}.zip`); }
    catch (e) { setError(await submissionError(e)); }
    finally { downloading.current = false; setDownload(null); setProgress(null); }
  };
  const downloadLinks = async () => {
    if (downloading.current) return; downloading.current = true; setDownload('links'); setProgress(null); setError('');
    try { saveSubmission(await submissionsApi.links(), 'final_submission_links.csv'); }
    catch (e) { setError(await submissionError(e)); }
    finally { downloading.current = false; setDownload(null); }
  };
  const counts = { mid: teams.filter(t => t.mid).length, final: teams.filter(t => t.final).length };
  const needle = search.trim().toLowerCase();
  const filtered = teams.filter(team => {
    const matches = `${team.team_id} ${team.team_name} ${team.domain}`.toLowerCase().includes(needle);
    const final = team.final || safeSubmissionLink(team.final_link);
    const files = stage === 'all' ? [team.mid, final] : [stage === 'final' ? final : team.mid];
    return matches && (status === 'all' || (status === 'submitted' ? files.some(Boolean) : files.some(file => !file)));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  return <><Navbar title="Review submissions" subtitle="Download team presentations, track missing submissions and open files in your preferred viewer." actions={<button className={button} disabled={loading} onClick={() => setRevision(v => v + 1)}><RefreshCw className="h-4 w-4 shrink-0" />Refresh</button>} />
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <section className="min-w-0 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <h2 className="text-sm font-semibold">Download all submissions</h2>
        <p className="text-xs leading-6 text-neutral-400">ZIP files contain every submitted original, organised by stage and team, plus an index showing missing submissions. Search filters below do not limit the ZIP.</p>
        <div className="flex min-w-0 flex-wrap gap-2">{(['mid', 'final', 'all'] as const).map(review => <button key={review} className={button} disabled={!!download || loading || !!listError || (review === 'all' ? counts.mid + counts.final === 0 : counts[review] === 0)} onClick={() => { void downloadZip(review); }}><Download className="h-4 w-4 shrink-0" />{review === 'all' ? 'Both stages ZIP' : `${label(review)} ZIP`} ({review === 'all' ? counts.mid + counts.final : counts[review]})</button>)}</div>
        <button className={button} disabled={!!download || loading || !!listError} onClick={() => { void downloadLinks(); }}><Download className="h-4 w-4 shrink-0" />Final submission links CSV — all teams</button>
        <p className="text-xs leading-5 text-neutral-400">CSV includes every team, its domain and saved final submission link. Search filters do not limit the export.</p>
        {download && <p role="status" className="flex items-center gap-2 text-xs text-neutral-300"><Loader2 className="h-4 w-4 shrink-0 animate-spin" />{progress === null ? 'Preparing download…' : `Downloading… ${progress}%`}</p>}
      </section>
      {error && <p role="alert" className="break-words text-sm text-rose-300">{error}</p>}
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_200px_220px]">
        <input className={field} aria-label="Search submissions" placeholder="Search team name, ID or domain" value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} />
        <select className={field} aria-label="Review stage" value={stage} onChange={e => { setPage(1); setStage(e.target.value as ReviewStage | 'all'); }}><option value="all">Both review stages</option><option value="mid">Mid-review</option><option value="final">Final-review</option></select>
        <select className={field} aria-label="Submission status" value={status} onChange={e => { setPage(1); setStatus(e.target.value); }}><option value="all">All teams</option><option value="submitted">Has a submission</option><option value="missing">Missing a submission</option></select>
      </div>
      {listError && <p role="alert" className="text-sm text-rose-300">{listError}</p>}
      {loading ? <p role="status">Loading submissions…</p> : !listError && !visible.length ? <p className="rounded-xl border border-neutral-800 p-6 text-sm text-neutral-400">No teams match these filters.</p> : !listError && visible.map(team => <article key={team.team_id} className="min-w-0 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-5">
        <h2 className="break-words text-sm font-semibold">{team.team_name}</h2><p className="mt-2 break-words text-xs text-neutral-400">{team.team_id} · {team.domain || 'No domain'}</p>
        <div className={`mt-4 grid min-w-0 gap-3 ${stage === 'all' ? 'xl:grid-cols-2' : ''}`}>{(['mid', 'final'] as const).filter(review => stage === 'all' || review === stage).map(review => { const file = team[review]; const link = review === 'final' ? safeSubmissionLink(team.final_link) : null; return <div key={review} className="min-w-0 rounded-lg border border-neutral-800 bg-neutral-950 p-3"><h3 className="text-xs font-medium">{label(review)}</h3>{file ? <><p className="mt-2 break-all text-xs text-neutral-300">{file.filename}</p><p className="mt-2 text-xs text-neutral-500">{(file.size / 1024 / 1024).toFixed(2)} MB · {new Date(file.updated_at).toLocaleString()}</p><div className="mt-3 flex min-w-0 flex-wrap gap-2"><button className={button} disabled={!!download} aria-label={`Download ${review} review for ${team.team_name}`} onClick={() => { void downloadFile(team, review, file); }}><Download className="h-4 w-4 shrink-0" />Download original</button></div></> : !link ? <p className="mt-3 text-xs text-amber-300">Not submitted</p> : null}{link && <a href={link} target="_blank" rel="noopener noreferrer" className="mt-3 block break-all text-xs text-sky-300 underline">{link}</a>}</div>; })}</div>
      </article>)}
      {!loading && !listError && <Pagination pagination={{ page: currentPage, pages, total: filtered.length, limit: 20 }} onPageChange={setPage} noun="teams" />}
    </main>

  </>;
}

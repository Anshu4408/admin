import { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api';
import { saveCsv } from '../lib/csv';
import { selectedPsTeamsExport } from '../lib/selectedPsTeamsExport';
import type { ApiResponse, Team } from '../types';

export function ExportSelectedPsTeams() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const download = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage(''); setFailed(false);
    try {
      // Fetch the complete current list instead of the filtered/paginated page.
      const { data } = await apiClient.get<ApiResponse<Team[]>>('/api/admin/teams');
      if (!data.success || !Array.isArray(data.data)) throw new Error('Could not load all teams. Please try again.');
      const result = selectedPsTeamsExport(data.data);
      saveCsv(result.csv, `transfinitte_ps_selected_teams_${new Date().toISOString().slice(0, 10)}.csv`);
      setMessage(`Exported ${result.teamCount} teams with selected problem statements.`);
    } catch (error: any) {
      setFailed(true); setMessage(error.response?.data?.message || error.message || 'Could not export teams. Please try again.');
    } finally { pending.current = false; setBusy(false); }
  };
  return <div className="flex min-w-0 max-w-full flex-col gap-2">
    <button type="button" onClick={() => { void download(); }} disabled={busy} title="Download all teams with a selected problem statement, regardless of current filters or payment status" className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-xs hover:bg-neutral-800 disabled:opacity-50">
      {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4 shrink-0" />}<span>{busy ? 'Exporting…' : 'Export selected PS teams'}</span>
    </button>
    {message && <p role={failed ? 'alert' : 'status'} className={`max-w-sm break-words text-xs leading-relaxed ${failed ? 'text-rose-300' : 'text-emerald-400'}`}>{message}</p>}
  </div>;
}

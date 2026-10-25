import { apiClient } from './api';
import type { ApiResponse } from '../types';
export type ReviewStage = 'mid' | 'final';
export interface SubmissionFile { filename: string; size: number; updated_at: string; }
export interface SubmissionTeam { team_id: string; team_name: string; domain: string; payment_status: string; final_link?: string; mid: SubmissionFile | null; final: SubmissionFile | null; }
const submissionPath = (teamId: string, stage: ReviewStage) => `/api/admin/submissions/${encodeURIComponent(teamId)}/${stage}`;
export const submissionsApi = {
  links: async () => (await apiClient.get<Blob>('/api/admin/submissions/final-links/export', { responseType: 'blob' })).data,
  list: async () => (await apiClient.get<ApiResponse<SubmissionTeam[]>>('/api/admin/submissions')).data,
  file: async (teamId: string, stage: ReviewStage) => (await apiClient.get<Blob>(`${submissionPath(teamId, stage)}/download`, { responseType: 'blob' })).data,
  archive: async (stage: ReviewStage | 'all', progress: (value: number | null) => void) => (await apiClient.get<Blob>('/api/admin/submissions/export', { params: { stage }, responseType: 'blob', timeout: 600000, onDownloadProgress: event => progress(event.total ? Math.round(event.loaded * 100 / event.total) : null) })).data,
};
export async function submissionError(error: any): Promise<string> {
  const data = error.response?.data;
  if (data instanceof Blob) { try { return JSON.parse(await data.text()).message || 'Unable to download submission.'; } catch { return 'Unable to download submission. Please try again.'; } }
  return data?.message || error.message || 'Submission request failed. Please try again.';
}
export function saveSubmission(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try { anchor.href = url; anchor.download = Array.from(filename, character => character.charCodeAt(0) < 32 || /[\\/:*?"<>|]/.test(character) ? '_' : character).join(''); document.body.appendChild(anchor); anchor.click(); }
  finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

export function safeSubmissionLink(value?: string): string | null {
  try { const parsed = new URL(value || ''); return ['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : null; } catch { return null; }
}

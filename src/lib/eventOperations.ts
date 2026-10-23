import { apiClient } from './api';
import type { ApiResponse, Pagination, Team } from '../types';
export const standardDomains = ['software', 'hardware', 'management', 'entrepreneurship'];
export interface ProblemStatement { statement_id: string; title: string; description: string; domains: string[]; active: boolean; sort_order: number; version: number; updated_at: string; updated_by: string; }
export type ProblemDraft = Pick<ProblemStatement, 'title' | 'description' | 'domains' | 'active' | 'sort_order'> & { version?: number };
export interface Issue { issue_id: string; team_id: string; team_name: string; domain: string; name: string; email: string; issue_type: string; title: string; description: string; status: 'open' | 'in_progress' | 'resolved'; resolution: string; version: number; created_at: string; updated_at: string; updated_by: string; }
export const eventOperations = {
  problems: async () => (await apiClient.get<ApiResponse<ProblemStatement[]>>('/api/admin/problem-statements')).data,
  saveProblem: async (id: string | null, body: ProblemDraft) => (id ? await apiClient.put<ApiResponse<ProblemStatement>>(`/api/admin/problem-statements/${encodeURIComponent(id)}`, body) : await apiClient.post<ApiResponse<ProblemStatement>>('/api/admin/problem-statements', body)).data,
  issues: async (params: { page: number; status: string; search: string }) => (await apiClient.get<ApiResponse<{ issues: Issue[]; pagination: Pagination }>>('/api/admin/issues', { params })).data,
  updateIssue: async (issue: Issue, status: Issue['status'], resolution: string) => (await apiClient.put<ApiResponse<Issue>>(`/api/admin/issues/${encodeURIComponent(issue.issue_id)}`, { status, resolution, version: issue.version })).data,
  updateTeam: async (id: string, body: Partial<Pick<Team, 'name' | 'contact' | 'domain' | 'ispublic' | 'problem_statement' | 'leader_user_id'>>) => (await apiClient.patch<ApiResponse>(`/api/admin/teams/${encodeURIComponent(id)}`, body)).data,
};
export const eligibleProblem = (problem: ProblemStatement, domain: string) => problem.active && (!problem.domains.length || problem.domains.includes(domain.trim().toLowerCase()));
export const operationError = (error: any, fallback: string) => error.response?.data?.message || error.message || fallback;

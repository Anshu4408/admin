import { apiClient } from './api';
import type { ApiResponse } from '../types';

export type EventFeature = 'mid_review' | 'final_review' | 'problem_statement' | 'raise_issue';
export type EventSettings = Record<EventFeature, boolean> & {
  version: number;
  updated_at: string;
  updated_by: string;
};
export const eventControls = {
  get: async () => (await apiClient.get<ApiResponse<EventSettings>>('/api/admin/event-settings')).data,
  update: async (feature: EventFeature, enabled: boolean, version: number) =>
    (await apiClient.put<ApiResponse<EventSettings>>('/api/admin/event-settings', { feature, enabled, version })).data,
};

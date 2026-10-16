export type AdminRole = 'superadmin' | 'admin';

export interface AdminUser {
  admin_id: string;
  email: string;
  name: string;
  picture?: string;
  role: AdminRole;
  can_manage_users: boolean;
  can_manage_teams: boolean;
  can_manage_payments: boolean;
  can_manage_admins: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  roll_number?: string;
  hostel?: string;
  mess?: string;
  gender?: string;
  pfp?: string;
  team_id?: string;
  created_at: string;
}

export interface Team {
  team_id: string;
  name: string;
  leader: string;
  leader_user_id: string;
  contact: string;
  domain?: string;
  problem_statement?: string;
  payment_status: string;
  ispublic: boolean;
  created_at: string;
  members?: User[];
}

export interface Payment {
  payment_id: string;
  order_id: string;
  team_id: string;
  team_name?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_session_id?: string;
  transaction_id?: string;
  screenshot_url?: string;
  raw_webhook_data?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  team_cap: number;
  total_users: number;
  total_teams: number;
  paid_teams: number;
  pending_teams: number;
  public_teams: number;
  total_revenue: number;
  users_with_team: number;
  users_without_team: number;
  domain_stats: Record<string, number>;
  payment_status_stats: Record<string, number>;
  recent_registrations: User[];
  recent_payments: Payment[];
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  token?: string;
}

export interface QRCode {
  id: number;
  label: string;
  image_url: string;
  upi_id?: string;
  is_active: boolean;
  slot_index: number;
  created_at: string;
  updated_at: string;
}

export interface QRPayment {
  id: number;
  team_id: string;
  utr: string;
  screenshot_url?: string;
  qr_slot_index: number;
  amount: number;
  status: 'processing' | 'paid' | 'rejected' | string;
  admin_note?: string;
  submitted_at: string;
  verified_at?: string;
  verified_by?: string;
}


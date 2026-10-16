import axios from 'axios';
import type { ApiResponse, DashboardStats, AdminUser, User, Team, Payment, Pagination, QRCode, QRPayment } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9002';

export const getMediaUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }
  return `${API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach admin token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tf_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If we got 401 on login route, don't clear token or redirect
      const isAuthRoute =
        error.config?.url?.includes('/user/login') ||
        error.config?.url?.includes('/user/sync') ||
        error.config?.url?.includes('/admin/auth');
      if (!isAuthRoute) {
        localStorage.removeItem('tf_admin_token');
        localStorage.removeItem('tf_admin_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export async function loadPaymentScreenshot(path: string): Promise<string> {
  if (!path.startsWith('/uploads/qr/')) throw new Error('Invalid payment screenshot path');
  const response = await apiClient.get(getMediaUrl(path), { responseType: 'blob' });
  return URL.createObjectURL(response.data);
}

function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

export const api = {
  // Auth
  auth: {
    googleLogin: async (credential: string) => {
      // Decode Google ID token JWT payload
      let email = '';
      let name = '';
      let picture = '';
      try {
        const payloadBase64 = credential.split('.')[1];
        const payloadStr = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(decodeURIComponent(escape(payloadStr)));
        email = payload.email || '';
        name = payload.name || email.split('@')[0];
        picture = payload.picture || '';
      } catch (err) {
        console.error('Failed to parse Google credential token:', err);
      }

      if (!email) {
        throw new Error('Google credential did not contain an email address');
      }

      const existingUser = localStorage.getItem('tf_admin_user');
      let userId = '';
      if (existingUser) {
        try {
          const parsed = JSON.parse(existingUser);
          if (parsed.email === email && parsed.admin_id) {
            userId = parsed.admin_id;
          }
        } catch {}
      }
      if (!userId) {
        userId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'a0000000-0000-0000-0000-000000000001';
      }

      // Synchronize with backend to generate a cryptographically valid JWT token
      const syncRes = await apiClient.post<ApiResponse<any>>('/api/user/sync', {
        user_id: userId,
        email: email,
        name: name,
        pfp: picture,
      });

      if (!syncRes.data?.success || !syncRes.data?.token) {
        throw new Error(syncRes.data?.message || 'Failed to generate admin session token');
      }

      const adminUser: AdminUser = {
        admin_id: syncRes.data.data?.user_id || userId,
        email: email,
        name: name,
        picture: picture,
        role: 'superadmin',
        can_manage_users: true,
        can_manage_teams: true,
        can_manage_payments: true,
        can_manage_admins: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        success: true,
        message: 'Google login successful',
        data: {
          token: syncRes.data.token,
          admin: adminUser,
        },
      };
    },

    devLogin: async (email: string) => {
      const cleanEmail = email.trim().toLowerCase();
      const userId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'a0000000-0000-0000-0000-000000000001';
      const syncRes = await apiClient.post<ApiResponse<any>>('/api/user/sync', {
        user_id: userId,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        pfp: '',
      });

      if (!syncRes.data?.success || !syncRes.data?.token) {
        throw new Error(syncRes.data?.message || 'Failed to authenticate admin session with server');
      }

      const adminUser: AdminUser = {
        admin_id: syncRes.data.data?.user_id || userId,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        picture: '',
        role: 'superadmin',
        can_manage_users: true,
        can_manage_teams: true,
        can_manage_payments: true,
        can_manage_admins: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        success: true,
        message: 'Dev login successful',
        data: {
          token: syncRes.data.token,
          admin: adminUser,
        },
      };
    },

    getMe: async () => {
      const { data } = await apiClient.get<ApiResponse<any>>('/api/user/me');
      if (data.success && data.data) {
        const u = data.data;
        const saved = localStorage.getItem('tf_admin_user');
        const parsed = saved ? JSON.parse(saved) : {};
        const adminUser: AdminUser = {
          admin_id: u.user_id || parsed.admin_id,
          email: u.email || parsed.email,
          name: u.name || parsed.name || 'Admin',
          picture: u.pfp || parsed.picture,
          role: parsed.role || 'superadmin',
          can_manage_users: true,
          can_manage_teams: true,
          can_manage_payments: true,
          can_manage_admins: true,
          is_active: true,
          created_at: u.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return {
          success: true,
          message: 'User session active',
          data: adminUser,
        };
      }
      return {
        success: false,
        message: data.message || 'Session expired',
      };
    },

    logout: async () => {
      try {
        await apiClient.post('/api/user/logout');
      } catch {}
      return { success: true, message: 'Logged out' };
    },
  },

  // Dashboard
  dashboard: {
    getStats: async () => {
      const { data } = await apiClient.get<ApiResponse<DashboardStats>>('/api/admin/stats');
      return data;
    },
  },

  // Users
  users: {
    list: async (params?: { search?: string; hostel?: string; mess?: string; gender?: string; has_team?: string; page?: number; limit?: number }) => {
      try {
        const { data } = await apiClient.get<ApiResponse<{ users: User[]; pagination: Pagination }>>('/api/admin/users', { params });
        return data;
      } catch {
        return {
          success: false,
          message: 'User management is unavailable on the connected backend',
          data: { users: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 } },
        };
      }
    },
    get: async (id: string) => {
      const { data } = await apiClient.get<ApiResponse<{ user: User; team?: Team }>>(`/api/admin/users/${encodeURIComponent(id)}`);
      return data;
    },
    update: async (id: string, payload: Partial<User>) => {
      const { data } = await apiClient.put<ApiResponse>(`/api/admin/users/${encodeURIComponent(id)}`, payload);
      return data;
    },
    delete: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse>(`/api/admin/users/${id}`);
      return data;
    },
    exportCsvUrl: () => `${API_BASE_URL}/api/admin/users/export`,
    downloadCsv: async () => {
      const response = await apiClient.get('/api/admin/users/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transfinitte_users_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
  },

  // Teams
  teams: {
    list: async (params?: { search?: string; domain?: string; payment_status?: string; is_public?: string; page?: number; limit?: number }) => {
      try {
        const { data } = await apiClient.get<ApiResponse<Team[]>>('/api/admin/teams');
        const teams = Array.isArray(data?.data) ? data.data : [];
        let filtered = teams;
        if (params?.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter((t) => t.name?.toLowerCase().includes(s) || t.team_id?.toLowerCase().includes(s));
        }
        if (params?.domain) filtered = filtered.filter((t) => t.domain === params.domain);
        if (params?.is_public) filtered = filtered.filter((t) => t.ispublic === (params.is_public === 'true'));
        if (params?.payment_status) {
          filtered = filtered.filter((t) => t.payment_status?.toLowerCase() === params.payment_status?.toLowerCase());
        }
        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const total = filtered.length;
        const pages = Math.max(1, Math.ceil(total / limit));
        return {
          success: true,
          message: 'Teams loaded',
          data: {
            teams: filtered.slice((page - 1) * limit, page * limit),
            pagination: { total, page, limit, pages },
          },
        };
      } catch {
        return {
          success: false,
          message: 'Failed to load teams',
          data: { teams: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 } },
        };
      }
    },
    get: async (id: string) => {
      const { data } = await apiClient.get<ApiResponse<Team>>(`/api/admin/teams/${encodeURIComponent(id)}`);
      return data;
    },
    update: async (id: string, payload: Partial<Team>) => {
      const { data } = await apiClient.patch<ApiResponse>(`/api/team/${id}/details`, payload);
      return data;
    },
    updatePaymentStatus: async (id: string, payment_status: string) => {
      // Direct team payment status update: checks if qr payment exists or team pay endpoint
      const { data: submissions } = await apiClient.get<ApiResponse<QRPayment[]>>('/api/admin/qr-payments', { params: { status: 'processing' } });
      const pending = submissions.data?.find((p) => p.team_id === id);
      if (!submissions.success || !pending) throw new Error('No QR payment is awaiting review for this team');
      if (payment_status !== 'PAID' && payment_status !== 'Pending' && payment_status !== 'REJECTED') throw new Error('Review QR submissions to approve or reject a payment');
      const action = payment_status === 'PAID' ? 'approve' : 'reject';
      const { data } = await apiClient.post<ApiResponse>(`/api/admin/qr-payments/${pending.id}/${action}`);
      return data;
    },
    addMember: async (teamId: string, payload: { user_id?: string; email?: string }) => {
      const { data } = await apiClient.post<ApiResponse>(`/api/team/${teamId}/members`, payload);
      return data;
    },
    removeMember: async (teamId: string, userId: string) => {
      const { data } = await apiClient.delete<ApiResponse>(`/api/team/${teamId}/members/${userId}`);
      return data;
    },
    changeLeader: async (teamId: string, new_leader_user_id: string) => {
      const { data } = await apiClient.post<ApiResponse>(`/api/team/${teamId}/leader`, { new_leader_user_id });
      return data;
    },
    delete: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse>(`/api/team/${id}`);
      return data;
    },
    downloadCsv: async () => {
      try {
        const { data } = await apiClient.get<ApiResponse<Team[]>>('/api/admin/teams');
        const teams = Array.isArray(data?.data) ? data.data : [];
        const rows = [
          ['Team ID', 'Name', 'Leader', 'Contact', 'Domain', 'Payment Status', 'Created At'],
          ...teams.map((t) => [t.team_id, t.name, t.leader, t.contact, t.domain || '', t.payment_status, t.created_at]),
        ];
        const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transfinitte_teams_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to export teams CSV', err);
      }
    }
  },

  // Payments (Mapped to real /api/admin/qr-payments endpoint)
  payments: {
    list: async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
      try {
        const { data } = await apiClient.get<ApiResponse<QRPayment[]>>('/api/admin/qr-payments', {
          params: { status: params?.status },
        });
        const qrList = Array.isArray(data?.data) ? data.data : [];
        const payments: Payment[] = qrList.map((q) => ({
          payment_id: `QR-${q.id}`,
          order_id: q.utr,
          team_id: q.team_id,
          amount: q.amount || 400,
          currency: 'INR',
          payment_status: q.status?.toUpperCase() === 'PAID' ? 'SUCCESS' : q.status?.toUpperCase() || 'PENDING',
          transaction_id: q.utr,
          screenshot_url: q.screenshot_url,
          raw_webhook_data: q.admin_note || (q.verified_by ? `Verified by ${q.verified_by}` : undefined),
          created_at: q.submitted_at || new Date().toISOString(),
          updated_at: q.verified_at || q.submitted_at || new Date().toISOString(),
        }));

        let filtered = payments;
        if (params?.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.team_id?.toLowerCase().includes(s) ||
              p.order_id?.toLowerCase().includes(s) ||
              p.transaction_id?.toLowerCase().includes(s)
          );
        }

        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const total = filtered.length;
        const pages = Math.max(1, Math.ceil(total / limit));
        const paginated = filtered.slice((page - 1) * limit, page * limit);

        return {
          success: true,
          message: 'Payments loaded',
          data: {
            payments: paginated,
            pagination: { total, page, limit, pages },
          },
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.response?.data?.message || err.message || 'Failed to fetch payments',
          data: {
            payments: [],
            pagination: { total: 0, page: 1, limit: 10, pages: 1 },
          },
        };
      }
    },
    verifyManual: async (payload: { team_id: string; amount: number; payment_status: string; transaction_id: string; notes?: string }) => {
      return api.teams.updatePaymentStatus(payload.team_id, payload.payment_status);
    },
    downloadCsv: async () => {
      try {
        const { data } = await apiClient.get<ApiResponse<QRPayment[]>>('/api/admin/qr-payments');
        const qrList = Array.isArray(data?.data) ? data.data : [];
        const rows = [
          ['Payment ID', 'Team ID', 'UTR', 'Amount', 'Slot', 'Status', 'Submitted At', 'Verified By', 'Admin Note'],
          ...qrList.map((q) => [
            q.id,
            q.team_id,
            q.utr,
            q.amount,
            q.qr_slot_index,
            q.status,
            q.submitted_at,
            q.verified_by || '',
            q.admin_note || '',
          ]),
        ];
        const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transfinitte_payments_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to export payments CSV', err);
      }
    }
  },

  // Admins & Roles
  admins: {
    list: async () => {
      const { data } = await apiClient.get<ApiResponse<AdminUser[]>>('/api/admin/admins');
      return data;
    },
    create: async (payload: { email: string; name?: string; role: string; can_manage_users: boolean; can_manage_teams: boolean; can_manage_payments: boolean; can_manage_admins: boolean }) => {
      const { data } = await apiClient.post<ApiResponse<AdminUser>>('/api/admin/admins', payload);
      return data;
    },
    update: async (id: string, payload: { name?: string; role?: string; can_manage_users?: boolean; can_manage_teams?: boolean; can_manage_payments?: boolean; can_manage_admins?: boolean; is_active?: boolean }) => {
      const { data } = await apiClient.put<ApiResponse>(`/api/admin/admins/${id}`, payload);
      return data;
    },
    delete: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse>(`/api/admin/admins/${id}`);
      return data;
    }
  },

  // QR Codes & Verification
  qr: {
    // List all configured QR code slots
    getCodes: async () => {
      const { data } = await apiClient.get<ApiResponse<QRCode[]>>('/api/admin/qr-codes');
      return data;
    },
    // Get active rotating QR code
    getActive: async () => {
      const { data } = await apiClient.get<ApiResponse<{ qr: QRCode | null; slot_index: number }>>('/api/payment/qr');
      return data;
    },
    // Upload or update a QR code for a slot
    upsertCode: async (formData: FormData) => {
      const { data } = await apiClient.post<ApiResponse>('/api/admin/qr-codes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
    // List all QR payment submissions with optional status filter
    getPayments: async (params?: { status?: string }) => {
      const { data } = await apiClient.get<ApiResponse<QRPayment[]>>('/api/admin/qr-payments', { params });
      return data;
    },
    // Approve QR payment submission and mark team as PAID
    approvePayment: async (id: number) => {
      const { data } = await apiClient.post<ApiResponse>(`/api/admin/qr-payments/${id}/approve`);
      return data;
    },
    // Reject QR payment submission with admin note and revert team to Pending
    rejectPayment: async (id: number, admin_note?: string) => {
      const { data } = await apiClient.post<ApiResponse>(`/api/admin/qr-payments/${id}/reject`, { admin_note });
      return data;
    },
  }
};

# TransfiNITTe 2025 - Admin Operations Portal

A minimal, high-performance, soothing admin portal for managing TransfiNITTe 2025 participants, team squads, payment reconciliations, and RBAC administrators.

---

## 🌟 Key Features

1. **Google OAuth & Strict Email Whitelisting**:
   - Only authorized administrator emails can enter the portal.
   - Initial superadmins can be seeded via backend `ADMIN_EMAILS` environment variable.

2. **Role-Based Access Control (RBAC)**:
   - **Superadmin**: Full unrestricted platform access.
   - **Custom Admin Permissions**:
     - `can_manage_users`: Directory browsing, profile modifications, team disassociation, participant deletion, and CSV export.
     - `can_manage_teams`: Squad creation, member additions/removals, leadership transfer, payment status updates, and squad disbanding.
     - `can_manage_payments`: Transaction audit logs, offline UPI/Cash manual verification, and reconciliation.
     - `can_manage_admins`: Whitelist new Google emails and grant granular permissions.

3. **Participant Management**:
   - Live search by Name, Email, Roll Number, or Team ID.
   - Multi-filter by Hostel, Mess, Gender, and Team Assignment status.
   - Quick export to CSV.

4. **Team Squad Management**:
   - Detailed roster inspector.
   - Add participant directly to team by email.
   - Transfer team leader crown.
   - Quick payment status dropdown (Paid, Pending, Failed).

5. **Payment Reconciliation**:
   - Cashfree checkout log tracking.
   - Manual payment verification modal (offline UPI, bank transfer, fee waivers).
   - One-click CSV export.

---

## 🚀 Getting Started

### 1. Configure Environment (`admin/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### 2. Configure Backend (`backend/.env`)
```env
# Comma-separated initial superadmin emails
ADMIN_EMAILS=admin@transfinitte.com,your-email@gmail.com
```

### 3. Run Development Server
```bash
cd admin
npm run dev
```
The admin portal will start at `http://localhost:5174`.

### 4. Build for Production
```bash
npm run build
```
The static build will be placed in `admin/dist`.


## Administrator sign-in

Only Google sign-in is supported. The browser sends the Google credential to
`POST /api/admin/auth/google`; the backend verifies its signature, client ID,
issuer, expiry, verified email, and the `ADMIN_EMAILS` allowlist before creating
an eight-hour admin session. Existing direct-sign-in/testing sessions are rejected.
The UI reads the current administrator from `GET /api/admin/auth/me`.

Set backend `GOOGLE_CLIENT_ID` to the same OAuth client ID as this panel's
`VITE_GOOGLE_CLIENT_ID`. Keep `ADMIN_EMAILS` configured on the backend.
Deploy the matching backend update before using this frontend release.

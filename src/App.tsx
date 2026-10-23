import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UsersPage } from './pages/Users';
import { SubmissionsPage } from './pages/Submissions';
import { IssuesPage } from './pages/Issues';
import { ProblemStatementsPage } from './pages/ProblemStatements';
import { TeamsPage } from './pages/Teams';
import { PaymentsPage } from './pages/Payments';
import { AdminsPage } from './pages/Admins';
import { QRPaymentsPage } from './pages/QRPayments';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder-id.apps.googleusercontent.com';

export function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Admin Routes */}
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/submissions" element={<SubmissionsPage />} />
              <Route path="/issues" element={<IssuesPage />} />
              <Route path="/problem-statements" element={<ProblemStatementsPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/qr-payments" element={<QRPaymentsPage />} />
              <Route path="/qr-codes" element={<QRPaymentsPage />} />
              <Route path="/admins" element={<AdminsPage />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

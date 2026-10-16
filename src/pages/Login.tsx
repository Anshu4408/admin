import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Shield, Sparkles, AlertCircle, Lock, Users, Layers, CreditCard, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { loginWithGoogle, loginWithDev, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('negi.anshulnegi17@gmail.com');

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    setLoading(true);
    try {
      if (!credentialResponse.credential) {
        throw new Error('Google did not return a valid credential');
      }
      await loginWithGoogle(credentialResponse.credential);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Google authorization failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await loginWithDev(adminEmailInput.trim());
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Authorization failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Failed to authenticate with Google. Please try again or check OAuth configuration.');
  };

  const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Subtle background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Top Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-500 p-0.5 shadow-lg shadow-brand-500/20 mb-4">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Shield className="w-7 h-7 text-brand-600" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            TransfiNITTe Admin
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Restricted Operations & Event Administration Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-card relative">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 mb-6 text-xs text-slate-600 font-medium">
            <Lock className="w-3.5 h-3.5 text-brand-600" />
            <span>Role-Based Access Control (RBAC) Enforced</span>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">Authorization Error</p>
                <p className="text-rose-600 leading-relaxed font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Google Sign In Section */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-700 text-center">
              Sign in with your authorized Google Account
            </p>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-1 text-xs text-brand-600 font-semibold animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authorizing administrator credentials...</span>
              </div>
            )}

            {hasGoogleClientId ? (
              <div className="flex justify-center w-full py-2">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="outline"
                  shape="pill"
                  size="large"
                  text="signin_with"
                  width="360"
                />
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <p className="font-bold mb-1">Google OAuth Client ID Required</p>
                <p className="text-amber-700 leading-relaxed font-medium">
                  Please set <code className="px-1 py-0.5 bg-white border border-amber-200 rounded font-mono text-amber-900">VITE_GOOGLE_CLIENT_ID</code> in <code className="font-mono">admin/.env</code> and restart the frontend server.
                </p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 text-center font-medium">
              Only whitelisted administrator email addresses can access this portal.
            </div>

            {/* Direct Admin Email Sign-in option */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Or Sign In by Admin Email
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-2 mt-1">
                <input
                  type="email"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="e.g. negi.anshulnegi17@gmail.com"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-medium"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-soft transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In as Administrator</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              Management Modules
            </h4>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 font-semibold">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center">
                <Users className="w-4 h-4 text-brand-600 mb-1" />
                <span>Users</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center">
                <Layers className="w-4 h-4 text-indigo-600 mb-1" />
                <span>Teams</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center">
                <CreditCard className="w-4 h-4 text-emerald-600 mb-1" />
                <span>Payments</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 font-medium mt-6">
          TransfiNITTe 2025 &bull; Department of Technical Affairs
        </p>
      </div>
    </div>
  );
};

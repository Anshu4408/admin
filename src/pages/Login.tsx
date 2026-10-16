import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleGoogleError = () => {
    setError('Failed to authenticate with Google. Please try again or check OAuth configuration.');
  };

  const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-950 text-neutral-200">
      <header className="flex h-20 items-center gap-3 border-b border-neutral-800 px-5 sm:px-10">
        <img src="/motif.svg" alt="" className="h-8 w-11 object-contain" />
        <span className="text-sm">TransfiNITTe <span className="ml-2 text-neutral-500">/ Admin</span></span>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-neutral-500">Event administration / 2026</p>
          <h1 className="text-3xl font-medium tracking-tight text-white">Welcome back.</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">Sign in to manage participants, teams and payment reviews.</p>
          <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-2 text-xs text-neutral-400"><Lock className="h-4 w-4" /> Administrator access</div>
            {error && <div role="alert" className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-300">{error}</div>}
            {loading ? <div role="status" className="flex items-center justify-center gap-2 py-4 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Signing in…</div> : hasGoogleClientId ? (
              <div className="flex min-h-11 justify-center"><GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} theme="filled_black" shape="rectangular" size="large" text="signin_with" /></div>
            ) : <p role="alert" className="text-sm text-amber-300">Google sign-in is unavailable. Please contact the event team.</p>}
            <p className="mt-6 border-t border-neutral-800 pt-5 text-xs leading-relaxed text-neutral-500">Use the Google account approved for administrator access.</p>
          </div>
        </div>
      </main>
      <footer className="border-t border-neutral-800 p-5 text-center text-xs text-neutral-500">TransfiNITTe 2026 · Technical Council, NIT Trichy</footer>
    </div>
  );
};

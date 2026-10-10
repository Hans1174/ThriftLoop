import { API_URL } from './config';
import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, CheckCircle2, AlertCircle, 
  Loader2, ArrowRight, ArrowLeft, KeyRound 
} from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  // State for request link form
  const [email, setEmail] = useState('');

  // State for new password form
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 1. Submit email to request recovery link
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch recovery email.');
      }

      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit new password using the URL token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Password update failed.');
      }

      setMessage(data.message);

      // Redirect back home and open the login modal automatically
      setTimeout(() => {
        navigate('/');
        window.dispatchEvent(new Event('open-login-modal'));
      }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-[#F6F1E8] flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-10 shadow-sm max-w-md w-full animate-in fade-in duration-300">
        
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-full bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center mx-auto mb-4">
          <KeyRound size={28} />
        </div>

        <h1 className="font-serif text-2xl font-bold text-center text-[#23313A]">
          {token ? 'Set New Password' : 'Reset Password'}
        </h1>
        <p className="text-xs text-center text-[#23313A]/70 mt-1 mb-6">
          {token
            ? 'Enter your new account password below.'
            : 'Enter your registered email address to receive a secure recovery link.'}
        </p>

        {error && (
          <div className="mb-4 bg-[#E67E5F]/15 border border-[#E67E5F]/30 text-[#E67E5F] text-xs p-3.5 rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-4 bg-[#2F6B4F]/15 border border-[#2F6B4F]/30 text-[#2F6B4F] text-xs p-3.5 rounded-xl flex items-center gap-2 font-medium">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Form A: Request Recovery Link */}
        {!token ? (
          <form onSubmit={handleRequestReset} className="space-y-4 text-xs">
            <div>
              <label className="block uppercase text-[10px] font-bold text-[#A8C3A0] mb-1 tracking-wider">
                Registered Account Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-[#A8C3A0]" />
                <input
                  type="email"
                  required
                  placeholder="admin@thriftloop.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Dispatching Recovery Link...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Link</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Form B: Submit New Password */
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            <div>
              <label className="block uppercase text-[10px] font-bold text-[#A8C3A0] mb-1 tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-[#A8C3A0]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                />
              </div>
            </div>

            <div>
              <label className="block uppercase text-[10px] font-bold text-[#A8C3A0] mb-1 tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-[#A8C3A0]" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Back Navigation */}
        <div className="mt-6 pt-4 border-t border-[#A8C3A0]/20 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#23313A]/70 hover:text-[#2F6B4F] transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Return to Boutique</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
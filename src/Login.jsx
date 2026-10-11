import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, X, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

const API_URL = import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function Login({ isOpen, onClose, onLoginSuccess }) {
  // 1. All hooks MUST be declared at the top before any returns
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSuccess = (user, token) => {
    localStorage.setItem('thriftloop_user', JSON.stringify(user));
    localStorage.setItem('thriftloop_token', token);
    
    if (onLoginSuccess) {
      onLoginSuccess(user, token);
    }
    onClose();

    if (user.role === 'admin' || user.email === 'admin@thriftloop.com') {
      navigate('/admin');
    }
  };

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setLoading(true);

      try {
        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Google login failed on backend verification.');

        handleSuccess(data.user, data.token);
      } catch (err) {
        console.error('❌ Google Auth Error:', err);
        setError(err.message || 'Google login failed.');
      } finally {
        setLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error('❌ Google Popup Error:', errorResponse);
      setError(`Google Sign-In failed: ${errorResponse.error_description || errorResponse.error || 'Popup was blocked'}`);
    },
  });

  // 2. Early return sits safely below all hook declarations
  if (!isOpen) return null;

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or password.');

      handleSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegister = () => {
    onClose();
    navigate('/register');
  };

  const handleGoToForgotPassword = () => {
    onClose();
    navigate('/forgot-password');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#23313A]/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#A8C3A0] hover:text-[#23313A] p-1.5 rounded-full hover:bg-[#F6F1E8] transition-colors cursor-pointer"
          title="Close Modal"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23313A]">Welcome Back</h2>
          <p className="text-xs text-[#23313A]/60 font-medium mt-1">
            Sign in to secure 1-of-1 pieces and track your orders.
          </p>
        </div>

        {error && (
          <div className="bg-[#E67E5F]/10 border border-[#E67E5F]/30 text-[#E67E5F] text-xs p-3 rounded-xl flex items-center gap-2 mb-4 font-bold animate-in fade-in">
            <AlertCircle size={15} className="shrink-0" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Native Unblocked Google Login Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => triggerGoogleLogin()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-[#A8C3A0]/60 hover:bg-[#F6F1E8] text-[#23313A] font-bold text-xs py-3 px-4 rounded-full shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="flex items-center gap-3 my-4">
          <hr className="flex-1 border-[#A8C3A0]/30" />
          <span className="text-[10px] uppercase font-bold text-[#A8C3A0] tracking-wider">
            or continue with email
          </span>
          <hr className="flex-1 border-[#A8C3A0]/30" />
        </div>

        {/* Standard Email/Password Form */}
        <form onSubmit={handleStandardLogin} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={15} className="absolute left-3.5 text-[#A8C3A0]" />
              <input
                type="email"
                required
                placeholder="hans@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute left-3.5 text-[#A8C3A0]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-[#A8C3A0] hover:text-[#23313A] transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            
            <div className="flex justify-end pt-1.5">
              <button
                type="button"
                onClick={handleGoToForgotPassword}
                className="text-[11px] font-semibold text-[#2F6B4F] hover:text-[#23313A] transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer active:scale-95"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 border-t border-[#A8C3A0]/25 pt-4 text-center">
          <p className="text-xs text-[#23313A]/70 font-medium">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={handleGoToRegister}
              className="text-[#2F6B4F] font-bold hover:underline ml-1 cursor-pointer"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
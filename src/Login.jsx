import { API_URL } from './config';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, X, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Login({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

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

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google login failed.');

      handleSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegister = () => {
    onClose();
    navigate('/register');
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
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#A8C3A0] hover:text-[#23313A] p-1.5 rounded-full hover:bg-[#F6F1E8] transition-colors cursor-pointer"
          title="Close Modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23313A]">Welcome Back</h2>
          <p className="text-xs text-[#23313A]/60 font-medium mt-1">
            Sign in to secure 1-of-1 pieces and track your orders.
          </p>
        </div>

        {error && (
          <div className="bg-[#E67E5F]/10 border border-[#E67E5F]/30 text-[#E67E5F] text-xs p-3 rounded-xl flex items-center gap-2 mb-4 font-bold animate-in fade-in">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google One-Click Login */}
        <div className="flex justify-center mb-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in was unsuccessful.')}
            shape="pill"
            theme="outline"
            width="320"
          />
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer active:scale-95"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>

        {/* Redirect to Register */}
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
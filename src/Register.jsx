import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, Mail, User, Phone, MapPin, Building, 
  Eye, EyeOff, Loader2, AlertCircle, Sparkles, Check 
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    streetAddress: '',
    city: '',
    province: '',
    postalCode: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegisterSuccess = (user, token) => {
    localStorage.setItem('thriftloop_user', JSON.stringify(user));
    localStorage.setItem('thriftloop_token', token);
    window.dispatchEvent(new Event('auth-change'));
    navigate('/shop');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          street_address: formData.streetAddress.trim(),
          city: formData.city.trim(),
          province: formData.province.trim(),
          postal_code: formData.postalCode.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create your account.');

      handleRegisterSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Unable to connect to server. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-up failed.');

      handleRegisterSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Google registration was unsuccessful.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLoginModal = () => {
    window.dispatchEvent(new Event('open-login-modal'));
  };

  return (
    <div className="w-full bg-[#F6F1E8] text-[#23313A] font-sans py-10 sm:py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto bg-white border border-[#A8C3A0]/40 rounded-3xl p-6 sm:p-12 shadow-sm animate-in fade-in duration-300">
        
        {/* Title & Subheading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2 bg-[#F6F1E8] border border-[#A8C3A0]/30 px-3 py-1 rounded-full">
            <Sparkles size={14} className="text-[#E67E5F]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F6B4F]">Join The Archive</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#23313A] tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs text-[#23313A]/60 font-medium mt-1.5 max-w-md mx-auto">
            Join ThriftLoop to save measurements, preset your default delivery address, and secure rare 1-of-1 archive pieces.
          </p>
        </div>

        {error && (
          <div className="bg-[#E67E5F]/10 border border-[#E67E5F]/30 text-[#E67E5F] text-xs p-3.5 rounded-2xl flex items-center gap-2.5 mb-6 font-bold animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Quick Sign-Up */}
        <div className="flex justify-center mb-6">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google registration was unsuccessful.')}
            shape="pill"
            theme="outline"
            width="340"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <hr className="flex-1 border-[#A8C3A0]/30" />
          <span className="text-[10px] uppercase font-bold text-[#A8C3A0] tracking-wider">
            or register with email
          </span>
          <hr className="flex-1 border-[#A8C3A0]/30" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          
          {/* Section 1: Account Information */}
          <div>
            <h3 className="font-serif font-bold text-sm text-[#23313A] mb-3 pb-1.5 border-b border-[#A8C3A0]/20 flex items-center gap-2">
              <User size={15} className="text-[#2F6B4F]" />
              <span>Personal Details</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User size={15} className="absolute left-3.5 text-[#A8C3A0]" />
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="Hans Castro"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={15} className="absolute left-3.5 text-[#A8C3A0]" />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="hans@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <Phone size={15} className="absolute left-3.5 text-[#A8C3A0]" />
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="0917 123 4567"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Default Delivery Address */}
          <div>
            <h3 className="font-serif font-bold text-sm text-[#23313A] mb-3 pb-1.5 border-b border-[#A8C3A0]/20 flex items-center gap-2">
              <MapPin size={15} className="text-[#2F6B4F]" />
              <span>Default Delivery Address</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                  House / Unit / Street / Barangay
                </label>
                <div className="relative flex items-center">
                  <Building size={15} className="absolute left-3.5 text-[#A8C3A0]" />
                  <input
                    type="text"
                    name="streetAddress"
                    required
                    placeholder="Block 4 Lot 12, Vintage Street, Brgy. San Jose"
                    value={formData.streetAddress}
                    onChange={handleChange}
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    City / Municipality
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    placeholder="Dasmariñas"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Province / Region
                  </label>
                  <input
                    type="text"
                    name="province"
                    required
                    placeholder="Cavite"
                    value={formData.province}
                    onChange={handleChange}
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Postal / ZIP Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    required
                    placeholder="4114"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Password Security */}
          <div>
            <h3 className="font-serif font-bold text-sm text-[#23313A] mb-3 pb-1.5 border-b border-[#A8C3A0]/20 flex items-center gap-2">
              <Lock size={15} className="text-[#2F6B4F]" />
              <span>Account Security</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={15} className="absolute left-3.5 text-[#A8C3A0]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
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

              <div>
                <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock size={15} className="absolute left-3.5 text-[#A8C3A0]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 text-[#A8C3A0] hover:text-[#23313A] transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#23313A]/60 leading-relaxed pt-1">
            By creating an account, you agree to ThriftLoop’s Terms of Service and vintage condition grading policies.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Complete Registration</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-[#A8C3A0]/30 text-center">
          <p className="text-xs text-[#23313A]/70 font-medium">
            Already registered with us?{' '}
            <button
              type="button"
              onClick={handleOpenLoginModal}
              className="text-[#2F6B4F] font-bold hover:underline ml-1 cursor-pointer"
            >
              Log In
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
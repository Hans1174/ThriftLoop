import { API_URL } from './config';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, MapPin, Bell, LogOut, Check, 
  Package, Loader2, AlertCircle, ExternalLink 
} from 'lucide-react';
import { PHILIPPINES_ADDRESS_DATA } from './data/philippinesAddress';

const BACKEND_URL = API_URL || import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function MyAccount() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'addresses' | 'notifications'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Address Dropdown States
  const [selectedRegion, setSelectedRegion] = useState('Region IV-A (CALABARZON)');
  const [selectedProvince, setSelectedProvince] = useState('Cavite');
  const [selectedCity, setSelectedCity] = useState('Dasmariñas City');

  const [userData, setUserData] = useState({
    user_id: '',
    full_name: '',
    email: '',
    phone: '',
    street_address: '',
    city: 'Dasmariñas City',
    province: 'Cavite',
    postal_code: '',
    notification_preferences: {
      order_tracking_email: true,
      telegram_drops: true,
    },
  });

  const showToast = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    const stored = localStorage.getItem('thriftloop_user');
    if (!stored) {
      navigate('/');
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }

    const parsed = JSON.parse(stored);
    const userId = parsed.user_id || parsed.id;

    const loadProfile = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/users/${userId}`);
        if (res.ok) {
          const remoteUser = await res.json();
          setUserData({
            user_id: remoteUser.user_id || userId,
            full_name: remoteUser.full_name || '',
            email: remoteUser.email || '',
            phone: remoteUser.phone || '',
            street_address: remoteUser.street_address || '',
            city: remoteUser.city || 'Dasmariñas City',
            province: remoteUser.province || 'Cavite',
            postal_code: remoteUser.postal_code || '',
            notification_preferences: remoteUser.notification_preferences || {
              order_tracking_email: true,
              telegram_drops: true,
            },
          });

          // Match saved province to its corresponding region
          let matchedRegion = 'Region IV-A (CALABARZON)';
          let matchedProvince = remoteUser.province || 'Cavite';

          for (const [reg, provObj] of Object.entries(PHILIPPINES_ADDRESS_DATA)) {
            if (Object.keys(provObj).includes(matchedProvince)) {
              matchedRegion = reg;
              break;
            }
          }

          setSelectedRegion(matchedRegion);
          setSelectedProvince(matchedProvince);

          const validCities = PHILIPPINES_ADDRESS_DATA[matchedRegion]?.[matchedProvince] || [];
          const matchedCity = validCities.find(
            (c) => c.toLowerCase() === (remoteUser.city || '').toLowerCase()
          ) || validCities[0] || 'Dasmariñas City';

          setSelectedCity(matchedCity);
        } else {
          setUserData((prev) => ({
            ...prev,
            ...parsed,
            notification_preferences: parsed.notification_preferences || {
              order_tracking_email: true,
              telegram_drops: true,
            },
          }));
        }
      } catch {
        setUserData((prev) => ({
          ...prev,
          ...parsed,
        }));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleRegionChange = (newRegion) => {
    setSelectedRegion(newRegion);
    const provinces = Object.keys(PHILIPPINES_ADDRESS_DATA[newRegion] || {});
    const firstProvince = provinces[0] || '';
    setSelectedProvince(firstProvince);

    const cities = PHILIPPINES_ADDRESS_DATA[newRegion]?.[firstProvince] || [];
    const firstCity = cities[0] || '';
    setSelectedCity(firstCity);

    setUserData((prev) => ({
      ...prev,
      province: firstProvince,
      city: firstCity,
    }));
  };

  const handleProvinceChange = (newProvince) => {
    setSelectedProvince(newProvince);
    const cities = PHILIPPINES_ADDRESS_DATA[selectedRegion]?.[newProvince] || [];
    const firstCity = cities[0] || '';
    setSelectedCity(firstCity);

    setUserData((prev) => ({
      ...prev,
      province: newProvince,
      city: firstCity,
    }));
  };

  const handleCityChange = (newCity) => {
    setSelectedCity(newCity);
    setUserData((prev) => ({ ...prev, city: newCity }));
  };

  const handleSave = async (updatedFields, successMessage = 'Changes saved successfully.') => {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${userData.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user profile.');

      setUserData((prev) => ({ ...prev, ...data.user }));

      // Synchronize localStorage auth session
      const currentStored = JSON.parse(localStorage.getItem('thriftloop_user') || '{}');
      const mergedUser = { ...currentStored, ...data.user };
      localStorage.setItem('thriftloop_user', JSON.stringify(mergedUser));
      window.dispatchEvent(new Event('auth-change'));

      showToast(successMessage);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    handleSave(
      {
        full_name: userData.full_name,
        phone: userData.phone,
      },
      'Profile information updated.'
    );
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    handleSave(
      {
        street_address: userData.street_address,
        province: selectedProvince,
        city: selectedCity,
        postal_code: userData.postal_code,
      },
      'Saved delivery address updated.'
    );
  };

  const handleToggleNotification = (key) => {
    const updatedPreferences = {
      ...userData.notification_preferences,
      [key]: !userData.notification_preferences[key],
    };

    setUserData((prev) => ({
      ...prev,
      notification_preferences: updatedPreferences,
    }));

    handleSave(
      { notification_preferences: updatedPreferences },
      'Notification preferences updated.'
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('thriftloop_user');
    localStorage.removeItem('thriftloop_token');
    localStorage.removeItem('thriftloop_cart');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  const availableProvinces = Object.keys(PHILIPPINES_ADDRESS_DATA[selectedRegion] || {});
  const availableCities = PHILIPPINES_ADDRESS_DATA[selectedRegion]?.[selectedProvince] || [];

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-[#F6F1E8] flex items-center justify-center font-mono text-xs text-[#23313A]">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-[#2F6B4F]" />
          <span>Retrieving account profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F1E8] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-mono text-[#23313A]">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Toast Notification */}
        {notification && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 ${
            notification.type === 'error'
              ? 'bg-[#E67E5F] text-white border-[#E67E5F]'
              : 'bg-[#2F6B4F] text-white border-[#2F6B4F]'
          }`}>
            {notification.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#23313A]">
            My Account
          </h1>

          <Link
            to="/orders"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#2F6B4F] hover:text-white text-[#2F6B4F] border border-[#A8C3A0]/40 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
          >
            <Package size={15} />
            <span>Go to My Orders</span>
          </Link>
        </div>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Navigation Card */}
          <div className="md:col-span-4 bg-white border border-[#A8C3A0]/30 rounded-3xl p-3 shadow-xs space-y-1">
            <button
              type="button"
              onClick={() => setActiveSection('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer ${
                activeSection === 'profile'
                  ? 'bg-[#2F6B4F] text-white shadow-xs'
                  : 'text-[#23313A] hover:bg-[#F6F1E8]/70'
              }`}
            >
              <User size={16} />
              <span>Profile Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('addresses')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer ${
                activeSection === 'addresses'
                  ? 'bg-[#2F6B4F] text-white shadow-xs'
                  : 'text-[#23313A] hover:bg-[#F6F1E8]/70'
              }`}
            >
              <MapPin size={16} />
              <span>Saved Addresses</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer ${
                activeSection === 'notifications'
                  ? 'bg-[#2F6B4F] text-white shadow-xs'
                  : 'text-[#23313A] hover:bg-[#F6F1E8]/70'
              }`}
            >
              <Bell size={16} />
              <span>Notifications</span>
            </button>

            <div className="pt-2 border-t border-[#A8C3A0]/20">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-[#E67E5F] hover:bg-rose-50 text-left transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* Right Content Panel */}
          <div className="md:col-span-8 bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 shadow-xs">
            
            {/* TAB 1: Profile Details */}
            {activeSection === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <h2 className="font-serif font-bold text-xl text-[#23313A] pb-3 border-b border-[#A8C3A0]/20">
                  Profile Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#23313A] uppercase tracking-wider block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={userData.full_name}
                      onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                      className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-4 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#23313A] uppercase tracking-wider block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      disabled
                      value={userData.email}
                      className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-xl px-4 py-2.5 text-xs cursor-not-allowed font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#23313A] uppercase tracking-wider block mb-1">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={userData.phone}
                      onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                      className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-4 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#A8C3A0]/20 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#2F6B4F] hover:bg-[#23313A] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Saved Delivery Addresses (Philippine Cascading Selectors) */}
            {activeSection === 'addresses' && (
              <form onSubmit={handleAddressSubmit} className="space-y-5">
                <h2 className="font-serif font-bold text-xl text-[#23313A] pb-3 border-b border-[#A8C3A0]/20">
                  Saved Delivery Address
                </h2>

                <div className="space-y-4">
                  {/* Country: Locked to Philippines */}
                  <div>
                    <label className="text-[10px] font-bold text-[#23313A] uppercase tracking-wider block mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value="Philippines"
                      disabled
                      className="w-full bg-gray-100 border border-gray-200 text-gray-600 rounded-xl px-4 py-2.5 text-xs font-bold cursor-not-allowed"
                    />
                  </div>

                  {/* Region Selection */}
                  <div>
                    <label className="text-[10px] font-bold text-[#23313A] uppercase tracking-wider block mb-1">
                      Region
                    </label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2.5 text-xs font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F] cursor-pointer"
                    >
                      {Object.keys(PHILIPPINES_ADDRESS_DATA).map((reg) => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  {/* Province & City / Municipality Cascading Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-[#23313A] uppercase tracking-wider block mb-1">
                        Province / District
                      </label>
                      <select
                        value={selectedProvince}
                        onChange={(e) => handleProvinceChange(e.target.value)}
                        className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2.5 text-xs font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F] cursor-pointer"
                      >
                        {availableProvinces.map((prov) => (
                          <option key={prov} value={prov}>{prov}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#23313A] uppercase tracking-wider block mb-1">
                        City / Municipality
                      </label>
                      <select
                        value={selectedCity}
                        onChange={(e) => handleCityChange(e.target.value)}
                        className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2.5 text-xs font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F] cursor-pointer"
                      >
                        {availableCities.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Street Address & Postal Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-[#23313A] uppercase tracking-wider block mb-1">
                        House/Unit No., Street, Barangay
                      </label>
                      <input
                        type="text"
                        required
                        value={userData.street_address}
                        onChange={(e) => setUserData({ ...userData, street_address: e.target.value })}
                        className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-4 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#23313A] uppercase tracking-wider block mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        required
                        value={userData.postal_code}
                        onChange={(e) => setUserData({ ...userData, postal_code: e.target.value })}
                        className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-4 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#A8C3A0]/20 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#2F6B4F] hover:bg-[#23313A] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Address'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Notification Preferences */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h2 className="font-serif font-bold text-xl text-[#23313A] pb-3 border-b border-[#A8C3A0]/20">
                  Notification Preferences
                </h2>

                <div className="space-y-4">
                  <label 
                    onClick={() => handleToggleNotification('order_tracking_email')}
                    className="flex items-start gap-3.5 p-3.5 rounded-2xl hover:bg-[#F6F1E8]/50 border border-transparent hover:border-[#A8C3A0]/30 transition-all cursor-pointer group"
                  >
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      userData.notification_preferences?.order_tracking_email
                        ? 'bg-[#2F6B4F] text-white'
                        : 'border-2 border-[#A8C3A0]/60 bg-white'
                    }`}>
                      {userData.notification_preferences?.order_tracking_email && (
                        <Check size={14} className="stroke-[3]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#23313A] group-hover:text-[#2F6B4F] transition-colors">
                      Order and courier tracking email notifications
                    </span>
                  </label>

                  <label 
                    onClick={() => handleToggleNotification('telegram_drops')}
                    className="flex items-start gap-3.5 p-3.5 rounded-2xl hover:bg-[#F6F1E8]/50 border border-transparent hover:border-[#A8C3A0]/30 transition-all cursor-pointer group"
                  >
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      userData.notification_preferences?.telegram_drops
                        ? 'bg-[#2F6B4F] text-white'
                        : 'border-2 border-[#A8C3A0]/60 bg-white'
                    }`}>
                      {userData.notification_preferences?.telegram_drops && (
                        <Check size={14} className="stroke-[3]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#23313A] group-hover:text-[#2F6B4F] transition-colors">
                      New 90s vintage drop announcements via Telegram
                    </span>
                  </label>
                </div>

                {userData.notification_preferences?.telegram_drops && (
                  <div className="bg-[#F6F1E8]/60 p-4 rounded-2xl border border-[#A8C3A0]/30 flex items-center justify-between gap-3 text-xs">
                    <span className="text-[#23313A] font-bold">
                      ThriftLoop Archive Channel
                    </span>
                    <a
                      href="https://t.me/thriftloop_archive"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#2F6B4F] font-bold hover:underline"
                    >
                      <span>Join Channel</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
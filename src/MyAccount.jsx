import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, MapPin, Bell, LogOut, CheckCircle2, 
  Plus, Trash2, Package 
} from 'lucide-react';

export default function MyAccount() {
  const navigate = useNavigate();
  // Default to profile details now that order history lives exclusively on /orders
  const [activeSection, setActiveSection] = useState('profile');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('thriftloop_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [formData, setFormData] = useState({
    full_name: currentUser?.full_name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
  });

  const [addresses, setAddresses] = useState([
    {
      id: 1,
      label: 'Primary Delivery Address',
      recipient: currentUser?.full_name || 'Customer',
      phone: currentUser?.phone || '09XXXXXXXXX',
      street: currentUser?.street_address || 'Tierra Nevada',
      city: `${currentUser?.city || 'General Trias'}, ${currentUser?.province || 'Cavite'} ${currentUser?.postal_code || '4107'}`,
      isDefault: true
    }
  ]);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '',
    recipient: '',
    phone: '',
    street: '',
    city: ''
  });

  const handleLogout = () => {
    localStorage.removeItem('thriftloop_user');
    localStorage.removeItem('thriftloop_token');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updated = { ...currentUser, full_name: formData.full_name, phone: formData.phone };
    localStorage.setItem('thriftloop_user', JSON.stringify(updated));
    setCurrentUser(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!newAddress.street || !newAddress.city) return;

    const added = {
      id: Date.now(),
      label: newAddress.label || 'Alternate Address',
      recipient: newAddress.recipient || formData.full_name,
      phone: newAddress.phone || formData.phone,
      street: newAddress.street,
      city: newAddress.city,
      isDefault: false
    };

    setAddresses([...addresses, added]);
    setNewAddress({ label: '', recipient: '', phone: '', street: '', city: '' });
    setShowAddAddress(false);
  };

  const handleDeleteAddress = (id) => {
    setAddresses(addresses.filter(a => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16">
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#23313A]">My Account</h1>
            <p className="text-xs font-semibold text-[#A8C3A0] mt-1.5">
              Manage your personal profile, delivery addresses, and notifications.
            </p>
          </div>

          <Link
            to="/orders"
            className="inline-flex items-center gap-2 bg-white border border-[#A8C3A0]/40 text-[#2F6B4F] hover:bg-[#2F6B4F] hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Package size={15} />
            <span>Go to My Orders</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8 items-start">
          {/* Account Sidebar Navigation */}
          <aside className="bg-white border border-[#A8C3A0]/30 rounded-2xl p-4 h-fit space-y-1.5 text-xs font-bold shadow-xs">
            <button
              onClick={() => setActiveSection('profile')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                activeSection === 'profile' ? 'bg-[#2F6B4F] text-white shadow-xs' : 'hover:bg-[#F6F1E8] text-[#23313A]'
              }`}
            >
              <User size={16} /> Profile Details
            </button>

            <button
              onClick={() => setActiveSection('addresses')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                activeSection === 'addresses' ? 'bg-[#2F6B4F] text-white shadow-xs' : 'hover:bg-[#F6F1E8] text-[#23313A]'
              }`}
            >
              <MapPin size={16} /> Saved Addresses
            </button>

            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                activeSection === 'notifications' ? 'bg-[#2F6B4F] text-white shadow-xs' : 'hover:bg-[#F6F1E8] text-[#23313A]'
              }`}
            >
              <Bell size={16} /> Notifications
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-[#E67E5F] hover:bg-red-50/50 transition-colors pt-3 border-t border-[#A8C3A0]/20 cursor-pointer"
            >
              <LogOut size={16} /> Log Out
            </button>
          </aside>

          {/* Main Content Area */}
          <div className="md:col-span-3 bg-white border border-[#A8C3A0]/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs">
            
            {/* PROFILE DETAILS */}
            {activeSection === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-5 max-w-md">
                <h2 className="font-serif text-xl font-bold mb-4 text-[#23313A]">Profile Details</h2>

                {savedSuccess && (
                  <div className="bg-[#2F6B4F]/10 border border-[#2F6B4F]/30 text-[#2F6B4F] text-xs p-3 rounded-xl flex items-center gap-2 font-bold">
                    <CheckCircle2 size={16} />
                    <span>Profile information saved successfully.</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#23313A] mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl p-3 text-xs focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#23313A] mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full bg-[#F6F1E8] border border-[#A8C3A0]/20 rounded-xl p-3 text-xs text-[#A8C3A0] cursor-not-allowed font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#23313A] mb-1.5">Contact Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl p-3 text-xs focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-[#2F6B4F] hover:bg-[#23313A] text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </form>
            )}

            {/* SAVED ADDRESSES */}
            {activeSection === 'addresses' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="font-serif text-xl font-bold text-[#23313A]">Saved Shipping Addresses</h2>
                  {!showAddAddress && (
                    <button
                      onClick={() => setShowAddAddress(true)}
                      className="inline-flex items-center gap-1.5 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus size={14} /> Add Address
                    </button>
                  )}
                </div>

                {showAddAddress && (
                  <form onSubmit={handleAddAddress} className="p-5 border border-[#A8C3A0]/40 rounded-2xl bg-[#F6F1E8]/40 space-y-4 max-w-lg">
                    <h3 className="font-serif font-bold text-sm text-[#23313A]">New Delivery Address</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#A8C3A0] mb-1">Label</label>
                        <input
                          type="text"
                          placeholder="Work, Apartment, etc."
                          value={newAddress.label}
                          onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                          className="w-full bg-white border border-[#A8C3A0]/40 rounded-lg p-2 text-xs focus:outline-none focus:border-[#2F6B4F]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#A8C3A0] mb-1">Recipient Name</label>
                        <input
                          type="text"
                          placeholder={formData.full_name}
                          value={newAddress.recipient}
                          onChange={(e) => setNewAddress({ ...newAddress, recipient: e.target.value })}
                          className="w-full bg-white border border-[#A8C3A0]/40 rounded-lg p-2 text-xs focus:outline-none focus:border-[#2F6B4F]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#A8C3A0] mb-1">Street Address</label>
                      <input
                        type="text"
                        placeholder="House/Unit #, Street Name, Subdivision"
                        value={newAddress.street}
                        onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                        className="w-full bg-white border border-[#A8C3A0]/40 rounded-lg p-2 text-xs focus:outline-none focus:border-[#2F6B4F]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#A8C3A0] mb-1">City, Province & Postal Code</label>
                      <input
                        type="text"
                        placeholder="e.g., Dasmariñas, Cavite 4114"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="w-full bg-white border border-[#A8C3A0]/40 rounded-lg p-2 text-xs focus:outline-none focus:border-[#2F6B4F]"
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold py-2 px-5 rounded-lg transition-colors cursor-pointer"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(false)}
                        className="bg-white border border-[#A8C3A0]/40 text-[#23313A] text-xs font-bold py-2 px-4 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div 
                      key={addr.id} 
                      className="bg-white border border-[#A8C3A0]/30 rounded-xl p-4 text-xs space-y-1.5 shadow-xs relative group hover:border-[#2F6B4F]/50 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-[#23313A]">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="bg-[#2F6B4F]/10 text-[#2F6B4F] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[#23313A] font-semibold">{addr.recipient} • {addr.phone}</p>
                      <p className="text-[#A8C3A0] leading-relaxed font-medium">{addr.street}, {addr.city}</p>
                      
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-[#E67E5F] hover:text-red-700 text-[11px] font-bold pt-2 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div className="space-y-5 max-w-md">
                <h2 className="font-serif text-xl font-bold mb-4 text-[#23313A]">Notification Preferences</h2>
                <label className="flex items-center gap-3 text-xs font-semibold cursor-pointer text-[#23313A]">
                  <input type="checkbox" defaultChecked className="rounded accent-[#2F6B4F] w-4 h-4" />
                  Order and courier tracking email notifications
                </label>
                <label className="flex items-center gap-3 text-xs font-semibold cursor-pointer text-[#23313A]">
                  <input type="checkbox" defaultChecked className="rounded accent-[#2F6B4F] w-4 h-4" />
                  New 90s vintage drop announcements via Telegram
                </label>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
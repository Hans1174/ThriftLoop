import { API_URL } from './config';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, MapPin, Bell, LogOut, PackageCheck, 
  Eye, CheckCircle2, Plus, Trash2 
} from 'lucide-react';

export default function MyAccount() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('orders');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('thriftloop_user');
      return saved ? JSON.parse(saved) : { full_name: 'Hans Castro', email: 'hans@example.com', phone: '0917 123 4567' };
    } catch (e) {
      return { full_name: 'Hans Castro', email: 'hans@example.com', phone: '0917 123 4567' };
    }
  });

  const [formData, setFormData] = useState({
    full_name: currentUser.full_name || 'Hans Castro',
    email: currentUser.email || 'hans@example.com',
    phone: currentUser.phone || '0917 123 4567',
  });

  // Saved Shipping Addresses State
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      label: 'Home (Default)',
      recipient: currentUser.full_name || 'Hans Castro',
      phone: currentUser.phone || '0917 123 4567',
      street: 'House 42, Orchid Street, Barangay San Juan',
      city: 'General Trias, Cavite 4107',
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

  // Default orders matching catalogue history
  const [orders, setOrders] = useState([
    { id: '1043', date: 'Aug 25, 2026', status: 'In Transit', total: 1480 },
    { id: '1038', date: 'Aug 10, 2026', status: 'Delivered', total: 650 },
    { id: '1029', date: 'Jul 22, 2026', status: 'Delivered', total: 920 },
    { id: '1015', date: 'Jul 02, 2026', status: 'Cancelled', total: 400 },
  ]);

  // Fetch live orders if present in backend
  useEffect(() => {
    fetch(`${API_URL}/api/admin/orders`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const userOrders = data.map((o) => ({
            id: String(o.order_id),
            date: new Date(o.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: o.status === 'shipped' ? 'In Transit' : o.status === 'delivered' ? 'Delivered' : o.status === 'cancelled' ? 'Cancelled' : 'Pending',
            total: Number(o.total_amount),
          }));
          setOrders(userOrders);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('thriftloop_user');
    localStorage.removeItem('thriftloop_token');
    navigate('/login');
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
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#23313A]">My Account</h1>
          <p className="text-xs font-semibold text-[#A8C3A0] mt-1.5">
            Manage your personal styling profile, delivery addresses, and purchases.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Account Sidebar Navigation */}
          <aside className="bg-white border border-[#A8C3A0]/30 rounded-2xl p-4 h-fit space-y-1.5 text-xs font-bold shadow-sm">
            <button
              onClick={() => setActiveSection('orders')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-colors ${
                activeSection === 'orders' ? 'bg-[#2F6B4F] text-white shadow-sm' : 'hover:bg-[#F6F1E8] text-[#23313A]'
              }`}
            >
              <PackageCheck size={16} /> Order History
            </button>

            <button
              onClick={() => setActiveSection('profile')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-colors ${
                activeSection === 'profile' ? 'bg-[#2F6B4F] text-white shadow-sm' : 'hover:bg-[#F6F1E8] text-[#23313A]'
              }`}
            >
              <User size={16} /> Profile Details
            </button>

            <button
              onClick={() => setActiveSection('addresses')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-colors ${
                activeSection === 'addresses' ? 'bg-[#2F6B4F] text-white shadow-sm' : 'hover:bg-[#F6F1E8] text-[#23313A]'
              }`}
            >
              <MapPin size={16} /> Saved Addresses
            </button>

            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-colors ${
                activeSection === 'notifications' ? 'bg-[#2F6B4F] text-white shadow-sm' : 'hover:bg-[#F6F1E8] text-[#23313A]'
              }`}
            >
              <Bell size={16} /> Notifications
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-[#E67E5F] hover:bg-red-50/50 transition-colors pt-3 border-t border-[#A8C3A0]/20"
            >
              <LogOut size={16} /> Log Out
            </button>
          </aside>

          {/* Main Account Content Panel */}
          <div className="md:col-span-3 bg-white border border-[#A8C3A0]/30 rounded-2xl p-6 sm:p-8 shadow-sm">
            
            {/* 1. ORDER HISTORY */}
            {activeSection === 'orders' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-serif text-xl font-bold text-[#23313A]">Order History</h2>
                  <Link 
                    to="/orders" 
                    className="text-xs font-bold text-[#2F6B4F] hover:underline"
                  >
                    Open Live Transit Map →
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#A8C3A0]/30 text-[#A8C3A0] uppercase font-bold text-[10px] tracking-wider">
                        <th className="pb-3">Order ID</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Total</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#A8C3A0]/20">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-[#F6F1E8]/50 transition-colors">
                          <td className="py-4 font-mono font-bold text-[#23313A]">#{o.id}</td>
                          <td className="py-4 text-[#23313A]/70 font-medium">{o.date}</td>
                          <td className="py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                o.status === 'In Transit'
                                  ? 'bg-[#E67E5F]/15 text-[#E67E5F]'
                                  : o.status === 'Delivered'
                                  ? 'bg-[#2F6B4F]/10 text-[#2F6B4F]'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-4 font-bold text-[#2F6B4F]">₱{Number(o.total).toFixed(2)}</td>
                          <td className="py-4 text-right">
                            <Link
                              to={`/track/${o.id}`}
                              className="inline-flex items-center gap-1 bg-[#F6F1E8] border border-[#A8C3A0]/30 px-3 py-1.5 rounded-lg text-xs font-bold text-[#23313A] hover:bg-[#A8C3A0]/20 transition-colors"
                            >
                              <Eye size={13} /> View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. PROFILE DETAILS */}
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
                  className="bg-[#2F6B4F] hover:bg-[#23313A] text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors shadow-sm"
                >
                  Save Profile Changes
                </button>
              </form>
            )}

            {/* 3. SAVED ADDRESSES */}
            {activeSection === 'addresses' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="font-serif text-xl font-bold text-[#23313A]">Saved Shipping Addresses</h2>
                  {!showAddAddress && (
                    <button
                      onClick={() => setShowAddAddress(true)}
                      className="inline-flex items-center gap-1.5 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors shadow-sm"
                    >
                      <Plus size={14} /> Add Address
                    </button>
                  )}
                </div>

                {/* Inline Add Address Form */}
                {showAddAddress && (
                  <form onSubmit={handleAddAddress} className="p-5 border border-[#A8C3A0]/40 rounded-2xl bg-[#F6F1E8]/40 space-y-4 max-w-lg">
                    <h3 className="font-serif font-bold text-sm text-[#23313A]">New Delivery Address</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#A8C3A0] mb-1">Label (e.g., Office)</label>
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
                        className="bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold py-2 px-5 rounded-lg transition-colors"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(false)}
                        className="bg-white border border-[#A8C3A0]/40 text-[#23313A] text-xs font-bold py-2 px-4 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Addresses List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div 
                      key={addr.id} 
                      className="bg-white border border-[#A8C3A0]/30 rounded-xl p-4 text-xs space-y-1.5 shadow-sm relative group hover:border-[#2F6B4F]/50 transition-colors"
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
                          className="text-[#E67E5F] hover:text-red-700 text-[11px] font-bold pt-2 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div className="space-y-5 max-w-md">
                <h2 className="font-serif text-xl font-bold mb-4 text-[#23313A]">Notification Preferences</h2>
                <label className="flex items-center gap-3 text-xs font-semibold cursor-pointer text-[#23313A]">
                  <input type="checkbox" defaultChecked className="rounded accent-[#2F6B4F] w-4 h-4" />
                  Order and shipping SMS alerts via Courier Provider
                </label>
                <label className="flex items-center gap-3 text-xs font-semibold cursor-pointer text-[#23313A]">
                  <input type="checkbox" defaultChecked className="rounded accent-[#2F6B4F] w-4 h-4" />
                  New 90s vintage drop announcements
                </label>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
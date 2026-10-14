import { API_URL } from './config';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, ShieldCheck, Truck, 
  MapPin, CreditCard, Sparkles, Loader2, AlertCircle, 
  Tag, X, Check, Info, ChevronDown, ShoppingBag 
} from 'lucide-react';
import { useCart } from './context/CartContext';
import { PHILIPPINES_ADDRESS_DATA } from './data/philippinesAddress';

const BACKEND_URL = API_URL || import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function Checkout() {
  const navigate = useNavigate();
  const cartContext = useCart ? useCart() : {};
  const cartItems = cartContext.cartItems || cartContext.cart || [];
  const clearCart = cartContext.clearCart || (() => {});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Voucher State
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  // Cascading Address State
  const [selectedRegion, setSelectedRegion] = useState('Region IV-A (CALABARZON)');
  const [selectedProvince, setSelectedProvince] = useState('Cavite');
  const [selectedCity, setSelectedCity] = useState('Dasmariñas City');

  // Load authenticated user
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('thriftloop_user')) || {};
    } catch {
      return {};
    }
  });

  const [formData, setFormData] = useState({
    customer_name: (currentUser.full_name || '').slice(0, 60),
    email: currentUser.email || '',
    phone: String(currentUser.phone || '').replace(/\D/g, '').slice(0, 11),
    shipping_address: (currentUser.street_address || '').slice(0, 150),
    city: currentUser.city || 'Dasmariñas City',
    province: currentUser.province || 'Cavite',
    postal_code: String(currentUser.postal_code || '4114').replace(/\D/g, '').slice(0, 4),
    courier: 'J&T Express',
    payment_method: 'paymongo',
  });

  // Guard: Redirect unauthenticated visitors
  useEffect(() => {
    const token = localStorage.getItem('thriftloop_token');
    if (!token) {
      window.dispatchEvent(new Event('open-login-modal'));
      navigate('/cart');
    }
  }, [navigate]);

  // Load and autofill profile data from server
  useEffect(() => {
    const userId = currentUser.user_id || currentUser.id;
    if (!userId) return;

    fetch(`${BACKEND_URL}/api/users/${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((profile) => {
        if (!profile) return;
        setFormData((prev) => ({
          ...prev,
          customer_name: (profile.full_name || prev.customer_name).slice(0, 60),
          email: profile.email || prev.email,
          phone: String(profile.phone || prev.phone).replace(/\D/g, '').slice(0, 11),
          shipping_address: (profile.street_address || prev.shipping_address).slice(0, 150),
          postal_code: String(profile.postal_code || prev.postal_code).replace(/\D/g, '').slice(0, 4),
        }));

        if (profile.province) {
          for (const [reg, provObj] of Object.entries(PHILIPPINES_ADDRESS_DATA)) {
            if (Object.keys(provObj).includes(profile.province)) {
              setSelectedRegion(reg);
              setSelectedProvince(profile.province);
              const validCities = provObj[profile.province] || [];
              const matchedCity = validCities.find(
                (c) => c.toLowerCase() === (profile.city || '').toLowerCase()
              ) || validCities[0] || '';
              setSelectedCity(matchedCity);
              setFormData((prev) => ({
                ...prev,
                province: profile.province,
                city: matchedCity,
              }));
              break;
            }
          }
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Automatic Inventory Release for Cancelled PayMongo Sessions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isCancelled = params.get('cancelled');
    const cancelledOrderId = params.get('order_id');

    if (isCancelled && cancelledOrderId) {
      setInfoMessage('Previous checkout was cancelled. Releasing order hold...');
      
      fetch(`${BACKEND_URL}/api/orders/${cancelledOrderId}/cancel`, {
        method: 'POST',
      })
        .then((res) => res.json())
        .then(() => {
          setInfoMessage('Payment cancelled. Your items remain in your bag.');
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          console.error('Failed to cancel order session:', err);
        });
    }
  }, []);

  // Admin Account Checkout Barrier
  if (currentUser?.role === 'admin' || currentUser?.email === 'admin@thriftloop.com') {
    return (
      <div className="min-h-[75vh] bg-[#F6F1E8] flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="w-16 h-16 rounded-3xl bg-[#E67E5F]/15 text-[#E67E5F] flex items-center justify-center mb-4 border border-[#E67E5F]/30">
          <ShieldCheck size={32} />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#23313A] mb-2">
          Admin Checkout Prohibited
        </h2>
        <p className="text-xs text-[#23313A]/70 max-w-md mb-6 leading-relaxed font-medium">
          You are currently logged in with an Administrator profile ({currentUser.email}). Admins are restricted from placing customer orders.
        </p>
        <div className="flex gap-3">
          <Link 
            to="/admin" 
            className="bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-xs"
          >
            Return to Admin Console
          </Link>
        </div>
      </div>
    );
  }

  // Address Dropdown Handlers
  const availableProvinces = Object.keys(PHILIPPINES_ADDRESS_DATA[selectedRegion] || {});
  const availableCities = PHILIPPINES_ADDRESS_DATA[selectedRegion]?.[selectedProvince] || [];

  const handleRegionChange = (newRegion) => {
    setSelectedRegion(newRegion);
    const provinces = Object.keys(PHILIPPINES_ADDRESS_DATA[newRegion] || {});
    const firstProvince = provinces[0] || '';
    setSelectedProvince(firstProvince);

    const cities = PHILIPPINES_ADDRESS_DATA[newRegion]?.[firstProvince] || [];
    const firstCity = cities[0] || '';
    setSelectedCity(firstCity);

    setFormData((prev) => ({
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

    setFormData((prev) => ({
      ...prev,
      province: newProvince,
      city: firstCity,
    }));
  };

  const handleCityChange = (newCity) => {
    setSelectedCity(newCity);
    setFormData((prev) => ({
      ...prev,
      city: newCity,
    }));
  };

  // Sanitized Change Handler for Numeric & Text Inputs
  const handlePhoneChange = (e) => {
    const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setFormData((prev) => ({ ...prev, phone: numericOnly }));
  };

  const handlePostalChange = (e) => {
    const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFormData((prev) => ({ ...prev, postal_code: numericOnly }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Pricing & Calculations
  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * (item.quantity || 1), 
    0
  );

  const baseShipping = formData.courier === 'Lalamove' ? 200 : 80;
  const shippingFee = (formData.courier === 'J&T Express' && subtotal >= 1500) ? 0 : baseShipping;
  const discountAmount = appliedVoucher ? parseFloat(appliedVoucher.discountAmount || 0) : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount) + shippingFee;

  const handleApplyVoucher = async (e) => {
    if (e) e.preventDefault();
    if (!voucherInput.trim()) return;

    setVoucherLoading(true);
    setVoucherError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherInput.trim(),
          subtotal: subtotal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired voucher code.');

      setAppliedVoucher(data);
      setVoucherInput('');
    } catch (err) {
      setVoucherError(err.message || 'Failed to apply voucher.');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMessage('');

    // Strict Philippine Mobile Number & Postal Validation
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
      setError('Please enter a valid 11-digit Philippine mobile number starting with 09 (e.g. 09XXXXXXXXX).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const cleanPostal = formData.postal_code.replace(/\D/g, '');
    if (cleanPostal.length !== 4) {
      setError('Please enter a valid 4-digit Philippine postal code (e.g. 4114).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (
      !formData.customer_name?.trim() || 
      !formData.email?.trim() || 
      !formData.shipping_address?.trim() || 
      !selectedCity || 
      !selectedProvince
    ) {
      setError('Please complete all recipient details and delivery address fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (cartItems.length === 0) {
      setError('Your shopping bag is empty.');
      return;
    }

    setLoading(true);
    const referenceNumber = `TL-${Date.now().toString().slice(-6)}`;

    try {
      if (formData.payment_method === 'paymongo') {
        const res = await fetch(`${BACKEND_URL}/api/checkout/paymongo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems,
            cart_items: cartItems,
            customer: {
              fullName: formData.customer_name.trim().slice(0, 60),
              email: formData.email.trim(),
              phone: cleanPhone,
            },
            deliveryAddress: {
              streetAddress: formData.shipping_address.trim().slice(0, 150),
              city: selectedCity,
              province: selectedProvince,
              postalCode: cleanPostal,
            },
            shipping_address: formData.shipping_address.trim().slice(0, 150),
            city: selectedCity,
            province: selectedProvince,
            postal_code: cleanPostal,
            courier: formData.courier,
            referenceNumber,
            voucherCode: appliedVoucher ? appliedVoucher.code : null,
            discountAmount,
            origin_url: window.location.origin, // Dynamically redirects back to production Vercel
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to initialize PayMongo checkout.');

        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          throw new Error('Payment gateway did not return a checkout URL.');
        }
      } else {
        const res = await fetch(`${BACKEND_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            customer_name: formData.customer_name.trim().slice(0, 60),
            email: formData.email.trim(),
            phone: cleanPhone,
            shipping_address: formData.shipping_address.trim().slice(0, 150),
            city: selectedCity,
            province: selectedProvince,
            postal_code: cleanPostal,
            user_id: currentUser.user_id || currentUser.id || null,
            total_amount: grandTotal,
            shipping_fee: shippingFee,
            discount_amount: discountAmount,
            voucher_code: appliedVoucher ? appliedVoucher.code : null,
            reference_number: referenceNumber,
            cart_items: cartItems,
            items: cartItems,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to place COD order.');

        clearCart();

        navigate('/confirmation', {
          state: {
            orderId: data.orderId || referenceNumber,
            total: grandTotal,
            paymentMethod: 'Cash on Delivery (COD)',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            items: cartItems,
            courier: formData.courier,
            voucherCode: appliedVoucher?.code || null,
            discountAmount,
          },
        });
      }
    } catch (err) {
      setError(err.message || 'An error occurred during checkout.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#F6F1E8] flex flex-col items-center justify-center p-6 text-center font-mono">
        <h2 className="font-serif text-2xl font-bold text-[#23313A] mb-2">Your bag is empty</h2>
        <Link 
          to="/shop" 
          className="bg-[#2F6B4F] text-white text-xs font-bold px-6 py-3 rounded-xl hover:bg-[#23313A] transition-colors shadow-xs"
        >
          Return to Boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16 py-4 sm:py-8 px-3 sm:px-6">
      <main className="max-w-6xl mx-auto">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-4 sm:mb-8 pb-3 border-b border-[#A8C3A0]/20 font-mono">
          <Link 
            to="/cart" 
            className="flex items-center gap-1.5 text-xs font-bold text-[#23313A]/70 hover:text-[#2F6B4F] transition-colors group cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Return to Shopping Bag</span>
            <span className="sm:hidden">Back to Bag</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 sm:gap-4 text-[11px] font-bold uppercase tracking-wider font-mono">
            <Link to="/cart" className="text-[#A8C3A0] hover:text-[#23313A]">1. Bag</Link>
            <span className="text-[#A8C3A0]">•</span>
            <span className="text-[#2F6B4F] underline underline-offset-4">2. Shipping & Payment</span>
            <span className="text-[#A8C3A0]">•</span>
            <span className="text-[#A8C3A0]">3. Confirmation</span>
          </div>

          <span className="sm:hidden text-[10px] bg-[#2F6B4F]/10 text-[#2F6B4F] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
            Step 2 of 3
          </span>
        </div>

        {/* Mobile Accordion Summary */}
        <div className="lg:hidden mb-5 bg-white border border-[#A8C3A0]/30 rounded-2xl p-4 shadow-xs font-mono">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-[#23313A] cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-[#2F6B4F]" />
              <span>{mobileSummaryOpen ? 'Hide order summary' : 'Show order summary'}</span>
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-200 text-[#A8C3A0] ${mobileSummaryOpen ? 'rotate-180' : ''}`} 
              />
            </span>
            <span className="text-sm font-bold text-[#2F6B4F]">₱{grandTotal.toFixed(2)}</span>
          </button>

          {mobileSummaryOpen && (
            <div className="pt-3 mt-3 border-t border-[#A8C3A0]/20 space-y-3 animate-in fade-in">
              <div className="divide-y divide-[#A8C3A0]/15 max-h-56 overflow-y-auto pr-1">
                {cartItems.map((item, idx) => (
                  <div key={item.product_id || item.id || idx} className="py-2.5 flex items-center gap-3">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-11 h-11 rounded-lg object-cover border border-[#A8C3A0]/30 shrink-0 bg-[#F6F1E8]"
                      />
                    )}
                    <div className="flex-1 min-w-0 font-sans">
                      <p className="font-bold text-xs text-[#23313A] truncate">{item.name}</p>
                      <p className="text-[10px] text-[#A8C3A0] font-mono">Size {item.size || 'OS'} • 1-of-1</p>
                    </div>
                    <span className="text-xs font-bold text-[#2F6B4F] shrink-0 font-mono">
                      ₱{Number(item.price || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-xs text-[#23313A]/70 pt-2 border-t border-[#A8C3A0]/15">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#23313A]">₱{subtotal.toFixed(2)}</span>
                </div>
                {appliedVoucher && (
                  <div className="flex justify-between text-[#2F6B4F] font-semibold">
                    <span>Voucher ({appliedVoucher.code})</span>
                    <span>-₱{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping ({formData.courier})</span>
                  <span className="font-bold text-[#23313A]">
                    {shippingFee === 0 ? 'FREE' : `₱${shippingFee.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {infoMessage && (
          <div className="bg-[#2F6B4F]/10 border border-[#2F6B4F]/30 text-[#2F6B4F] text-xs p-3.5 sm:p-4 rounded-2xl flex items-center gap-2 mb-4 sm:mb-6 font-bold animate-in fade-in font-mono">
            <Info size={16} className="shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-[#E67E5F]/10 border border-[#E67E5F]/30 text-[#E67E5F] text-xs p-3.5 sm:p-4 rounded-2xl flex items-center gap-2 mb-4 sm:mb-6 font-bold animate-in fade-in font-mono">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Checkout Form */}
        <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start font-mono">
          
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            
            {/* Recipient Information */}
            <div className="bg-white border border-[#A8C3A0]/30 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-4">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#23313A] flex items-center gap-2 pb-3 border-b border-[#A8C3A0]/20">
                <MapPin size={18} className="text-[#2F6B4F]" />
                <span>Recipient Details</span>
              </h2>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Recipient Full Name
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    maxLength={60}
                    value={formData.customer_name}
                    onChange={handleChange}
                    autoComplete="name"
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 sm:py-2 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs text-xs font-sans font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      inputMode="email"
                      autoComplete="email"
                      value={formData.email}
                      disabled
                      className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-xl px-3.5 py-2.5 sm:py-2 text-xs cursor-not-allowed font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      Mobile Phone (11 Digits)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      maxLength={11}
                      inputMode="numeric"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="09XXXXXXXXX"
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 sm:py-2 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white border border-[#A8C3A0]/30 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-4">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#23313A] flex items-center gap-2 pb-3 border-b border-[#A8C3A0]/20">
                <Truck size={18} className="text-[#2F6B4F]" />
                <span>Delivery Address</span>
              </h2>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Country
                  </label>
                  <input
                    type="text"
                    value="Philippines"
                    disabled
                    className="w-full bg-gray-100 border border-gray-200 text-gray-600 rounded-xl px-3.5 py-2 text-xs font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Region
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F] cursor-pointer"
                  >
                    {Object.keys(PHILIPPINES_ADDRESS_DATA).map((reg) => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      Province / District
                    </label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F] cursor-pointer"
                    >
                      {availableProvinces.map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      City / Municipality
                    </label>
                    <select
                      value={selectedCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F] cursor-pointer"
                    >
                      {availableCities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      House/Unit No., Street, Barangay
                    </label>
                    <input
                      type="text"
                      name="shipping_address"
                      maxLength={120}
                      value={formData.shipping_address}
                      onChange={handleChange}
                      autoComplete="street-address"
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 sm:py-2 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      Postal Code (4 Digits)
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      maxLength={4}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={formData.postal_code}
                      onChange={handlePostalChange}
                      placeholder="4114"
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 sm:py-2 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Courier & Payment Method */}
            <div className="bg-white border border-[#A8C3A0]/30 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-5 sm:space-y-6">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#23313A] flex items-center gap-2 pb-3 border-b border-[#A8C3A0]/20 mb-3">
                  <Truck size={18} className="text-[#2F6B4F]" />
                  <span>Courier Provider</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all active:scale-[0.99] min-h-[58px] ${
                      formData.courier === 'J&T Express'
                        ? 'border-[#2F6B4F] bg-[#F6F1E8]/50 shadow-xs'
                        : 'border-[#A8C3A0]/30 hover:border-[#A8C3A0]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      value="J&T Express"
                      checked={formData.courier === 'J&T Express'}
                      onChange={handleChange}
                      className="mt-1 text-[#2F6B4F] focus:ring-[#2F6B4F]"
                    />
                    <div>
                      <span className="font-bold text-[#23313A] block">J&T Express (Standard)</span>
                      <span className="text-[11px] text-[#A8C3A0] block mt-0.5">
                        {subtotal >= 1500 ? 'FREE Express Delivery' : '₱80.00 (2-4 Days)'}
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all active:scale-[0.99] min-h-[58px] ${
                      formData.courier === 'Lalamove'
                        ? 'border-[#2F6B4F] bg-[#F6F1E8]/50 shadow-xs'
                        : 'border-[#A8C3A0]/30 hover:border-[#A8C3A0]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="courier"
                      value="Lalamove"
                      checked={formData.courier === 'Lalamove'}
                      onChange={handleChange}
                      className="mt-1 text-[#2F6B4F] focus:ring-[#2F6B4F]"
                    />
                    <div>
                      <span className="font-bold text-[#23313A] block">Lalamove Same-Day</span>
                      <span className="text-[11px] text-[#A8C3A0] block mt-0.5">₱200.00 (Metro Express)</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#23313A] flex items-center gap-2 pb-3 border-b border-[#A8C3A0]/20 mb-3">
                  <CreditCard size={18} className="text-[#2F6B4F]" />
                  <span>Payment Method</span>
                </h2>

                <div className="space-y-2.5 sm:space-y-3 text-xs">
                  <label
                    className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all active:scale-[0.99] ${
                      formData.payment_method === 'paymongo'
                        ? 'border-[#2F6B4F] bg-[#F6F1E8]/50 shadow-xs'
                        : 'border-[#A8C3A0]/30 hover:border-[#A8C3A0]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="paymongo"
                      checked={formData.payment_method === 'paymongo'}
                      onChange={handleChange}
                      className="mt-1 text-[#2F6B4F] focus:ring-[#2F6B4F]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#23313A]">PayMongo Online Payment</span>
                        <span className="bg-[#2F6B4F] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Instant
                        </span>
                      </div>
                      <span className="text-[11px] text-[#A8C3A0] block mt-0.5 font-medium">
                        GCash, Maya, GrabPay, Visa, and Mastercard Credit/Debit
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all active:scale-[0.99] ${
                      formData.payment_method === 'cod'
                        ? 'border-[#2F6B4F] bg-[#F6F1E8]/50 shadow-xs'
                        : 'border-[#A8C3A0]/30 hover:border-[#A8C3A0]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={formData.payment_method === 'cod'}
                      onChange={handleChange}
                      className="mt-1 text-[#2F6B4F] focus:ring-[#2F6B4F]"
                    />
                    <div>
                      <span className="font-bold text-[#23313A] block">Cash on Delivery (COD)</span>
                      <span className="text-[11px] text-[#A8C3A0] block mt-0.5 font-medium">
                        Pay in cash directly upon parcel arrival.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#A8C3A0]/30 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs lg:sticky lg:top-24 space-y-4">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#23313A] pb-2 border-b border-[#A8C3A0]/20 flex items-center justify-between">
                <span>Summary</span>
                <span className="text-xs font-mono text-[#A8C3A0] font-bold">
                  {cartItems.length} {cartItems.length === 1 ? 'Piece' : 'Pieces'}
                </span>
              </h2>

              <div className="hidden lg:block max-h-56 overflow-y-auto divide-y divide-[#A8C3A0]/15 pr-1">
                {cartItems.map((item, idx) => (
                  <div key={item.product_id || item.id || idx} className="py-2.5 flex items-center gap-3">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-[#A8C3A0]/30 shrink-0 bg-[#F6F1E8]"
                      />
                    )}
                    <div className="flex-1 min-w-0 font-sans">
                      <p className="font-bold text-xs text-[#23313A] truncate">{item.name}</p>
                      <p className="text-[10px] text-[#A8C3A0] font-mono">
                        Size {item.size || 'OS'} • 1-of-1 Piece
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#2F6B4F] shrink-0 font-mono">
                      ₱{Number(item.price || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo / Voucher Code Section */}
              <div className="border-t border-[#A8C3A0]/20 pt-3">
                <label className="block text-[10px] font-bold text-[#23313A] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag size={12} className="text-[#2F6B4F]" />
                  <span>Promo / Voucher Code</span>
                </label>
                
                {appliedVoucher ? (
                  <div className="flex items-center justify-between bg-[#2F6B4F]/10 border border-[#2F6B4F]/30 rounded-xl px-3.5 py-2.5 text-xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-[#2F6B4F]" />
                      <div>
                        <span className="font-bold text-[#2F6B4F]">{appliedVoucher.code}</span>
                        <span className="text-[11px] text-[#2F6B4F]/80 ml-1.5 font-semibold">
                          (-₱{parseFloat(appliedVoucher.discountAmount).toFixed(2)})
                        </span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleRemoveVoucher}
                      className="text-[#E67E5F] hover:text-[#23313A] p-1.5 rounded-md transition-colors cursor-pointer"
                      title="Remove voucher"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={20}
                        value={voucherInput}
                        onChange={(e) => {
                          setVoucherInput(e.target.value.toUpperCase());
                          if (voucherError) setVoucherError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyVoucher(e);
                          }
                        }}
                        className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs uppercase font-bold focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={voucherLoading || !voucherInput.trim()}
                        className="bg-[#2F6B4F] hover:bg-[#23313A] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {voucherLoading ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {voucherError && (
                      <p className="text-[11px] text-[#E67E5F] font-semibold animate-in fade-in">
                        {voucherError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs border-t border-[#A8C3A0]/20 pt-3 text-[#23313A]/70">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#23313A]">₱{subtotal.toFixed(2)}</span>
                </div>

                {appliedVoucher && (
                  <div className="flex justify-between text-[#2F6B4F] font-semibold animate-in fade-in">
                    <span className="flex items-center gap-1">
                      <Tag size={12} /> Voucher ({appliedVoucher.code})
                    </span>
                    <span>-₱{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Shipping ({formData.courier})</span>
                  <span className="font-bold text-[#23313A]">
                    {shippingFee === 0 ? 'FREE' : `₱${shippingFee.toFixed(2)}`}
                  </span>
                </div>

                {shippingFee === 0 && (
                  <p className="text-[10px] text-[#2F6B4F] font-semibold flex items-center gap-1">
                    <Sparkles size={11} /> Qualified for Free Express Shipping over ₱1,500
                  </p>
                )}

                <div className="border-t border-[#A8C3A0]/30 pt-3 flex justify-between text-base font-bold text-[#23313A]">
                  <span>Total Due</span>
                  <span className="text-[#2F6B4F] text-lg font-bold font-serif">₱{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-50 text-white font-bold py-3.5 sm:py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-4 cursor-pointer active:scale-95 text-xs sm:text-sm min-h-[46px]"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {formData.payment_method === 'paymongo'
                        ? 'Proceed to PayMongo Payment'
                        : 'Place Cash on Delivery Order'}
                    </span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </main>
    </div>
  );
}
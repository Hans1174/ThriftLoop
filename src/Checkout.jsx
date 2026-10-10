import { API_URL } from './config';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, ShieldCheck, Truck, 
  MapPin, CreditCard, Sparkles, Loader2, AlertCircle, 
  Tag, X, Check, Info 
} from 'lucide-react';
import { useCart } from './context/CartContext';

// Safe environment fallback
const BACKEND_URL = API_URL || import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function Checkout() {
  const navigate = useNavigate();
  const cartContext = useCart ? useCart() : {};
  const cartItems = cartContext.cartItems || cartContext.cart || [];
  const clearCart = cartContext.clearCart || (() => {});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Voucher State
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  // 1. Load authenticated user & pre-filled address
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('thriftloop_user')) || {};
    } catch {
      return {};
    }
  });

  // Guard: Redirect unauthenticated visitors
  useEffect(() => {
    const token = localStorage.getItem('thriftloop_token');
    if (!token) {
      window.dispatchEvent(new Event('open-login-modal'));
      navigate('/cart');
    }
  }, [navigate]);

  // Automated Inventory Release on Cancelled Sessions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isCancelled = params.get('cancelled');
    const cancelledOrderId = params.get('order_id');

    if (isCancelled && cancelledOrderId) {
      setInfoMessage('Previous checkout was cancelled. Unlocking your pieces...');
      
      fetch(`${BACKEND_URL}/api/orders/${cancelledOrderId}/cancel`, {
        method: 'POST',
      })
        .then((res) => res.json())
        .then(() => {
          setInfoMessage('Payment cancelled. Your items have been released back to your bag and you may proceed.');
          // Remove cancelled query parameters from URL cleanly
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          console.error('Failed to auto-release stock:', err);
        });
    }
  }, []);

  const [formData, setFormData] = useState({
    customer_name: currentUser.full_name || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    shipping_address: currentUser.street_address || '',
    city: currentUser.city || '',
    province: currentUser.province || '',
    postal_code: currentUser.postal_code || '',
    courier: 'J&T Express',
    payment_method: 'paymongo', // 'paymongo' | 'cod'
  });

  // 2. Pricing, Voucher & Dynamic Shipping Calculation
  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * (item.quantity || 1), 
    0
  );

  const baseShipping = formData.courier === 'Lalamove' ? 200 : 80;
  const shippingFee = (formData.courier === 'J&T Express' && subtotal >= 1500) ? 0 : baseShipping;
  const discountAmount = appliedVoucher ? parseFloat(appliedVoucher.discountAmount || 0) : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount) + shippingFee;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Voucher Validation Handler
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

    // Check required fields manually so browser doesn't silently block
    if (
      !formData.customer_name?.trim() || 
      !formData.email?.trim() || 
      !formData.shipping_address?.trim() || 
      !formData.city?.trim() || 
      !formData.province?.trim() || 
      !formData.postal_code?.trim()
    ) {
      setError('Please fill in all recipient contact and address details.');
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
        // --- Flow A: PayMongo Hosted Checkout ---
        const res = await fetch(`${BACKEND_URL}/api/checkout/paymongo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems,
            customer: {
              fullName: formData.customer_name,
              email: formData.email,
              phone: formData.phone,
            },
            deliveryAddress: {
              streetAddress: formData.shipping_address,
              city: formData.city,
              province: formData.province,
              postalCode: formData.postal_code,
            },
            courier: formData.courier,
            referenceNumber,
            voucherCode: appliedVoucher ? appliedVoucher.code : null,
            discountAmount,
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
        // --- Flow B: Cash on Delivery (COD) ---
        const res = await fetch(`${BACKEND_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            user_id: currentUser.user_id || null,
            total_amount: grandTotal,
            shipping_fee: shippingFee,
            discount_amount: discountAmount,
            voucher_code: appliedVoucher ? appliedVoucher.code : null,
            reference_number: referenceNumber,
            cart_items: cartItems,
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
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#F6F1E8] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-serif text-2xl font-bold text-[#23313A] mb-2">Your bag is empty</h2>
        <p className="text-xs text-[#A8C3A0] mb-5 font-semibold">
          Select rare 1-of-1 archive garments before checking out.
        </p>
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
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16 py-8 px-4 sm:px-6">
      <main className="max-w-6xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#A8C3A0]/20">
          <Link 
            to="/cart" 
            className="flex items-center gap-1.5 text-xs font-bold text-[#23313A]/70 hover:text-[#2F6B4F] transition-colors group cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Return to Shopping Bag</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 text-[11px] font-bold uppercase tracking-wider">
            <Link to="/cart" className="text-[#A8C3A0] hover:text-[#23313A]">1. Bag</Link>
            <span className="text-[#A8C3A0]">•</span>
            <span className="text-[#2F6B4F] underline underline-offset-4">2. Shipping & Payment</span>
            <span className="text-[#A8C3A0]">•</span>
            <span className="text-[#A8C3A0]">3. Confirmation</span>
          </div>
        </div>

        {infoMessage && (
          <div className="bg-[#2F6B4F]/10 border border-[#2F6B4F]/30 text-[#2F6B4F] text-xs p-4 rounded-2xl flex items-center gap-2 mb-6 font-bold animate-in fade-in">
            <Info size={16} className="shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-[#E67E5F]/10 border border-[#E67E5F]/30 text-[#E67E5F] text-xs p-4 rounded-2xl flex items-center gap-2 mb-6 font-bold animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="font-serif text-xl font-bold text-[#23313A] flex items-center gap-2 pb-3 border-b border-[#A8C3A0]/20">
                <MapPin size={18} className="text-[#2F6B4F]" />
                <span>Shipping Address</span>
              </h2>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Recipient Full Name
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      Mobile Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    House/Unit No., Street, Barangay
                  </label>
                  <input
                    type="text"
                    name="shipping_address"
                    value={formData.shipping_address}
                    onChange={handleChange}
                    placeholder="e.g. Block 4 Lot 12, Vintage Street, Brgy. San Jose"
                    className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      City / Municipality
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      Province
                    </label>
                    <input
                      type="text"
                      name="province"
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
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      className="w-full bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] focus:bg-white text-[#23313A] transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Courier & Payment Option */}
            <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#23313A] flex items-center gap-2 pb-3 border-b border-[#A8C3A0]/20 mb-3">
                  <Truck size={18} className="text-[#2F6B4F]" />
                  <span>Courier Provider</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      formData.courier === 'J&T Express'
                        ? 'border-[#2F6B4F] bg-[#F6F1E8]/40 shadow-xs'
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
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      formData.courier === 'Lalamove'
                        ? 'border-[#2F6B4F] bg-[#F6F1E8]/40 shadow-xs'
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
                <h2 className="font-serif text-xl font-bold text-[#23313A] flex items-center gap-2 pb-3 border-b border-[#A8C3A0]/20 mb-3">
                  <CreditCard size={18} className="text-[#2F6B4F]" />
                  <span>Payment Method</span>
                </h2>

                <div className="space-y-3 text-xs">
                  <label
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                      formData.payment_method === 'paymongo'
                        ? 'border-[#2F6B4F] bg-[#F6F1E8]/40 shadow-xs'
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
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                      formData.payment_method === 'cod'
                        ? 'border-[#2F6B4F] bg-[#F6F1E8]/40 shadow-xs'
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
            <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-7 shadow-xs sticky top-24">
              <h2 className="font-serif text-xl font-bold text-[#23313A] mb-4 pb-2 border-b border-[#A8C3A0]/20 flex items-center justify-between">
                <span>Summary</span>
                <span className="text-xs font-sans text-[#A8C3A0] font-bold">
                  {cartItems.length} {cartItems.length === 1 ? 'Piece' : 'Pieces'}
                </span>
              </h2>

              <div className="max-h-60 overflow-y-auto divide-y divide-[#A8C3A0]/15 mb-4 pr-1">
                {cartItems.map((item, idx) => (
                  <div key={item.product_id || item.id || idx} className="py-3 flex items-center gap-3">
                    <img
                      src={item.image_url || item.image || item.img || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=100'}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#A8C3A0]/30 shrink-0 bg-[#F6F1E8]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-[#23313A] truncate">{item.name}</p>
                      <p className="text-[10px] text-[#A8C3A0]">
                        Size {item.size || 'OS'} • 1-of-1 Piece
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#2F6B4F] shrink-0">
                      ₱{Number(item.price || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo / Voucher Code Section */}
              <div className="border-t border-[#A8C3A0]/20 pt-4 mb-4">
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
                      className="text-[#E67E5F] hover:text-[#23313A] p-1 rounded-md transition-colors cursor-pointer"
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
                        placeholder="e.g. VINTAGE20, LOOP100"
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

              {/* Price Calculation Breakdown */}
              <div className="space-y-2.5 text-xs border-t border-[#A8C3A0]/20 pt-4 text-[#23313A]/70">
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
                  <span className="text-[#2F6B4F]">₱{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 mt-6 cursor-pointer active:scale-95 text-xs"
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

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#A8C3A0] font-semibold">
                <ShieldCheck size={14} className="text-[#2F6B4F]" />
                <span>Encrypted 256-Bit SSL Checkout</span>
              </div>
            </div>
          </div>

        </form>
      </main>
    </div>
  );
}
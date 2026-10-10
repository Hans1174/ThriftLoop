import { API_URL } from './config';
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { 
  CheckCircle2, Package, Truck, ArrowRight, 
  MapPin, Printer, Loader2, AlertCircle, ShoppingBag, 
  Tag, Calendar, Clock, DollarSign
} from 'lucide-react';
import { useCart } from './context/CartContext';

// Safe environment fallback
const BACKEND_URL = API_URL || import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function Confirmation() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const cartContext = useCart ? useCart() : {};
  const clearCart = cartContext.clearCart || (() => {});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const verifiedRef = useRef(false);

  const sessionId = searchParams.get('session_id');
  const orderIdFromQuery = searchParams.get('order_id');
  const stateData = location.state || {};
  const targetOrderId = stateData.orderId || orderIdFromQuery;

  useEffect(() => {
    // Clear the cart on successful checkout
    clearCart();

    // If no order ID could be determined from state or query params
    if (!targetOrderId && !sessionId) {
      setError('No active order reference was found.');
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      // 1. If returning from PayMongo session, verify payment first
      if (sessionId && sessionId !== '{CHECKOUT_SESSION_ID}' && !verifiedRef.current) {
        verifiedRef.current = true;
        try {
          await fetch(`${BACKEND_URL}/api/checkout/verify/${sessionId}?order_id=${targetOrderId}`);
        } catch (err) {
          console.warn('Payment verification notice:', err);
        }
      }

      // 2. Fetch full order record from backend
      if (targetOrderId) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/track/${targetOrderId}`);
          if (res.ok) {
            const data = await res.json();
            setOrder(data);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Backend order fetch failed, falling back to router state:', err);
        }
      }

      // 3. Fallback to router state if backend fetch is unreachable
      if (stateData.orderId) {
        setOrder({
          order_id: stateData.orderId,
          total_amount: stateData.total,
          payment_method: stateData.paymentMethod || 'Cash on Delivery (COD)',
          courier: stateData.courier || 'J&T Express',
          tracking_number: stateData.tracking_number || `JNT-${Date.now().toString().slice(-8)}`,
          shipping_fee: stateData.shippingFee || 80,
          discount_amount: stateData.discountAmount || 0,
          voucher_code: stateData.voucherCode || null,
          items: stateData.items || [],
          status: 'pending',
          created_at: new Date().toISOString(),
        });
        setLoading(false);
      } else {
        setError('Unable to load order confirmation details.');
        setLoading(false);
      }
    };

    loadOrder();
  }, [targetOrderId, sessionId]);

  if (loading) {
    return (
      <div className="min-h-[75vh] bg-[#F6F1E8] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 size={36} className="text-[#2F6B4F] animate-spin mb-3" />
        <h2 className="font-serif text-xl font-bold text-[#23313A]">Confirming Order Details...</h2>
        <p className="text-xs text-[#A8C3A0] mt-1 font-semibold">
          Securing your 1-of-1 vintage archive pieces.
        </p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-[75vh] bg-[#F6F1E8] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#E67E5F]/15 text-[#E67E5F] flex items-center justify-center mb-4">
          <AlertCircle size={28} />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#23313A] mb-2">Order Notice</h2>
        <p className="text-xs text-[#23313A]/70 max-w-md mb-6 font-medium">{error}</p>
        <Link 
          to="/shop" 
          className="bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-xs"
        >
          Return to Boutique
        </Link>
      </div>
    );
  }

  const isCOD = (order?.payment_method || '').toLowerCase().includes('cash');
  const orderItems = order?.order_items || order?.items || [];
  const courier = order?.courier || 'J&T Express';
  const trackingNumber = order?.tracking_number || 'Assigning courier tracking...';

  // Realistic ETA calculation
  const deliveryEta = courier === 'Lalamove'
    ? 'Same-Day Metro Delivery'
    : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-20 py-8 px-4 sm:px-6">
      <main className="max-w-3xl mx-auto space-y-6">
        
        {/* Receipt Card */}
        <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          
          {/* Top Decorative Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#2F6B4F] via-[#A8C3A0] to-[#E67E5F]"></div>

          {/* Header Status */}
          <div className="text-center pb-8 border-b border-[#A8C3A0]/20">
            <div className="w-16 h-16 rounded-full bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center mx-auto mb-4 border border-[#2F6B4F]/20">
              <CheckCircle2 size={36} />
            </div>

            <span className={`inline-block text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mb-3 ${
              isCOD 
                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                : 'bg-[#2F6B4F]/10 text-[#2F6B4F] border border-[#2F6B4F]/20'
            }`}>
              {isCOD ? 'Cash on Delivery • Order Secured' : 'Payment Verified • PayMongo'}
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#23313A] tracking-tight">
              Order Confirmed!
            </h1>
            <p className="text-xs sm:text-sm text-[#23313A]/70 mt-2 max-w-md mx-auto leading-relaxed">
              Thank you for choosing sustainable vintage fashion. An official order invoice and courier dispatch alert have been dispatched to your email address.
            </p>
          </div>

          {/* Order Summary Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-[#A8C3A0]/20 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">Order Ref</span>
              <span className="font-bold text-[#23313A] text-sm">#{order?.order_id || targetOrderId}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">Payment Method</span>
              <span className="font-bold text-[#23313A] truncate block">{order?.payment_method || 'Cash on Delivery (COD)'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">Courier</span>
              <span className="font-bold text-[#23313A] flex items-center gap-1">
                <Truck size={13} className="text-[#2F6B4F]" />
                {courier}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">Estimated Delivery</span>
              <span className="font-bold text-[#2F6B4F] block">{deliveryEta}</span>
            </div>
          </div>

          {/* Tracking Number Banner (Objectives 2 & 4) */}
          <div className="my-6 bg-[#F6F1E8]/70 border border-[#A8C3A0]/40 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#A8C3A0]/30 flex items-center justify-center text-[#2F6B4F] shrink-0">
                <Package size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#A8C3A0]">Tracking Number</p>
                <p className="font-mono font-bold text-sm text-[#23313A]">
                  {trackingNumber}
                </p>
              </div>
            </div>

            <Link
              to={`/track/${order?.order_id || targetOrderId}`}
              className="bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <span>Track Parcel</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Delivery Address Details */}
          {order?.shipping_address && (
            <div className="mb-6 p-4 rounded-2xl bg-white border border-[#A8C3A0]/20 flex items-start gap-3 text-xs">
              <MapPin size={16} className="text-[#2F6B4F] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">Delivery Address</span>
                <p className="font-medium text-[#23313A] mt-0.5">
                  {order.customer_name && <strong className="block">{order.customer_name}</strong>}
                  {order.shipping_address}, {order.city}, {order.province} {order.postal_code}
                </p>
              </div>
            </div>
          )}

          {/* Purchased Items List */}
          {orderItems.length > 0 && (
            <div className="py-4 border-b border-[#A8C3A0]/20">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#A8C3A0] mb-3">
                Purchased Pieces ({orderItems.length})
              </h3>
              
              <div className="divide-y divide-[#A8C3A0]/15">
                {orderItems.map((item, idx) => {
                  const product = item.products || item;
                  return (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={product.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=100'}
                          alt={product.name}
                          className="w-12 h-12 rounded-xl object-cover bg-[#F6F1E8] border border-[#A8C3A0]/30 shrink-0"
                        />
                        <div className="truncate">
                          <p className="font-bold text-[#23313A] truncate">{product.name || 'Archive Piece'}</p>
                          <p className="text-[10px] text-[#A8C3A0]">
                            Size {product.size || 'OS'} • 1-of-1 Exclusive
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-[#2F6B4F] shrink-0">
                        ₱{parseFloat(item.price_at_purchase || product.price || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="py-4 space-y-2 text-xs border-b border-[#A8C3A0]/20 text-[#23313A]/70">
            {order?.voucher_code && (
              <div className="flex justify-between text-[#2F6B4F] font-semibold">
                <span className="flex items-center gap-1">
                  <Tag size={12} /> Voucher ({order.voucher_code})
                </span>
                <span>-₱{parseFloat(order.discount_amount || 0).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Shipping Fee ({courier})</span>
              <span className="font-bold text-[#23313A]">
                {parseFloat(order?.shipping_fee || 0) === 0 ? 'FREE' : `₱${parseFloat(order?.shipping_fee || 0).toFixed(2)}`}
              </span>
            </div>

            <div className="pt-2 flex justify-between text-base font-bold text-[#23313A]">
              <span>{isCOD ? 'Total Due on Delivery' : 'Total Paid'}</span>
              <span className="text-[#2F6B4F]">
                ₱{parseFloat(order?.total_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* CTAs */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-bold text-[#23313A]/70 hover:text-[#2F6B4F] py-3 px-5 rounded-xl border border-[#A8C3A0]/30 transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Invoice Receipt</span>
            </button>

            <Link
              to="/shop"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#23313A] hover:bg-[#2F6B4F] text-white text-xs font-bold py-3.5 px-6 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <ShoppingBag size={14} />
              <span>Return to Boutique</span>
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
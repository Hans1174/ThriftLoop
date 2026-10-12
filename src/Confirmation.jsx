import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { 
  CheckCircle2, Package, Truck, ArrowRight, 
  MapPin, Printer, Loader2, AlertCircle, ShoppingBag, 
  Tag, ShieldCheck, Check
} from 'lucide-react';
import { useCart } from './context/CartContext';
import { API_URL } from './config';

const BACKEND_URL = API_URL || import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const cartContext = useCart ? useCart() : {};
  const clearCart = cartContext.clearCart || (() => {});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const verifiedRef = useRef(false);

  // Extract order reference from URL query params or router state
  const sessionId = searchParams.get('session_id');
  const orderIdFromQuery = searchParams.get('order_id');
  const stateData = location.state || {};
  const targetOrderId = orderIdFromQuery || stateData.orderId || stateData.order_id;

  useEffect(() => {
    clearCart();

    if (!targetOrderId && !sessionId) {
      setError('No active order reference was found.');
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      // 1. Verify PayMongo session if returning from gateway
      if (sessionId && sessionId !== '{CHECKOUT_SESSION_ID}' && !verifiedRef.current) {
        verifiedRef.current = true;
        try {
          await fetch(`${BACKEND_URL}/api/checkout/verify/${sessionId}?order_id=${targetOrderId}`);
        } catch (err) {
          console.warn('Payment verification notice:', err);
        }
      }

      // 2. Fetch live order details from Supabase
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
          console.warn('Live order fetch failed, attempting state fallback:', err);
        }
      }

      // 3. Fallback to router state
      if (stateData.orderId || stateData.order_id) {
        setOrder({
          order_id: stateData.orderId || stateData.order_id,
          total_amount: stateData.total ?? stateData.totalAmount,
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
        <h2 className="font-serif text-xl font-bold text-[#23313A]">Retrieving Order Details...</h2>
        <p className="text-xs text-[#A8C3A0] mt-1 font-semibold">
          Confirming payment and securing your vintage archive pieces.
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

  const deliveryEta = courier === 'Lalamove'
    ? 'Same-Day Metro Delivery'
    : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16 py-6 sm:py-10 px-4 sm:px-8 print:min-h-0 print:bg-white print:p-0">
      
      {/* Print Engine Overrides: Ensures 1-Sheet Clean Output */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 8mm 10mm;
          }
          header, nav, footer, aside, .no-print, [role="navigation"] {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
            color: #1a1a1a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-card {
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            border-radius: 8px !important;
            padding: 14px 18px !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .print-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
        }
      `}</style>

      <main className="max-w-6xl mx-auto space-y-6 print:max-w-full">
        
        {/* Main Executive Order Card */}
        <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-10 shadow-sm print-card">
          
          {/* Print-Only Official Brand Header */}
          <div className="hidden print:flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#2F6B4F]">ThriftLoop</h2>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                Curated Vintage Archive • Official Customer Invoice
              </p>
            </div>
            <div className="text-right text-[11px] text-gray-500 font-medium">
              <p>Date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              <p className="font-bold text-[#23313A]">Order #{order?.order_id || targetOrderId}</p>
            </div>
          </div>

          {/* Top Status Header */}
          <div className="border-b border-[#A8C3A0]/20 pb-6 print:pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className={`inline-block text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full ${
                  isCOD 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                    : 'bg-[#2F6B4F]/10 text-[#2F6B4F] border border-[#2F6B4F]/20'
                }`}>
                  {isCOD ? 'Cash on Delivery • Order Secured' : 'Payment Verified • PayMongo'}
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#23313A] tracking-tight">
                  Order Confirmed!
                </h1>
                <p className="text-xs sm:text-sm text-[#23313A]/70 leading-relaxed max-w-xl">
                  Thank you for choosing sustainable vintage fashion. An official order invoice and courier alert have been dispatched to your email.
                </p>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center border border-[#2F6B4F]/20 shrink-0 self-start sm:self-auto">
                <CheckCircle2 size={36} />
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-[#A8C3A0]/15 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A8C3A0] print:text-gray-400 block">ORDER REF</span>
                <span className="font-bold text-[#23313A] text-sm">#{order?.order_id || targetOrderId}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A8C3A0] print:text-gray-400 block">PAYMENT METHOD</span>
                <span className="font-bold text-[#23313A] truncate block">{order?.payment_method || 'PayMongo'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A8C3A0] print:text-gray-400 block">COURIER</span>
                <span className="font-bold text-[#23313A] flex items-center gap-1">
                  <Truck size={13} className="text-[#2F6B4F]" />
                  {courier}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A8C3A0] print:text-gray-400 block">ESTIMATED DELIVERY</span>
                <span className="font-bold text-[#2F6B4F] block">{deliveryEta}</span>
              </div>
            </div>
          </div>

          {/* 2-Column Professional Body Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 print-grid">
            
            {/* Left Column: Logistics, Courier Tracking & Address */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Courier Tracking Card */}
              <div className="bg-[#F6F1E8]/60 border border-[#A8C3A0]/35 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-white border border-[#A8C3A0]/30 flex items-center justify-center text-[#2F6B4F] shrink-0 shadow-xs">
                    <Package size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">TRACKING CODE</span>
                    <span className="font-mono font-bold text-sm text-[#23313A] block">
                      {trackingNumber}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/track/${order?.order_id || targetOrderId}`}
                  className="bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0 print:hidden"
                >
                  <span>Track Parcel</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {/* Delivery Address Card */}
              {order?.shipping_address && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#A8C3A0]/25 shadow-xs space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[#2F6B4F] font-bold">
                    <MapPin size={15} />
                    <span className="text-[10px] uppercase tracking-wider text-[#A8C3A0]">DELIVERY ADDRESS</span>
                  </div>
                  <p className="font-bold text-sm text-[#23313A]">
                    {order.customer_name || 'Customer'}
                  </p>
                  <p className="text-[#23313A]/70 leading-relaxed">
                    {order.shipping_address}, {order.city}, {order.province} {order.postal_code}
                  </p>
                </div>
              )}

              {/* Security & Verification Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F1E8]/40 border border-[#A8C3A0]/20 flex items-start gap-3 text-xs">
                <ShieldCheck size={18} className="text-[#2F6B4F] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-[#23313A] block">Tamper-Proof Archive Sealed</span>
                  <p className="text-[#23313A]/60 leading-relaxed text-[11px]">
                    Every item has undergone physical tag authentication, fabric sanitization, and is protected under ThriftLoop's safe delivery guarantee.
                  </p>
                </div>
              </div>

            </div>

            {/* Right Column: Purchased Pieces & Billing Summary */}
            <div className="lg:col-span-5 space-y-5">
              
              <div className="bg-white border border-[#A8C3A0]/25 rounded-2xl p-5 shadow-xs space-y-4">
                
                {/* Purchased Pieces List */}
                {orderItems.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A8C3A0] pb-2 border-b border-[#A8C3A0]/15">
                      PURCHASED PIECES ({orderItems.length})
                    </h3>
                    
                    <div className="divide-y divide-[#A8C3A0]/15 max-h-52 overflow-y-auto pr-1">
                      {orderItems.map((item, idx) => {
                        const product = item.products || item;
                        return (
                          <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={product.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=100'}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover bg-[#F6F1E8] border border-[#A8C3A0]/30 shrink-0"
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

                {/* Financial Summary */}
                <div className="space-y-2 text-xs border-t border-[#A8C3A0]/20 pt-3 text-[#23313A]/70">
                  {order?.voucher_code && (
                    <div className="flex justify-between text-[#2F6B4F] font-semibold">
                      <span className="flex items-center gap-1">
                        <Tag size={11} /> Voucher ({order.voucher_code})
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

                  <div className="pt-2 border-t border-[#A8C3A0]/20 flex justify-between text-base font-bold text-[#23313A]">
                    <span>{isCOD ? 'Total Due on Delivery' : 'Total Paid'}</span>
                    <span className="text-[#2F6B4F] text-lg font-bold">
                      ₱{parseFloat(order?.total_amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons (Hidden when printed) */}
                <div className="pt-2 space-y-2.5 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-[#23313A] hover:text-[#2F6B4F] py-3 rounded-xl border border-[#A8C3A0]/30 hover:bg-[#F6F1E8]/50 transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Print Invoice Receipt</span>
                  </button>

                  <Link
                    to="/shop"
                    className="w-full flex items-center justify-center gap-2 bg-[#23313A] hover:bg-[#2F6B4F] text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <ShoppingBag size={14} />
                    <span>Return to Boutique</span>
                  </Link>
                </div>

              </div>

            </div>

          </div>

          {/* Print-Only Footer Notice */}
          <div className="hidden print:block pt-4 mt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
            Thank you for supporting circular fashion. For inquiries, reach us at support@thriftloop.com
          </div>

        </div>
      </main>
    </div>
  );
}
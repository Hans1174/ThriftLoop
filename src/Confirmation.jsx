import { API_URL } from './config';
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Package, Truck, ArrowRight, 
  MapPin, Clock, Loader2, AlertCircle, ShoppingBag 
} from 'lucide-react';
import { useCart } from './context/CartContext';

export default function Confirmation() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const cartContext = useCart ? useCart() : {};
  const clearCart = cartContext.clearCart || (() => {});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  // Prevent multiple verification calls in React StrictMode
  const verifiedRef = useRef(false);

  const sessionId = searchParams.get('session_id');
  const orderIdFromQuery = searchParams.get('order_id');
  const refFromQuery = searchParams.get('ref');

  useEffect(() => {
    // Path A: COD order passed via router navigation state
    if (location.state?.orderId) {
      setOrder({
        order_id: location.state.orderId,
        total_amount: location.state.total,
        payment_method: location.state.paymentMethod || 'Cash on Delivery (COD)',
        courier: location.state.courier || 'J&T Express',
        status: 'pending',
        date: location.state.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      });
      clearCart();
      setLoading(false);
      return;
    }

    // Path B: PayMongo redirect query params
    if (!sessionId || !orderIdFromQuery) {
      setError('No active checkout session or order was found.');
      setLoading(false);
      return;
    }

    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const verifyAndLoadOrder = async () => {
      try {
        // 1. Verify payment session with backend
        const verifyRes = await fetch(
          `${API_URL}/api/checkout/verify/${sessionId}?order_id=${orderIdFromQuery}`
        );
        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || verifyData.paid === false) {
          throw new Error('Payment was not completed or has expired.');
        }

        // 2. Fetch order record
        const orderRes = await fetch(`${API_URL}/api/track/${orderIdFromQuery}`);
        if (!orderRes.ok) throw new Error('Could not retrieve order details.');
        const orderData = await orderRes.json();

        setOrder(orderData);
        clearCart();
      } catch (err) {
        setError(err.message || 'Payment verification failed.');
      } finally {
        setLoading(false);
      }
    };

    verifyAndLoadOrder();
  }, [sessionId, orderIdFromQuery, location.state]);

  if (loading) {
    return (
      <div className="min-h-[75vh] bg-[#F6F1E8] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 size={36} className="text-[#2F6B4F] animate-spin mb-3" />
        <h2 className="font-serif text-xl font-bold text-[#23313A]">Verifying Payment with PayMongo...</h2>
        <p className="text-xs text-[#A8C3A0] mt-1 font-semibold">
          Securing your 1-of-1 vintage archive pieces.
        </p>
      </div>
    );
  }

  if (error) {
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

  const orderId = order?.order_id || orderIdFromQuery;
  const trackingNumber = order?.tracking_number || (location.state?.orderId ? `JNT-${Date.now().toString().slice(-8)}` : 'Generating...');
  const courier = order?.courier || location.state?.courier || 'J&T Express';
  const totalAmount = parseFloat(order?.total_amount || 0).toFixed(2);

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans py-10 px-4 sm:px-6">
      <main className="max-w-2xl mx-auto space-y-6">
        
        {/* Success Card */}
        <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-10 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2F6B4F] bg-[#2F6B4F]/10 px-3 py-1 rounded-full">
              Payment Secured & Verified
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#23313A] mt-3">
              Order Confirmed: #{orderId}
            </h1>
            <p className="text-xs text-[#23313A]/70 mt-1 max-w-md mx-auto">
              Your pieces have been claimed from the ThriftLoop archive. A confirmation email with receipt and courier dispatch updates has been sent.
            </p>
          </div>

          {/* Key Specs Receipt */}
          <div className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/30 rounded-2xl p-5 text-left text-xs space-y-3 mt-6">
            <div className="flex justify-between items-center pb-2.5 border-b border-[#A8C3A0]/20">
              <span className="text-[#A8C3A0] font-bold uppercase tracking-wider text-[10px]">Tracking Number</span>
              <span className="font-mono font-bold text-[#23313A] bg-white px-2.5 py-1 rounded border border-[#A8C3A0]/30 text-[11px]">
                {trackingNumber}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-[#A8C3A0]/20">
              <span className="text-[#A8C3A0] font-bold uppercase tracking-wider text-[10px]">Courier Service</span>
              <span className="font-bold text-[#23313A] flex items-center gap-1.5">
                <Truck size={14} className="text-[#2F6B4F]" />
                {courier}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2.5 border-b border-[#A8C3A0]/20">
              <span className="text-[#A8C3A0] font-bold uppercase tracking-wider text-[10px]">Payment Method</span>
              <span className="font-bold text-[#23313A]">
                {order?.payment_method || 'PayMongo Online'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-[#23313A] font-bold text-sm">Total Paid</span>
              <span className="font-bold text-[#2F6B4F] text-base">₱{totalAmount}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              to={`/track/${orderId}`}
              className="flex-1 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold py-3.5 px-6 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Package size={15} />
              <span>Track Delivery Status</span>
            </Link>

            <Link
              to="/shop"
              className="flex-1 bg-[#F6F1E8] hover:bg-[#A8C3A0]/20 text-[#23313A] text-xs font-bold py-3.5 px-6 rounded-xl border border-[#A8C3A0]/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag size={15} />
              <span>Back to Boutique</span>
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
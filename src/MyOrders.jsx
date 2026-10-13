import { API_URL } from './config';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle2, MapPin, ArrowRight, 
  ShoppingBag, Loader2, Clock, AlertCircle, Eye, Tag
} from 'lucide-react';

const BACKEND_URL = API_URL || import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const storedUser = localStorage.getItem('thriftloop_user');
  const token = localStorage.getItem('thriftloop_token');
  const user = storedUser ? JSON.parse(storedUser) : null;

  useEffect(() => {
    if (!token || !user) {
      window.dispatchEvent(new Event('open-login-modal'));
      navigate('/');
      return;
    }

    const userIdentifier = user.email || user.user_id || user.id;

    fetch(`${BACKEND_URL}/api/orders/user/${encodeURIComponent(userIdentifier)}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load your purchases.');
        return res.json();
      })
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Orders fetch note:', err.message);
        setError('Unable to retrieve your order history.');
        setOrders([]);
        setLoading(false);
      });
  }, [token, navigate]);

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') {
      return (
        <span className="bg-[#2F6B4F]/15 text-[#2F6B4F] border border-[#2F6B4F]/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          Delivered
        </span>
      );
    }
    if (s === 'shipped') {
      return (
        <span className="bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          In Transit
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="bg-rose-50 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          Cancelled
        </span>
      );
    }
    return (
      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        Processing
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16">
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full space-y-6">
        
        {/* Header Banner */}
        <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2F6B4F] animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-[#A8C3A0] tracking-wider">
                Personal Archive History
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#23313A] mt-1">
              My Orders
            </h1>
            <p className="text-xs text-[#23313A]/60 font-medium">
              Track live courier parcels, view order receipts, and manage verified archive acquisitions.
            </p>
          </div>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <ShoppingBag size={14} />
            <span>Explore Boutique Drops</span>
          </Link>
        </div>

        {error && (
          <div className="bg-[#E67E5F]/15 border border-[#E67E5F]/30 text-[#E67E5F] text-xs p-4 rounded-2xl flex items-center gap-2 font-bold">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Orders Feed */}
        {loading ? (
          <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-16 text-center text-[#23313A]/60 flex flex-col items-center justify-center space-y-3">
            <Loader2 size={32} className="animate-spin text-[#2F6B4F]" />
            <p className="text-xs font-bold">Retrieving your personal purchases...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-12 sm:p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#F6F1E8] border border-[#A8C3A0]/30 text-[#2F6B4F] flex items-center justify-center mx-auto">
              <Package size={26} />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#23313A]">
              No Orders Found
            </h3>
            <p className="text-xs text-[#23313A]/70 max-w-sm mx-auto leading-relaxed">
              You haven't placed any vintage apparel orders yet with <strong>{user?.email}</strong>.
            </p>
            <div className="pt-2">
              <Link
                to="/shop"
                className="inline-block bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-xs"
              >
                Browse Curated Drops
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const orderId = order.order_id || order.id;
              const items = order.order_items || order.items || [];
              const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={orderId}
                  className="bg-white border border-[#A8C3A0]/30 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 hover:border-[#2F6B4F]/40 transition-colors"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#A8C3A0]/20 gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono font-bold text-sm sm:text-base text-[#23313A]">
                        #{orderId}
                      </span>
                      <span className="text-xs text-[#A8C3A0] font-semibold">
                        Placed on {orderDate}
                      </span>
                      <span className="text-[10px] text-[#23313A]/60 bg-[#F6F1E8] px-2.5 py-0.5 rounded-md font-bold">
                        {order.payment_method || 'PayMongo'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Garment Pieces List */}
                  <div className="divide-y divide-[#A8C3A0]/15">
                    {items.length > 0 ? (
                      items.map((item, idx) => {
                        const product = item.products || item;
                        return (
                          <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={product.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=150'}
                                alt={product.name || 'Vintage Garment'}
                                className="w-12 h-12 rounded-xl object-cover bg-[#F6F1E8] border border-[#A8C3A0]/30 shrink-0"
                              />
                              <div className="truncate">
                                <p className="font-bold text-[#23313A] truncate">{product.name || 'Archive Garment'}</p>
                                <p className="text-[10px] text-[#A8C3A0] mt-0.5">
                                  Size {product.size || 'OS'} • 1-of-1 Exclusive
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-[#2F6B4F] shrink-0">
                              ₱{parseFloat(item.price_at_purchase || product.price || 0).toFixed(2)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-2 text-xs text-[#A8C3A0]">
                        1-of-1 Curated Vintage Piece
                      </div>
                    )}
                  </div>

                  {/* Summary & Action Strip */}
                  <div className="pt-3 border-t border-[#A8C3A0]/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-0.5 text-xs">
                      <span className="text-[10px] text-[#A8C3A0] uppercase font-bold block">
                        Courier: {order.courier || 'J&T Express'}
                      </span>
                      <span className="font-mono text-xs text-[#23313A]/70 font-semibold">
                        Tracking: {order.tracking_number || 'Assigning...'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                      <div className="text-right">
                        <span className="text-[9px] text-[#A8C3A0] uppercase font-bold block">Total Paid</span>
                        <span className="font-bold text-sm sm:text-base text-[#2F6B4F]">
                          ₱{parseFloat(order.total_amount || 0).toFixed(2)}
                        </span>
                      </div>

                      <Link
                        to={`/track/${orderId}`}
                        className="inline-flex items-center gap-1.5 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                      >
                        <Truck size={14} />
                        <span>Live Tracking</span>
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
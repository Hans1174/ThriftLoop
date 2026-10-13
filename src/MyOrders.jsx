import { API_URL } from './config';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, ShoppingBag, Loader2, AlertCircle, Eye 
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
        if (!res.ok) throw new Error('Could not retrieve your orders.');
        return res.json();
      })
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError('Unable to retrieve your order history.');
        setOrders([]);
        setLoading(false);
      });
  }, [token, navigate]);

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') {
      return (
        <span className="bg-[#2F6B4F]/10 text-[#2F6B4F] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          DELIVERED
        </span>
      );
    }
    if (s === 'shipped') {
      return (
        <span className="bg-sky-50 text-sky-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          IN TRANSIT
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="bg-rose-50 text-rose-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          CANCELLED
        </span>
      );
    }
    return (
      <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        PENDING
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16">
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2F6B4F] animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-[#A8C3A0] tracking-wider">
                Personal Order History
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#23313A] mt-1">
              Order History
            </h1>
            <p className="text-xs text-[#23313A]/60 font-medium">
              Track parcel transit, download receipts, and check fulfillment statuses.
            </p>
          </div>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <ShoppingBag size={14} />
            <span>Shop Archive</span>
          </Link>
        </div>

        {error && (
          <div className="bg-[#E67E5F]/15 border border-[#E67E5F]/30 text-[#E67E5F] text-xs p-4 rounded-2xl flex items-center gap-2 font-bold">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Orders Table Card */}
        <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 shadow-xs">
          {loading ? (
            <div className="py-16 text-center text-[#23313A]/60 flex flex-col items-center justify-center space-y-3">
              <Loader2 size={32} className="animate-spin text-[#2F6B4F]" />
              <p className="text-xs font-bold">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#F6F1E8] border border-[#A8C3A0]/30 text-[#2F6B4F] flex items-center justify-center mx-auto">
                <Package size={26} />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#23313A]">
                No Orders Placed Yet
              </h3>
              <p className="text-xs text-[#23313A]/70 max-w-sm mx-auto leading-relaxed">
                You haven't placed any orders under <strong>{user?.email}</strong>.
              </p>
              <div className="pt-2">
                <Link
                  to="/shop"
                  className="inline-block bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-xs"
                >
                  Browse Drops
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#A8C3A0]/30 text-[#A8C3A0] uppercase font-bold text-[10px] tracking-wider">
                    <th className="pb-3.5 px-2">ORDER ID</th>
                    <th className="pb-3.5 px-2">DATE</th>
                    <th className="pb-3.5 px-2">STATUS</th>
                    <th className="pb-3.5 px-2">TOTAL</th>
                    <th className="pb-3.5 px-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#A8C3A0]/15">
                  {orders.map((o) => {
                    const orderId = o.order_id || o.id;
                    const dateFormatted = new Date(o.created_at || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    return (
                      <tr key={orderId} className="hover:bg-[#F6F1E8]/40 transition-colors">
                        <td className="py-4 px-2 font-mono font-bold text-[#23313A]">#{orderId}</td>
                        <td className="py-4 px-2 text-[#23313A]/70 font-medium">{dateFormatted}</td>
                        <td className="py-4 px-2">{getStatusBadge(o.status)}</td>
                        <td className="py-4 px-2 font-bold text-[#2F6B4F]">₱{parseFloat(o.total_amount || 0).toFixed(2)}</td>
                        <td className="py-4 px-2 text-right">
                          <Link
                            to={`/track/${orderId}`}
                            className="inline-flex items-center gap-1.5 bg-[#F6F1E8] border border-[#A8C3A0]/30 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#23313A] hover:bg-[#A8C3A0]/25 transition-colors"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
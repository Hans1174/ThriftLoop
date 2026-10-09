import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Truck, ShoppingBag, ArrowRight } from 'lucide-react';

export default function OrderConfirmation() {
  const location = useLocation();

  // Retrieve passed order details from Checkout or fallback to wireframe defaults
  const state = location.state || {};
  const order = {
    orderId: state.orderId || state.order_id || '1043',
    total: state.total ?? state.totalAmount ?? 1480,
    paymentMethod: state.paymentMethod || 'GCash',
    date: state.date || 'Aug 30, 2026',
    items: state.items || [
      { id: 1, name: 'Vintage Floral Midi Dress', price: 450, qty: 1 },
      { id: 2, name: 'Classic Washed Denim Jacket', price: 550, qty: 1 },
      { id: 3, name: 'Relaxed Cargo Pants', price: 400, qty: 1 },
    ],
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] font-sans flex flex-col justify-between pb-16">
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between border-b border-[#E6DFD5]">
        <Link to="/" className="font-serif text-2xl font-bold tracking-tight">
          ThriftLoop
        </Link>
        <Link
          to="/shop"
          className="text-xs font-bold text-[#8C7A6B] hover:text-[#786759] flex items-center gap-1 transition-colors"
        >
          <ShoppingBag size={14} /> Back to Catalog
        </Link>
      </header>

      {/* Main Order Confirmation Card */}
      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="bg-[#FAF7F2] border border-[#E6DFD5] rounded-3xl p-8 sm:p-10 max-w-lg w-full shadow-sm space-y-6 text-center">
          {/* Success Status Badge */}
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle size={36} />
          </div>

          <div>
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A]">Order Confirmed!</h1>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Thank you for choosing sustainable vintage fashion. An official order invoice and receipt have been dispatched to your email address.
            </p>
          </div>

          {/* Key Order Details */}
          <div className="bg-white border border-[#E6DFD5] rounded-2xl p-5 text-left text-xs space-y-3 shadow-inner">
            <div className="flex justify-between items-center border-b border-[#E6DFD5] pb-2.5">
              <span className="text-gray-500 font-medium">Order Number:</span>
              <span className="font-mono font-bold text-sm text-[#1A1A1A]">#{order.orderId}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Payment Channel:</span>
              <span className="font-bold text-[#1A1A1A]">{order.paymentMethod}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Estimated Delivery:</span>
              <span className="font-bold text-[#1A1A1A]">{order.date}</span>
            </div>

            <div className="flex justify-between items-center border-t border-[#E6DFD5] pt-2.5">
              <span className="font-semibold text-gray-700">Total Paid:</span>
              <span className="font-bold text-base text-[#E06D44]">₱{Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Purchased Garments Itemized Summary */}
          {order.items && order.items.length > 0 && (
            <div className="bg-[#FAF7F2] border border-[#E6DFD5] rounded-xl p-4 text-left text-xs space-y-2">
              <p className="font-bold uppercase tracking-wider text-[10px] text-gray-400">Purchased Items</p>
              {order.items.map((item, idx) => {
                const quantity = item.quantity || item.qty || 1;
                const price = Number(item.price) || 0;
                return (
                  <div key={item.product_id || item.id || idx} className="flex justify-between text-gray-700">
                    <span className="truncate pr-2">{item.name} × {quantity}</span>
                    <span className="font-semibold shrink-0">₱{(price * quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <Link
              to={`/track/${order.orderId}`}
              className="w-full bg-[#8C7A6B] hover:bg-[#786759] text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Truck size={16} /> Track Shipment
            </Link>

            <Link
              to="/shop"
              className="w-full bg-white border border-[#E6DFD5] hover:bg-[#EFECE6] text-gray-700 font-bold py-3 rounded-xl text-xs block transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#FAF7F2] border-t border-[#E6DFD5] py-4 px-6 text-center">
        <p className="text-[11px] text-gray-400">© 2026 ThriftLoop. All rights reserved.</p>
      </footer>
    </div>
  );
}
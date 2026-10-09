import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trash2, ArrowRight, ShoppingBag, Sparkles, 
  ShieldCheck, CheckSquare, Square, X 
} from 'lucide-react';
import { useCart } from './context/CartContext';

export default function Cart() {
  const navigate = useNavigate();

  // Guard: Intercept unauthenticated visits and trigger login modal
  useEffect(() => {
    const token = localStorage.getItem('thriftloop_token');
    if (!token) {
      navigate('/');
      setTimeout(() => {
        window.dispatchEvent(new Event('open-login-modal'));
      }, 100);
    }
  }, [navigate]);

  const cartContext = useCart ? useCart() : {};
  const cartItems = cartContext.cartItems || cartContext.cart || [];
  const removeFromCart = cartContext.removeFromCart || (() => {});

  // Bulk Selection States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Auto-clean stale selections if items change
  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) =>
        cartItems.some((item) => (item.product_id || item.id) === id)
      )
    );
  }, [cartItems]);

  const getItemId = (item, idx) => item.product_id || item.id || idx;

  const toggleSelectItem = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === cartItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map((item, idx) => getItemId(item, idx)));
    }
  };

  const handleRemoveSelected = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => removeFromCart(id));
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const handleCancelSelection = () => {
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * (item.quantity || item.qty || 1),
    0
  );

  // Free shipping over ₱1,500
  const shipping = cartItems.length === 0 ? 0 : subtotal >= 1500 ? 0 : 100;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16 py-8 sm:py-12 px-4 sm:px-6">
      <main className="max-w-6xl mx-auto">
        
        {/* Header with Inline Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#23313A] tracking-tight">
              Your Shopping Bag
            </h1>
            <p className="text-xs text-[#A8C3A0] font-semibold mt-1">
              Authentic 1-of-1 pieces reserved while in your session
            </p>
          </div>

          {cartItems.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-white border border-[#A8C3A0]/40 text-[#2F6B4F] px-3.5 py-1.5 rounded-full shadow-xs">
                {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
              </span>

              {/* Action Buttons: Delete switches directly to Cancel + Remove */}
              {isSelectionMode ? (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs font-bold text-[#2F6B4F] hover:underline px-2 py-1 cursor-pointer"
                  >
                    {selectedIds.length === cartItems.length ? 'Deselect All' : 'Select All'}
                  </button>

                  <button
                    onClick={handleCancelSelection}
                    className="px-3.5 py-1.5 rounded-full border border-[#A8C3A0]/40 bg-white hover:bg-[#F6F1E8] text-xs font-bold text-[#23313A] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleRemoveSelected}
                    disabled={selectedIds.length === 0}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#E67E5F] hover:bg-[#d67053] disabled:opacity-40 text-xs font-bold text-white transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Trash2 size={13} />
                    <span>Remove{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full border border-[#A8C3A0]/40 bg-white hover:border-[#E67E5F] hover:text-[#E67E5F] text-[#23313A] transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Select items to delete"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Empty State */}
        {cartItems.length === 0 ? (
          <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-12 sm:p-16 text-center space-y-4 shadow-xs animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-[#F6F1E8] text-[#A8C3A0] flex items-center justify-center mx-auto mb-2 border border-[#A8C3A0]/20">
              <ShoppingBag size={28} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#23313A]">Your bag is currently empty</h2>
            <p className="text-xs text-[#23313A]/60 max-w-sm mx-auto font-medium">
              Explore curated vintage drops, 90s outerwear, and deadstock garments before they're gone.
            </p>
            <div className="pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-[#2F6B4F] text-white text-xs font-bold px-7 py-3.5 rounded-xl hover:bg-[#23313A] transition-all shadow-xs active:scale-95"
              >
                <span>Browse Vintage Collection</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Cart Items List */}
            <div className="lg:col-span-7 space-y-4">
              {cartItems.map((item, idx) => {
                const itemId = getItemId(item, idx);
                const isSelected = selectedIds.includes(itemId);
                const price = Number(item.price || 0);

                return (
                  <div
                    key={itemId}
                    onClick={() => {
                      if (isSelectionMode) toggleSelectItem(itemId);
                    }}
                    className={`bg-white border rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs transition-all ${
                      isSelectionMode
                        ? isSelected
                          ? 'border-[#E67E5F] bg-[#E67E5F]/5 ring-1 ring-[#E67E5F] cursor-pointer'
                          : 'border-[#A8C3A0]/40 hover:border-[#A8C3A0] cursor-pointer'
                        : 'border-[#A8C3A0]/30 hover:border-[#2F6B4F]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                      
                      {/* Selection Box: Only rendered when delete mode is active */}
                      {isSelectionMode && (
                        <div
                          className="shrink-0 text-[#E67E5F] cursor-pointer animate-in fade-in zoom-in-75 duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectItem(itemId);
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare size={20} className="text-[#E67E5F]" />
                          ) : (
                            <Square size={20} className="text-[#A8C3A0]" />
                          )}
                        </div>
                      )}

                      <div className="w-20 h-24 sm:w-24 sm:h-28 bg-[#F6F1E8]/70 border border-[#A8C3A0]/20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={item.image_url || item.image || item.img}
                          alt={item.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-[#A8C3A0] uppercase tracking-wider block">
                          {item.category_name || item.category || 'Archive Piece'}
                        </span>
                        <h3 className="font-serif font-bold text-sm sm:text-base text-[#23313A] truncate mt-0.5">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#23313A]/70">
                          <span className="bg-[#F6F1E8] px-2 py-0.5 rounded font-bold text-[10px] text-[#23313A]">
                            Size {item.size || 'OS'}
                          </span>
                          <span>•</span>
                          <span className="text-[10px] font-semibold text-[#A8C3A0]">
                            {item.condition_grade || 'Grade A'}
                          </span>
                        </div>

                        {/* Direct remove link only visible when NOT in bulk mode */}
                        {!isSelectionMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCart(itemId);
                            }}
                            className="text-[11px] text-[#E67E5F] hover:text-red-700 font-bold mt-3 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-base sm:text-lg text-[#2F6B4F]">
                        ₱{price.toFixed(2)}
                      </p>
                      <span className="text-[10px] text-[#A8C3A0] block font-semibold mt-0.5">
                        1-of-1 Piece
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs sticky top-24">
                <h2 className="font-serif text-xl font-bold text-[#23313A] border-b border-[#A8C3A0]/20 pb-3 flex items-center justify-between">
                  <span>Order Summary</span>
                  <span className="text-xs font-sans text-[#A8C3A0] font-semibold">
                    {cartItems.length} {cartItems.length === 1 ? 'Garment' : 'Garments'}
                  </span>
                </h2>

                <div className="space-y-2.5 text-xs text-[#23313A]/70">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#23313A]">₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nationwide Express Shipping</span>
                    <span className="font-bold text-[#23313A]">
                      {shipping === 0 ? 'FREE' : `₱${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  {shipping === 0 ? (
                    <p className="text-[10px] text-[#2F6B4F] font-semibold flex items-center gap-1 pt-0.5">
                      <Sparkles size={11} /> Free Express Shipping applied
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#A8C3A0] font-medium pt-0.5">
                      Add ₱{(1500 - subtotal).toFixed(2)} more for Free Shipping
                    </p>
                  )}
                  <div className="border-t border-[#A8C3A0]/30 pt-3 flex justify-between text-base font-bold text-[#23313A]">
                    <span>Estimated Total</span>
                    <span className="text-[#2F6B4F]">₱{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    onClick={() => navigate('/checkout')}
                    disabled={isSelectionMode}
                    className="w-full bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={14} />
                  </button>
                  <Link
                    to="/shop"
                    className="w-full bg-[#F6F1E8]/70 border border-[#A8C3A0]/40 hover:bg-white text-[#23313A] font-bold py-2.5 rounded-xl block text-center text-xs transition-colors"
                  >
                    Continue Shopping
                  </Link>
                </div>

                <div className="pt-2 border-t border-[#A8C3A0]/20 flex items-center justify-center gap-2 text-[10px] text-[#A8C3A0] font-semibold">
                  <ShieldCheck size={14} className="text-[#2F6B4F]" />
                  <span>Secured with PayMongo & Direct Delivery Tracking</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, ShoppingBag, User, LogOut, Shield, 
  Package, ChevronDown, Settings, X, ArrowRight 
} from 'lucide-react';
import { useCart } from './context/CartContext';

// Reliable fallback items so search always has instant data
const BACKUP_PRODUCTS = [
  { product_id: 1, name: 'Vintage Floral Midi Dress', category_name: 'Dresses', price: 450, size: 'M', condition_grade: 'Grade A', image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=500&auto=format&fit=crop' },
  { product_id: 2, name: 'Classic Washed Denim Jacket', category_name: 'Outerwear', price: 750, size: 'L', condition_grade: 'Deadstock', image_url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=500&auto=format&fit=crop' },
  { product_id: 3, name: '90s Single-Stitch Band Tee', category_name: 'Tops', price: 350, size: 'XL', condition_grade: 'Grade A', image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=500&auto=format&fit=crop' },
  { product_id: 4, name: 'Relaxed Utility Cargo Pants', category_name: 'Bottoms', price: 400, size: '32', condition_grade: 'Grade A', image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=500&auto=format&fit=crop' },
  { product_id: 5, name: 'Retro Oversized Wool Knit Sweater', category_name: 'Tops', price: 550, size: 'M', condition_grade: 'Grade B', image_url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=500&auto=format&fit=crop' },
  { product_id: 6, name: 'Vintage Leather Combat Boots', category_name: 'Shoes', price: 1200, size: 'OS', condition_grade: 'Grade A', image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=500&auto=format&fit=crop' },
];

export default function Navbar({ onOpenLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Cart Context
  const cartContext = useCart ? useCart() : {};
  const cart = cartContext.cart || cartContext.cartItems || [];
  const rawCartCount = cartContext.cartCount ?? cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // User State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('thriftloop_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const cartCount = currentUser ? rawCartCount : 0;
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState(BACKUP_PRODUCTS);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Pre-fetch live inventory
  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.products || data.data || []);
        if (list.length > 0) {
          setAllProducts(list);
        }
      })
      .catch(() => {
        setAllProducts(BACKUP_PRODUCTS);
      });
  }, []);

  // Filter matching engine that prioritizes first-letter startsWith matches
  const runSearch = (inputVal, dataset = allProducts) => {
    const q = inputVal.trim().toLowerCase();

    // Trigger on the very first letter (length >= 1)
    if (!q) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const matches = dataset
      .map((item) => {
        const name = String(item.name || item.title || '').toLowerCase();
        const cat = String(item.category_name || item.category || '').toLowerCase();
        const size = String(item.size || '').toLowerCase();

        // Exact or prefix matches get higher score
        let score = 0;
        if (size === q) score += 5;
        if (name.startsWith(q)) score += 4;
        if (cat.startsWith(q)) score += 3;
        if (name.includes(q)) score += 2;
        if (cat.includes(q)) score += 1;

        return { item, score };
      })
      .filter((res) => res.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((res) => res.item);

    setSearchResults(matches.slice(0, 6));
    setIsSearchOpen(true);
  };

  // Immediate execution on keystroke
  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    runSearch(val, allProducts);
  };

  // Keep search state in sync on path transitions
  useEffect(() => {
    setIsProfileOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  // Click outside to dismiss popups
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectProduct = (productId) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(`/product/${productId}`);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  const handleTriggerLogin = () => {
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      window.dispatchEvent(new Event('open-login-modal'));
    }
  };

  const handleCartClick = (e) => {
    e.preventDefault();
    if (!currentUser) {
      handleTriggerLogin();
    } else {
      navigate('/cart');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('thriftloop_user');
    localStorage.removeItem('thriftloop_token');
    localStorage.removeItem('thriftloop_cart');
    if (cartContext.clearCart) cartContext.clearCart();
    setCurrentUser(null);
    setIsProfileOpen(false);
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

//   if (location.pathname === '/register') return null;

  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'admin@thriftloop.com';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#A8C3A0]/30 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Brand Logo & Links */}
        <div className="flex items-center gap-8 md:gap-10">
          <Link to="/" className="font-serif text-3xl font-black tracking-tighter text-[#23313A]">
            Thrift<span className="text-[#2F6B4F]">Loop</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-7 text-sm font-bold">
            <Link 
              to="/" 
              className={`transition-colors ${
                location.pathname === '/' ? 'text-[#2F6B4F] border-b-2 border-[#2F6B4F] pb-0.5' : 'text-[#A8C3A0] hover:text-[#23313A]'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/shop" 
              className={`transition-colors ${
                location.pathname === '/shop' ? 'text-[#2F6B4F] border-b-2 border-[#2F6B4F] pb-0.5' : 'text-[#A8C3A0] hover:text-[#23313A]'
              }`}
            >
              Shop
            </Link>
          </nav>
        </div>

        {/* Search, Cart & Profile */}
        <div className="flex items-center gap-4 sm:gap-6">
          
          {/* First-Letter Instant Search Bar */}
          <div className="relative" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search size={15} className="absolute left-3.5 top-2.5 text-[#A8C3A0]" />
              <input
                type="text"
                placeholder="Search pieces, size (e.g. M)..."
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim().length >= 1) {
                    runSearch(searchQuery, allProducts);
                  }
                }}
                onChange={handleInputChange}
                className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-full pl-9 pr-8 py-1.5 text-xs text-[#23313A] placeholder-[#A8C3A0] focus:outline-none focus:border-[#2F6B4F] focus:bg-white w-44 sm:w-60 lg:w-72 shadow-xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-2.5 text-[#A8C3A0] hover:text-[#23313A] cursor-pointer"
                  title="Clear"
                >
                  <X size={13} />
                </button>
              )}
            </form>

            {/* Live Search Preview Dropdown */}
            {isSearchOpen && (
              <div className="absolute right-0 sm:left-0 mt-2 w-72 sm:w-84 bg-white border border-[#A8C3A0]/30 rounded-2xl shadow-xl overflow-hidden z-50 text-xs animate-in fade-in slide-in-from-top-1">
                <div className="p-2.5 border-b border-[#A8C3A0]/20 bg-[#F6F1E8]/40 flex justify-between items-center text-[10px] font-bold text-[#A8C3A0] uppercase tracking-wider">
                  <span>Results for "{searchQuery}" ({searchResults.length})</span>
                </div>

                <div className="max-h-68 overflow-y-auto divide-y divide-[#A8C3A0]/10">
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => {
                      const id = item.product_id || item.id;
                      const title = item.name || item.title || 'Vintage Item';
                      const category = item.category_name || item.category || 'Archive';
                      const price = item.price ? parseFloat(item.price).toFixed(2) : '0.00';
                      const img = item.image_url || item.img;
                      const size = item.size || 'OS';

                      return (
                        <div
                          key={id}
                          onClick={() => handleSelectProduct(id)}
                          className="p-2.5 flex items-center gap-3 hover:bg-[#F6F1E8]/60 cursor-pointer transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F6F1E8] shrink-0 border border-[#A8C3A0]/20">
                            <img
                              src={img}
                              alt={title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#23313A] truncate">{title}</p>
                            <div className="flex items-center gap-2 text-[10px] text-[#A8C3A0]">
                              <span>{category}</span>
                              <span>•</span>
                              <span className="font-bold text-[#23313A]/70">Size {size}</span>
                              <span>•</span>
                              <span className="font-bold text-[#2F6B4F]">₱{price}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs font-medium text-[#23313A]/60">
                      No matching vintage items found.
                    </div>
                  )}
                </div>

                {searchQuery.trim() && searchResults.length > 0 && (
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full p-2.5 bg-[#2F6B4F] hover:bg-[#23313A] text-white font-bold flex items-center justify-center gap-1.5 text-[11px] transition-colors cursor-pointer"
                  >
                    <span>View all matches in Shop</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cart Icon */}
          <button 
            onClick={handleCartClick} 
            className="relative text-[#A8C3A0] hover:text-[#23313A] transition-colors p-1 cursor-pointer" 
            title="Shopping Cart"
          >
            <ShoppingBag size={22} />
            {currentUser && cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#E67E5F] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </button>

          {/* Profile Dropdown / Login Button */}
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 bg-[#F6F1E8]/40 border border-[#A8C3A0]/40 hover:border-[#2F6B4F] hover:bg-white rounded-full py-1.5 px-3 transition-all shadow-xs focus:outline-none cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#2F6B4F] text-white flex items-center justify-center text-xs font-bold uppercase">
                  {currentUser.full_name ? currentUser.full_name[0] : <User size={12} />}
                </div>
                <span className="text-xs font-bold text-[#23313A] max-w-[100px] truncate hidden md:inline">
                  {currentUser.full_name || 'My Account'}
                </span>
                <ChevronDown size={14} className={`text-[#A8C3A0] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`absolute right-0 mt-2.5 w-56 bg-white border border-[#A8C3A0]/30 rounded-2xl shadow-xl py-2 z-50 text-xs ${isProfileOpen ? 'block' : 'hidden'}`}>
                <div className="px-4 py-2 border-b border-[#A8C3A0]/20">
                  <p className="font-bold text-[#23313A] truncate">{currentUser.full_name || 'Member'}</p>
                  <p className="text-[10px] text-[#A8C3A0] truncate">{currentUser.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    to="/account"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 font-bold text-[#23313A] hover:bg-[#F6F1E8] hover:text-[#2F6B4F] transition-colors"
                  >
                    <Settings size={15} className="text-[#A8C3A0]" />
                    <span>My Account & Addresses</span>
                  </Link>

                  <Link
                    to="/orders"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 font-bold text-[#23313A] hover:bg-[#F6F1E8] hover:text-[#2F6B4F] transition-colors"
                  >
                    <Package size={15} className="text-[#A8C3A0]" />
                    <span>My Orders & Tracking</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 font-bold text-[#2F6B4F] hover:bg-[#F6F1E8] transition-colors"
                    >
                      <Shield size={15} className="text-[#2F6B4F]" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                </div>

                <div className="border-t border-[#A8C3A0]/20 pt-1 mt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 font-bold text-[#E67E5F] hover:bg-red-50/50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleTriggerLogin}
              className="flex items-center gap-1.5 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 hover:border-[#2F6B4F] hover:bg-white text-[#23313A] text-xs font-bold px-4 py-2 rounded-full transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <User size={14} className="text-[#2F6B4F]" />
              <span>Log In</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
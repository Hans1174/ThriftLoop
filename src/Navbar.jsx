import { API_URL } from './config';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, ShoppingBag, User, LogOut, Shield, 
  Package, ChevronDown, Settings, X,
  MessageSquare, Menu, Megaphone
} from 'lucide-react';
import { useCart } from './context/CartContext';

const BACKEND_URL = API_URL || import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

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

  const cartContext = useCart ? useCart() : {};
  const cart = cartContext.cart || cartContext.cartItems || [];
  const rawCartCount = cartContext.cartCount ?? cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState(BACKUP_PRODUCTS);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Dynamic Announcement State
  const [announcement, setAnnouncement] = useState({ text: '', is_active: false });
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState(false);

  // Sync auth state changes across tabs and modals
  useEffect(() => {
    const handleAuthSync = () => {
      try {
        const saved = localStorage.getItem('thriftloop_user');
        setCurrentUser(saved ? JSON.parse(saved) : null);
      } catch {
        setCurrentUser(null);
      }
    };
    window.addEventListener('auth-change', handleAuthSync);
    window.addEventListener('storage', handleAuthSync);
    return () => {
      window.removeEventListener('auth-change', handleAuthSync);
      window.removeEventListener('storage', handleAuthSync);
    };
  }, []);

  // Fetch live store announcement
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/announcement`);
        if (res.ok) {
          const data = await res.json();
          setAnnouncement(data);
        }
      } catch {
        // Fallback default
        setAnnouncement({ 
          text: 'AUTOMATIC AGING MARKDOWNS ACTIVE ON UNSOLD VINTAGE', 
          is_active: true 
        });
      }
    };
    fetchAnnouncement();
  }, []);

  // Poll for incoming unread seller/buyer messages
  useEffect(() => {
    const userId = currentUser?.user_id || currentUser?.id;
    if (!userId) {
      setHasUnreadMessages(false);
      return;
    }

    const checkUnreadMessages = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/messages/unread-status/${userId}`);
        const data = await res.json();

        if (data?.latestIncomingAt) {
          const lastReadTime = localStorage.getItem(`thriftloop_last_read_msg_${userId}`);
          if (!lastReadTime || new Date(data.latestIncomingAt) > new Date(lastReadTime)) {
            if (location.pathname !== '/messages') {
              setHasUnreadMessages(true);
              return;
            }
          }
        }
        setHasUnreadMessages(false);
      } catch {
        // Silent catch for network retries
      }
    };

    checkUnreadMessages();
    const interval = setInterval(checkUnreadMessages, 6000);
    return () => clearInterval(interval);
  }, [currentUser, location.pathname]);

  useEffect(() => {
    const userId = currentUser?.user_id || currentUser?.id;
    if (location.pathname === '/messages' && userId) {
      setHasUnreadMessages(false);
      localStorage.setItem(`thriftloop_last_read_msg_${userId}`, new Date().toISOString());
    }
  }, [location.pathname, currentUser]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.products || data.data || []);
        if (list.length > 0) setAllProducts(list);
      })
      .catch(() => setAllProducts(BACKUP_PRODUCTS));
  }, []);

  const runSearch = (inputVal, dataset = allProducts) => {
    const q = inputVal.trim().toLowerCase();
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

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    runSearch(val, allProducts);
  };

  useEffect(() => {
    setIsProfileOpen(false);
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
  }, [location.pathname]);

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
      setIsMobileSearchOpen(false);
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectProduct = (productId) => {
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
    setSearchQuery('');
    navigate(`/product/${productId}`);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  const handleTriggerLogin = () => {
    setIsMobileMenuOpen(false);
    if (onOpenLogin) onOpenLogin();
    else window.dispatchEvent(new Event('open-login-modal'));
  };

  const handleCartClick = (e) => {
    e.preventDefault();
    if (!currentUser) handleTriggerLogin();
    else navigate('/cart');
  };

  const handleMessagesClick = () => {
    setIsMobileMenuOpen(false);
    const userId = currentUser?.user_id || currentUser?.id;
    if (userId) {
      setHasUnreadMessages(false);
      localStorage.setItem(`thriftloop_last_read_msg_${userId}`, new Date().toISOString());
    }
    if (!currentUser) handleTriggerLogin();
    else navigate('/messages');
  };

  const handleOrdersClick = () => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    if (!currentUser) handleTriggerLogin();
    else navigate('/orders');
  };

  const handleLogout = () => {
    localStorage.removeItem('thriftloop_user');
    localStorage.removeItem('thriftloop_token');
    localStorage.removeItem('thriftloop_cart');
    if (cartContext.clearCart) cartContext.clearCart();
    setCurrentUser(null);
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'admin@thriftloop.com';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#A8C3A0]/30 shadow-xs transition-all">
      
      {/* Dynamic Announcement Banner */}
      {announcement?.is_active && announcement?.text && !isAnnouncementDismissed && (
        <div className="bg-[#2F6B4F] text-white text-[11px] sm:text-xs font-mono font-bold py-2 px-4 flex items-center justify-between tracking-wide border-b border-[#23313A]/20 transition-all">
          <div className="flex-1 flex items-center justify-center gap-2 text-center truncate">
            <Megaphone size={14} className="shrink-0" />
            <span className="truncate uppercase">{announcement.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAnnouncementDismissed(true)}
            className="text-white/80 hover:text-white p-1 rounded-md transition-colors cursor-pointer shrink-0 ml-2"
            title="Dismiss Announcement"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        
        {/* Brand Logo & Desktop Nav Links */}
        <div className="flex items-center gap-6 lg:gap-10 shrink-0">
          <Link to="/" className="font-serif text-2xl sm:text-3xl font-black tracking-tighter text-[#23313A]">
            Thrift<span className="text-[#2F6B4F]">Loop</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-7 text-xs lg:text-sm font-bold">
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

        {/* Actions Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Desktop Search Bar */}
          <div className="relative hidden md:block" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-[#A8C3A0]" />
              <input
                type="text"
                placeholder="Search archive pieces..."
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim().length >= 1) runSearch(searchQuery, allProducts);
                }}
                onChange={handleInputChange}
                className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-full pl-8 pr-7 py-1.5 text-xs text-[#23313A] placeholder-[#A8C3A0] focus:outline-none focus:border-[#2F6B4F] focus:bg-white w-48 lg:w-64 shadow-xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-2.5 text-[#A8C3A0] hover:text-[#23313A] cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </form>

            {isSearchOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#A8C3A0]/30 rounded-2xl shadow-xl overflow-hidden z-50 text-xs">
                <div className="p-2.5 border-b border-[#A8C3A0]/20 bg-[#F6F1E8]/40 flex justify-between items-center text-[10px] font-bold text-[#A8C3A0] uppercase">
                  <span>Results for "{searchQuery}" ({searchResults.length})</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#A8C3A0]/10">
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <div
                        key={item.product_id || item.id}
                        onClick={() => handleSelectProduct(item.product_id || item.id)}
                        className="p-2.5 flex items-center gap-3 hover:bg-[#F6F1E8]/60 cursor-pointer"
                      >
                        <img src={item.image_url || item.img} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-[#F6F1E8]" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#23313A] truncate">{item.name}</p>
                          <p className="text-[10px] text-[#2F6B4F] font-bold">₱{parseFloat(item.price || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-[#23313A]/60">No items found.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden text-[#23313A] p-2 rounded-xl hover:bg-[#F6F1E8] transition-colors"
            title="Search"
          >
            {isMobileSearchOpen ? <X size={20} /> : <Search size={20} />}
          </button>

          {/* Messages Button with Live Unread Dot */}
          <button 
            type="button"
            onClick={handleMessagesClick} 
            className={`relative p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
              location.pathname === '/messages' 
                ? 'text-[#2F6B4F] bg-[#2F6B4F]/10' 
                : 'text-[#A8C3A0] hover:text-[#23313A] hover:bg-[#F6F1E8]'
            }`} 
            title="Inquiries"
          >
            <MessageSquare size={20} />
            {hasUnreadMessages && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E67E5F] rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Cart Icon */}
          <button 
            type="button"
            onClick={handleCartClick} 
            className="relative text-[#A8C3A0] hover:text-[#23313A] transition-colors p-2 rounded-xl hover:bg-[#F6F1E8] cursor-pointer shrink-0" 
            title="Shopping Cart"
          >
            <ShoppingBag size={20} />
            {currentUser && cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#E67E5F] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Desktop User Profile Dropdown */}
          <div className="hidden md:block">
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-full py-1.5 px-3 transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-[#2F6B4F] text-white flex items-center justify-center text-xs font-bold uppercase">
                    {currentUser.full_name ? currentUser.full_name[0] : <User size={12} />}
                  </div>
                  <span className="text-xs font-bold text-[#23313A] max-w-[90px] truncate">
                    {currentUser.full_name || 'Account'}
                  </span>
                  <ChevronDown size={13} className={`text-[#A8C3A0] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-[#A8C3A0]/30 rounded-2xl shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-[#A8C3A0]/20">
                      <p className="font-bold text-[#23313A] truncate">{currentUser.full_name}</p>
                      <p className="text-[10px] text-[#A8C3A0] truncate">{currentUser.email}</p>
                    </div>

                    {/* Role-Specific Dropdown Items */}
                    {isAdmin ? (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-[#F6F1E8] font-bold text-[#2F6B4F]"
                      >
                        <Shield size={14} /> Admin Dashboard
                      </Link>
                    ) : (
                      <>
                        <Link 
                          to="/account" 
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-[#F6F1E8] font-bold text-[#23313A]"
                        >
                          <Settings size={14} /> My Account
                        </Link>

                        <button
                          type="button"
                          onClick={handleOrdersClick}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#F6F1E8] font-bold text-[#23313A] text-left cursor-pointer"
                        >
                          <Package size={14} /> My Orders
                        </button>
                      </>
                    )}

                    <div className="border-t border-[#A8C3A0]/15 mt-1 pt-1">
                      <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center gap-2 px-4 py-2 text-[#E67E5F] hover:bg-red-50 font-bold text-left cursor-pointer"
                      >
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleTriggerLogin}
                className="flex items-center gap-1.5 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs"
              >
                <User size={13} />
                <span>Log In</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-[#23313A] p-2 hover:bg-[#F6F1E8] rounded-xl transition-colors"
            title="Menu"
          >
            {isMobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

        </div>
      </div>

      {/* Mobile Search Bar Drawer */}
      {isMobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-[#A8C3A0]/20 bg-white">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={14} className="absolute left-3.5 top-3 text-[#A8C3A0]" />
            <input
              type="text"
              placeholder="Search garments, sizes, brands..."
              value={searchQuery}
              onChange={handleInputChange}
              className="w-full bg-[#F6F1E8]/70 border border-[#A8C3A0]/40 rounded-full pl-9 pr-8 py-2 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
              autoFocus
            />
            {searchQuery && (
              <button type="button" onClick={handleClearSearch} className="absolute right-3 top-2.5 text-[#A8C3A0]">
                <X size={14} />
              </button>
            )}
          </form>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#A8C3A0]/20 px-5 py-4 space-y-4 animate-in slide-in-from-top-2">
          <nav className="flex flex-col space-y-2.5 text-xs font-bold text-[#23313A]">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="py-2 border-b border-[#F6F1E8]">
              Home
            </Link>
            <Link to="/shop" onClick={() => setIsMobileMenuOpen(false)} className="py-2 border-b border-[#F6F1E8]">
              Shop Collection
            </Link>
            <Link to="/track" onClick={() => setIsMobileMenuOpen(false)} className="py-2 border-b border-[#F6F1E8]">
              Track Parcel
            </Link>
            {currentUser && (
              isAdmin ? (
                <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="py-2 border-b border-[#F6F1E8] text-[#2F6B4F]">
                  Admin Dashboard
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleOrdersClick}
                    className="py-2 border-b border-[#F6F1E8] text-left font-bold"
                  >
                    My Orders
                  </button>
                  <Link to="/account" onClick={() => setIsMobileMenuOpen(false)} className="py-2 border-b border-[#F6F1E8]">
                    My Account
                  </Link>
                </>
              )
            )}
          </nav>

          <div className="pt-2">
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 bg-red-50 text-[#E67E5F] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut size={14} /> Sign Out ({currentUser.full_name?.split(' ')[0]})
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTriggerLogin}
                className="w-full py-3 bg-[#2F6B4F] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
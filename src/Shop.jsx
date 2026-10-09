import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Check, Loader2, X, RotateCcw } from 'lucide-react';
import { useCart } from './context/CartContext';

export default function Shop() {
  const cartContext = useCart ? useCart() : {};
  const addToCart = cartContext.addToCart || (() => {});
  const cart = cartContext.cart || cartContext.cartItems || [];

  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Layout States (Closed by default)
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [selectedSize, setSelectedSize] = useState('All');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [addedId, setAddedId] = useState(null);

  // Fetch live products from backend
  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        setLoading(false);
      });
  }, []);

  // Sync URL query params with component state cleanly
  useEffect(() => {
    const cat = searchParams.get('category');
    const search = searchParams.get('search');

    // If search is present without a category param, reset category to 'All'
    if (search !== null) {
      setSearchQuery(search);
      setSelectedCategory(cat || 'All');
    } else if (cat) {
      setSelectedCategory(cat);
      setSearchQuery('');
    } else {
      setSelectedCategory('All');
      setSearchQuery('');
    }
  }, [searchParams]);

  const clearSearch = () => {
    setSearchQuery('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams);
  };

  const resetAllFilters = () => {
    setSelectedCategory('All');
    setSelectedCondition('All');
    setSelectedSize('All');
    clearSearch();
  };

  const categories = ['All', 'Tops', 'Bottoms', 'Outerwear', 'Dresses', 'Shoes', 'Accessories'];
  const conditions = ['All', 'Deadstock', 'Grade A', 'Grade B'];
  const sizes = ['All', 'S', 'M', 'L', 'XL', '32', 'OS'];

  const activeFilterCount = [
    selectedCategory !== 'All',
    selectedCondition !== 'All',
    selectedSize !== 'All',
    Boolean(searchQuery.trim()),
  ].filter(Boolean).length;

  // Search and Filter computation
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products
      .filter((item) => {
        // Multi-field search match
        const matchSearch =
          !query ||
          (item.name && item.name.toLowerCase().includes(query)) ||
          (item.category_name && item.category_name.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query));

        // Category match
        const matchCat =
          selectedCategory === 'All' ||
          (item.category_name && item.category_name.toLowerCase() === selectedCategory.toLowerCase()) ||
          (item.name && item.name.toLowerCase().includes(selectedCategory.toLowerCase()));

        // Condition & Size matches
        const matchCond = selectedCondition === 'All' || item.condition_grade === selectedCondition;
        const matchSize = selectedSize === 'All' || item.size === selectedSize;

        return matchSearch && matchCat && matchCond && matchSize;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return parseFloat(a.price) - parseFloat(b.price);
        if (sortBy === 'price-high') return parseFloat(b.price) - parseFloat(a.price);
        return b.product_id - a.product_id;
      });
  }, [products, selectedCategory, selectedCondition, selectedSize, searchQuery, sortBy]);

  const handleAddToCart = (e, item) => {
    e.preventDefault();
    if (item.status === 'sold') return;

    const token = localStorage.getItem('thriftloop_token');
    if (!token) {
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }

    addToCart(item);
    setAddedId(item.product_id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16">
      <main className="max-w-7xl mx-auto px-6 py-8 sm:py-10">
        
        {/* Header Title Bar & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#23313A] tracking-tight">
              Curated Pieces
            </h1>
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
              <p className="text-xs font-semibold text-[#A8C3A0]">
                Showing {filteredProducts.length} unique 1-of-1 items
              </p>
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-[#A8C3A0]/40 text-[#23313A] text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Search: "{searchQuery}"
                  <button 
                    onClick={clearSearch} 
                    className="text-[#E67E5F] hover:text-black transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Controls: Filter Toggle + Sort By */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 shadow-xs cursor-pointer ${
                showFilters
                  ? 'bg-[#2F6B4F] text-white border-[#2F6B4F] shadow-sm'
                  : 'bg-white text-[#23313A] border-[#A8C3A0]/40 hover:border-[#2F6B4F] hover:bg-[#F6F1E8]/50'
              }`}
            >
              <SlidersHorizontal 
                size={14} 
                className={`transition-transform duration-300 ${showFilters ? 'rotate-90 text-white' : 'text-[#2F6B4F]'}`} 
              />
              <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
              {activeFilterCount > 0 && (
                <span
                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    showFilters ? 'bg-[#E67E5F] text-white' : 'bg-[#2F6B4F] text-white'
                  }`}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#23313A]/70 font-semibold hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-[#A8C3A0]/40 text-[#23313A] rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:border-[#2F6B4F] shadow-xs cursor-pointer hover:border-[#2F6B4F]/80 transition-colors"
              >
                <option value="newest">Latest Drops</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

          </div>
        </div>

        {/* Content Layout */}
        <div className={`grid grid-cols-1 gap-8 transition-all duration-500 ease-in-out ${showFilters ? 'lg:grid-cols-4' : 'w-full'}`}>
          
          {/* Collapsible Sidebar */}
          {showFilters && (
            <aside className="space-y-6 bg-white border border-[#A8C3A0]/30 rounded-2xl p-6 h-fit shadow-xs animate-in fade-in slide-in-from-left-6 duration-300">
              <div className="flex items-center justify-between border-b border-[#A8C3A0]/20 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-[#2F6B4F]" />
                  <h2 className="font-serif font-bold text-base text-[#23313A]">Filters</h2>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-[#A8C3A0] hover:text-[#23313A] p-1 rounded-lg hover:bg-[#F6F1E8] transition-all"
                  title="Close filter panel"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Category */}
              <div>
                <p className="text-[11px] font-bold text-[#23313A] uppercase tracking-wider mb-2.5">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                        selectedCategory === c
                          ? 'bg-[#2F6B4F] text-white shadow-xs'
                          : 'bg-[#F6F1E8]/70 text-[#23313A] hover:bg-[#A8C3A0]/30'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition */}
              <div>
                <p className="text-[11px] font-bold text-[#23313A] uppercase tracking-wider mb-2.5">Condition Grade</p>
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedCondition(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                        selectedCondition === g
                          ? 'bg-[#2F6B4F] text-white shadow-xs'
                          : 'bg-[#F6F1E8]/70 text-[#23313A] hover:bg-[#A8C3A0]/30'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <p className="text-[11px] font-bold text-[#23313A] uppercase tracking-wider mb-2.5">Size</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                        selectedSize === s
                          ? 'bg-[#2F6B4F] text-white shadow-xs'
                          : 'bg-[#F6F1E8]/70 text-[#23313A] hover:bg-[#A8C3A0]/30'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  className="w-full text-xs text-[#E67E5F] hover:text-[#d67053] font-bold pt-2 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset All Filters</span>
                </button>
              )}
            </aside>
          )}

          {/* Product Grid */}
          <div className={showFilters ? 'lg:col-span-3' : 'w-full'}>
            {loading ? (
              <div className="py-24 flex justify-center items-center gap-2.5 text-sm text-[#A8C3A0] font-bold animate-pulse">
                <Loader2 size={20} className="animate-spin text-[#2F6B4F]" /> Loading inventory pieces...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white border border-[#A8C3A0]/30 rounded-2xl p-12 text-center text-[#23313A] shadow-xs">
                <p className="font-bold text-sm">No items match your search.</p>
                <p className="text-xs text-[#A8C3A0] font-semibold mt-1">Try checking for typos or resetting active filters.</p>
                <button
                  onClick={resetAllFilters}
                  className="mt-5 inline-flex items-center gap-1.5 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} /> Reset Filters
                </button>
              </div>
            ) : (
              <div
                className={`grid gap-6 transition-all duration-500 ${
                  showFilters
                    ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                }`}
              >
                {filteredProducts.map((item) => (
                  <div
                    key={item.product_id}
                    className="bg-white border border-[#A8C3A0]/30 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between group hover:shadow-xl hover:-translate-y-1.5 hover:border-[#2F6B4F]/50 transition-all duration-300"
                  >
                    <Link to={`/product/${item.product_id}`} className="block relative">
                      <div className="h-64 bg-[#F6F1E8]/70 overflow-hidden flex items-center justify-center relative border-b border-[#A8C3A0]/10">
                        <span className="absolute top-3 left-3 z-10 bg-[#23313A] text-[#F6F1E8] text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                          {item.condition_grade}
                        </span>
                        <span className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-xs border border-[#A8C3A0]/30 text-[#23313A] text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                          Size {item.size}
                        </span>
                        {item.status === 'sold' && (
                          <span className="absolute inset-0 bg-[#23313A]/70 flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider z-20 backdrop-blur-[1px]">
                            Sold Out
                          </span>
                        )}
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                        />
                      </div>
                      <div className="p-4 bg-white">
                        <p className="text-[10px] font-bold text-[#A8C3A0] uppercase tracking-wider">
                          {item.category_name || 'Vintage'}
                        </p>
                        <h3 className="font-serif font-bold text-sm text-[#23313A] line-clamp-1 group-hover:text-[#2F6B4F] transition-colors mt-0.5">
                          {item.name}
                        </h3>
                        <p className="text-[#2F6B4F] font-bold text-base mt-1">
                          ₱{parseFloat(item.price).toFixed(2)}
                        </p>
                      </div>
                    </Link>

                    <div className="px-4 pb-4 bg-white">
                      <button
                        onClick={(e) => handleAddToCart(e, item)}
                        disabled={item.status === 'sold'}
                        className={`w-full font-bold py-2.5 rounded-xl text-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                          item.status === 'sold'
                            ? 'bg-[#F6F1E8] text-[#A8C3A0] cursor-not-allowed border border-[#A8C3A0]/20'
                            : addedId === item.product_id || cart.some((c) => (c.product_id || c.id) === item.product_id)
                            ? 'bg-[#2F6B4F] text-white scale-[1.01]'
                            : 'bg-[#E67E5F] hover:bg-[#d67053] hover:shadow-md text-white'
                        }`}
                      >
                        {item.status === 'sold' ? (
                          'Sold Out'
                        ) : addedId === item.product_id || cart.some((c) => (c.product_id || c.id) === item.product_id) ? (
                          <span className="flex items-center gap-1.5 animate-in zoom-in-75 duration-200">
                            <Check size={14} className="stroke-[3]" /> In Cart
                          </span>
                        ) : (
                          'Add to Cart'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
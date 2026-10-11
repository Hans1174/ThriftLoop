import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, X, Megaphone, Sparkles, Loader2, Tag } from 'lucide-react';
import { useCart } from './context/CartContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function Landing() {
  const navigate = useNavigate();
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [addedId, setAddedId] = useState(null);

  const [newArrivals, setNewArrivals] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const cartContext = useCart ? useCart() : {};
  const addToCart = cartContext.addToCart || (() => {});

  const categories = [
    { name: 'Tops', slug: 'tops', img: '/res/blackpolo.jpg' },
    { name: 'Bottoms', slug: 'bottoms', img: '/res/bottoms.jpg' },
    { name: 'Dresses', slug: 'dresses', img: '/res/dresses.jpg' },
    { name: 'Shoes', slug: 'shoes', img: '/res/shoes.jpg' },
    { name: 'Accessories', slug: 'accessories', img: '/res/bag.jpg' },
  ];

  const calculatePricing = (item) => {
    const rawPrice = parseFloat(item.price || 0);
    const originalPrice = parseFloat(item.original_price || rawPrice);

    if (item.original_price && originalPrice > rawPrice) {
      const discountPercent = Math.round(((originalPrice - rawPrice) / originalPrice) * 100);
      return { currentPrice: rawPrice, originalPrice, discountPercent, isDiscounted: true };
    }

    if (item.created_at) {
      const daysInInventory = Math.floor((new Date() - new Date(item.created_at)) / (1000 * 60 * 60 * 24));
      let discountRate = 0;
      if (daysInInventory >= 30) discountRate = 0.25;
      else if (daysInInventory >= 14) discountRate = 0.15;
      else if (daysInInventory >= 7) discountRate = 0.10;

      if (discountRate > 0) {
        return {
          currentPrice: rawPrice * (1 - discountRate),
          originalPrice: rawPrice,
          discountPercent: Math.round(discountRate * 100),
          isDiscounted: true,
        };
      }
    }

    return { currentPrice: rawPrice, originalPrice: rawPrice, discountPercent: 0, isDiscounted: false };
  };

  const fallbackFinds = [
    { product_id: 1, name: 'Vintage Floral Midi Dress', brand: 'Laura Ashley', price: 450, original_price: 550, size: 'M', condition_grade: 'Grade A', image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=500' },
    { product_id: 2, name: 'Classic Washed Denim Jacket', brand: "Levi's", price: 750, original_price: 750, size: 'L', condition_grade: 'Deadstock', image_url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=500' },
    { product_id: 3, name: '90s Single-Stitch Band Tee', brand: 'Brockum', price: 295, original_price: 350, size: 'XL', condition_grade: 'Grade A', image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=500' },
    { product_id: 4, name: 'Relaxed Utility Cargo Pants', brand: 'Carhartt', price: 400, original_price: 400, size: '32', condition_grade: 'Grade B', image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=500' },
  ];

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        const catalog = Array.isArray(data) ? data : (data.products || []);
        const activeItems = catalog.filter((item) => item.status !== 'sold').slice(0, 4);
        setNewArrivals(activeItems.length > 0 ? activeItems : fallbackFinds);
        setLoadingItems(false);
      })
      .catch(() => {
        setNewArrivals(fallbackFinds);
        setLoadingItems(false);
      });
  }, []);

  const heroSlides = [
    {
      id: 1,
      image: '/res/bg1.jpg',
      tag: 'Fresh Drops Daily',
      title: 'Every piece is one of a Kind.',
      subtitle: 'Curated vintage apparel authenticated and hand-picked across Japan & US archives.'
    },
    {
      id: 2,
      image: '/res/bg2.jpg',
      tag: 'New Arrivals',
      title: 'Sustainable Vintage Finds',
      subtitle: 'Give authentic 90s streetwear and classic archive silhouettes a second life.'
    },
    {
      id: 3,
      image: '/res/bg3.jpg',
      tag: 'Sustainable Style',
      title: 'Slow Fashion Revolution',
      subtitle: 'Zero landfills, circular economy, and pure vintage individuality.'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const nextSlide = () => setCurrentSlide(currentSlide === heroSlides.length - 1 ? 0 : currentSlide + 1);
  const prevSlide = () => setCurrentSlide(currentSlide === 0 ? heroSlides.length - 1 : currentSlide - 1);

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    const token = localStorage.getItem('thriftloop_token');
    if (!token) {
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }

    const { currentPrice } = calculatePricing(product);
    addToCart({
      id: product.product_id || product.id,
      product_id: product.product_id || product.id,
      name: product.name,
      price: currentPrice,
      original_price: product.original_price || product.price,
      size: product.size,
      condition_grade: product.condition_grade,
      image_url: product.image_url || product.img,
    });

    const idKey = product.product_id || product.id;
    setAddedId(idKey);
    setTimeout(() => setAddedId(null), 1800);
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16 overflow-x-hidden">
      
      {/* Announcement Ribbon */}
      {showAnnouncement && (
        <div className="bg-[#2F6B4F] text-white text-[10px] sm:text-[11px] py-2 px-3 sm:px-6 flex justify-between items-center font-bold tracking-wider uppercase">
          <div className="flex items-center gap-1.5 truncate pr-2">
            <Megaphone size={13} className="shrink-0" />
            <span className="truncate">Automatic aging markdowns active on unsold vintage</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-[#F6F1E8]/90">Nationwide Express Delivery</span>
            <button onClick={() => setShowAnnouncement(false)} className="text-white/80 hover:text-white cursor-pointer" title="Dismiss">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Hero Carousel */}
      <section className="relative w-full h-[460px] sm:h-[540px] md:h-[600px] lg:h-[650px] overflow-hidden group">
        {heroSlides.map((slide, index) => (
          <div 
            key={slide.id} 
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${currentSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <img src={slide.image} alt={slide.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#23313A]/95 via-[#23313A]/70 to-transparent"></div>

            <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-10 md:px-16 lg:px-24 max-w-4xl space-y-3.5 sm:space-y-5 md:space-y-6">
              <span className="text-[#A8C3A0] font-bold tracking-widest uppercase text-[10px] sm:text-xs flex items-center gap-2">
                <span className="w-5 sm:w-8 h-[2px] bg-[#E67E5F]"></span>
                {slide.tag}
              </span>
              <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#F6F1E8] leading-[1.15] sm:leading-[1.1] max-w-2xl">
                {slide.title}
              </h1>
              <p className="text-[#F6F1E8]/85 text-xs sm:text-sm md:text-base max-w-md sm:max-w-lg leading-relaxed font-medium">
                {slide.subtitle}
              </p>
              <div className="pt-1">
                <Link 
                  to="/shop" 
                  className="inline-block bg-[#E67E5F] text-white font-bold text-xs uppercase tracking-wider px-6 sm:px-8 py-3.5 sm:py-4 rounded-full hover:bg-[#d67053] transition-colors shadow-md active:scale-95 cursor-pointer"
                >
                  Explore Collection
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Controls: Visible on mobile/tablet touch, hover on desktop */}
        <button 
          onClick={prevSlide}
          className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 sm:bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-2 sm:p-3 rounded-full opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer"
          title="Previous slide"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 sm:bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-2 sm:p-3 rounded-full opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer"
          title="Next slide"
        >
          <ChevronRight size={20} className="sm:w-6 sm:h-6" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-6 sm:bottom-8 left-5 sm:left-10 md:left-16 lg:left-24 z-20 flex gap-1.5 sm:gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all duration-300 rounded-full h-1.5 cursor-pointer ${currentSlide === index ? 'w-6 sm:w-8 bg-[#E67E5F]' : 'w-2 bg-white/50 hover:bg-white'}`}
            />
          ))}
        </div>
      </section>

      {/* Shop by Category: 2 cols (mobile), 3 cols (tablet), 5 cols (desktop) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 lg:py-16">
        <div className="flex items-center justify-between mb-5 sm:mb-8">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#23313A]">Shop by Category</h2>
            <p className="text-[11px] sm:text-xs text-[#A8C3A0] font-semibold mt-0.5">Explore authentic vintage cuts by garment type</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/shop?category=${encodeURIComponent(cat.name)}`}
              className="group bg-white border border-[#A8C3A0]/30 rounded-2xl p-3.5 sm:p-4 md:p-5 text-center hover:border-[#2F6B4F] transition-all flex flex-col items-center justify-center gap-2.5 sm:gap-4 h-40 sm:h-48 md:h-52 shadow-xs active:scale-98"
            >
              <div className="w-18 h-18 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-full overflow-hidden flex items-center justify-center border border-[#A8C3A0]/20 shadow-xs bg-[#F6F1E8]/50">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <span className="font-bold text-xs sm:text-sm text-[#23313A] group-hover:text-[#2F6B4F] transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* New Arrivals: 2 cols (mobile), 3 cols (tablet), 4 cols (desktop) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-row justify-between items-end gap-3 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <span className="bg-[#E67E5F]/15 text-[#E67E5F] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={10} /> Just Dropped
              </span>
              <span className="text-[11px] sm:text-xs text-[#A8C3A0] font-semibold hidden xs:inline">1-of-1 Exclusives</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#23313A]">New Arrivals</h2>
            <p className="text-[11px] sm:text-xs text-[#23313A]/60 font-medium hidden sm:block mt-0.5">
              Freshly listed archive pieces directly from our curate floor.
            </p>
          </div>

          <Link 
            to="/shop" 
            className="bg-white border border-[#A8C3A0]/50 hover:border-[#2F6B4F] text-[#2F6B4F] text-[11px] sm:text-xs font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-full flex items-center gap-1 transition-colors shadow-xs shrink-0"
          >
            <span>Explore Drop</span> <ChevronRight size={13} />
          </Link>
        </div>

        {loadingItems ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-6 py-8">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white border border-[#A8C3A0]/20 rounded-2xl h-72 sm:h-80 md:h-96 animate-pulse p-3 sm:p-4 flex flex-col justify-between">
                <div className="bg-[#F6F1E8] h-44 sm:h-52 md:h-60 rounded-xl w-full"></div>
                <div className="space-y-2 pt-3">
                  <div className="bg-[#F6F1E8] h-3 w-1/3 rounded"></div>
                  <div className="bg-[#F6F1E8] h-4 w-3/4 rounded"></div>
                  <div className="bg-[#F6F1E8] h-4 w-1/2 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-6">
            {newArrivals.map((item) => {
              const id = item.product_id || item.id;
              const isAdded = addedId === id;
              const { currentPrice, originalPrice, discountPercent, isDiscounted } = calculatePricing(item);

              return (
                <div
                  key={id}
                  className="bg-white border border-[#A8C3A0]/30 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between group hover:shadow-md hover:border-[#2F6B4F]/40 transition-all"
                >
                  <Link to={`/product/${id}`} className="block relative">
                    <div className="h-44 sm:h-56 md:h-72 w-full bg-[#F6F1E8]/50 overflow-hidden relative border-b border-[#A8C3A0]/10">
                      
                      <span className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 bg-[#23313A] text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-xs uppercase tracking-wider">
                        {item.brand || 'Vintage'}
                      </span>

                      {isDiscounted && (
                        <span className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 z-10 bg-[#E67E5F] text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md shadow-xs flex items-center gap-0.5 sm:gap-1 uppercase tracking-wider">
                          <Tag size={9} /> -{discountPercent}%
                        </span>
                      )}

                      <span className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 bg-[#2F6B4F] text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded shadow-xs">
                        Size {item.size}
                      </span>

                      <img
                        src={item.image_url || item.img || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=500'}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-3 sm:p-4 md:p-5 bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] sm:text-[10px] font-bold text-[#A8C3A0] uppercase tracking-wider truncate">
                          {item.condition_grade || item.grade || 'Class A'}
                        </span>
                        {item.category_name && (
                          <span className="text-[9px] sm:text-[10px] font-bold text-[#2F6B4F] uppercase hidden xs:inline">
                            {item.category_name}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif font-bold text-xs sm:text-sm text-[#23313A] line-clamp-1 group-hover:text-[#2F6B4F] transition-colors">
                        {item.name}
                      </h3>

                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2">
                        <span className="text-[#2F6B4F] font-bold text-xs sm:text-sm md:text-base">
                          ₱{currentPrice.toFixed(2)}
                        </span>
                        {isDiscounted && (
                          <span className="text-[10px] sm:text-xs text-[#23313A]/40 line-through font-semibold">
                            ₱{originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="px-3 pb-3 sm:px-4 sm:pb-4 md:px-5 md:pb-5 bg-white">
                    <button
                      onClick={(e) => handleAddToCart(e, item)}
                      className="w-full bg-[#2F6B4F] hover:bg-[#23313A] text-white font-bold py-2 sm:py-2.5 md:py-3 rounded-xl text-[11px] sm:text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      {isAdded ? (
                        <>
                          <Check size={13} /> Added!
                        </>
                      ) : (
                        'Add to Cart'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
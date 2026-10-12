import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingBag, QrCode, Check, Loader2, 
  MessageSquare, Send, X, AlertCircle, Store, Tag, 
  ShieldCheck, Sparkles, Truck 
} from 'lucide-react';
import { useCart } from './context/CartContext';
import { API_URL } from './config';

const BACKEND_URL = API_URL || import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [added, setAdded] = useState(false);

  // Cart Context Hook
  const cartContext = useCart ? useCart() : {};
  const addToCart = cartContext.addToCart || (() => {});

  // Direct Seller Chat State
  const [showChatModal, setShowChatModal] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef(null);

  const storedUser = localStorage.getItem('thriftloop_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const currentUserId = currentUser?.user_id || currentUser?.id;

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching product detail:', err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Live polling for seller responses
  useEffect(() => {
    if (!showChatModal || !conversation?.conversation_id) return;

    const interval = setInterval(() => {
      fetch(`${BACKEND_URL}/api/messages/${conversation.conversation_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setMessages(data);
          }
        })
        .catch(() => null);
    }, 3000);

    return () => clearInterval(interval);
  }, [showChatModal, conversation]);

  const handleAddToCart = () => {
    const token = localStorage.getItem('thriftloop_token');
    if (!token) {
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }

    if (!product || product.status === 'sold') return;

    addToCart({
      id: product.product_id || product.id,
      product_id: product.product_id || product.id,
      name: product.name,
      price: parseFloat(product.price),
      original_price: product.original_price || product.price,
      size: product.size,
      condition_grade: product.condition_grade,
      image_url: product.image_url,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleOpenMessageSeller = async () => {
    const token = localStorage.getItem('thriftloop_token');
    if (!token || !currentUserId) {
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }

    setShowChatModal(true);
    setChatLoading(true);
    setChatError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/messages/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: currentUserId,
          product_id: product.product_id || product.id,
        }),
      });

      const convoData = await res.json();
      if (!res.ok) throw new Error(convoData.error || 'Failed to start chat thread.');

      setConversation(convoData);

      const msgRes = await fetch(`${BACKEND_URL}/api/messages/${convoData.conversation_id}`);
      const msgData = await msgRes.json();
      setMessages(Array.isArray(msgData) ? msgData : []);
    } catch (err) {
      setChatError(err.message || 'Could not connect to seller chat.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversation) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');
    setSending(true);
    setChatError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation.conversation_id,
          sender_id: currentUserId,
          receiver_id: conversation.seller_id,
          message_text: textToSend,
        }),
      });

      const newMsg = await res.json();
      if (!res.ok) throw new Error(newMsg.error || 'Failed to deliver message.');

      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      setChatError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-[#F6F1E8] flex flex-col items-center justify-center gap-2 text-xs text-[#23313A]/60">
        <Loader2 className="animate-spin text-[#2F6B4F]" size={28} />
        <span className="font-semibold">Authenticating piece details...</span>
      </div>
    );
  }

  if (!product || product.error) {
    return (
      <div className="min-h-[70vh] bg-[#F6F1E8] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#23313A]">Garment Claimed or Unavailable</h2>
        <p className="text-xs text-[#23313A]/70 max-w-sm">
          Every item at ThriftLoop is strictly 1-of-1. This piece may have been acquired by another collector.
        </p>
        <Link to="/shop" className="bg-[#2F6B4F] text-white px-6 py-3 rounded-xl text-xs font-bold shadow-xs">
          Browse Active Catalog
        </Link>
      </div>
    );
  }

  const isSold = product.status === 'sold';

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-24 sm:pb-16 overflow-x-hidden">
      
      {/* Breadcrumb Navigation */}
      <header className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#A8C3A0]/25 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 text-[#23313A]/60 truncate max-w-[220px] sm:max-w-md">
          <Link to="/" className="hover:underline shrink-0">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:underline shrink-0">Shop</Link>
          <span>/</span>
          <span className="text-[#23313A] font-bold truncate">{product.name}</span>
        </div>
        <Link to="/shop" className="flex items-center gap-1 font-bold text-[#2F6B4F] hover:underline shrink-0 ml-2">
          <ArrowLeft size={14} /> <span>All Drops</span>
        </Link>
      </header>

      {/* Main Product Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Responsive Gallery View (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl h-80 sm:h-[420px] md:h-[480px] flex items-center justify-center overflow-hidden p-4 sm:p-6 shadow-xs relative">
              
              <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5">
                <span className="bg-[#23313A] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {product.brand || 'Vintage Archive'}
                </span>
                <span className="bg-[#2F6B4F] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {product.condition_grade || 'Grade A'}
                </span>
              </div>

              {isSold && (
                <div className="absolute inset-0 bg-[#23313A]/70 backdrop-blur-xs z-20 flex items-center justify-center">
                  <span className="bg-[#E67E5F] text-white text-xs sm:text-sm font-bold uppercase tracking-widest px-6 py-2.5 rounded-full shadow-lg">
                    1-of-1 Sold Out
                  </span>
                </div>
              )}

              <img
                src={product.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600'}
                alt={product.name}
                className="max-h-full max-w-full object-contain rounded-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white border border-[#A8C3A0]/25 rounded-2xl p-3.5 flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-[#2F6B4F] shrink-0" />
                <div>
                  <span className="font-bold text-[11px] block">100% Authentic Tag</span>
                  <span className="text-[10px] text-[#A8C3A0]">Inspected garment cut</span>
                </div>
              </div>
              <div className="bg-white border border-[#A8C3A0]/25 rounded-2xl p-3.5 flex items-center gap-2.5">
                <Truck size={18} className="text-[#2F6B4F] shrink-0" />
                <div>
                  <span className="font-bold text-[11px] block">Ready for Dispatch</span>
                  <span className="text-[10px] text-[#A8C3A0]">J&T Express & Same-Day</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Garment Specs & Purchase Actions (5 cols) */}
          <div className="md:col-span-5 bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            
            <div className="space-y-2 border-b border-[#A8C3A0]/20 pb-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#A8C3A0] tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-[#E67E5F]" /> 1-of-1 Archive Edition
                </span>
                <span className="text-xs font-bold text-[#2F6B4F] bg-[#2F6B4F]/10 px-2 py-0.5 rounded-md">
                  Size {product.size}
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#23313A] leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-2xl sm:text-3xl font-bold text-[#2F6B4F]">
                  ₱{parseFloat(product.price).toFixed(2)}
                </span>
                {product.original_price && parseFloat(product.original_price) > parseFloat(product.price) && (
                  <span className="text-xs text-[#23313A]/40 line-through font-semibold">
                    ₱{parseFloat(product.original_price).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Flat-Lay Sizing Grid */}
            <div className="space-y-2">
              <h3 className="text-[10px] uppercase font-bold tracking-wider text-[#A8C3A0]">
                Flat-Lay Sizing Measurements
              </h3>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/30 rounded-xl p-2.5">
                  <p className="text-[9px] text-[#A8C3A0] font-bold uppercase">Tag Size</p>
                  <p className="font-bold text-xs sm:text-sm text-[#23313A] mt-0.5">{product.size}</p>
                </div>
                <div className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/30 rounded-xl p-2.5">
                  <p className="text-[9px] text-[#A8C3A0] font-bold uppercase">Pit-To-Pit</p>
                  <p className="font-bold text-xs sm:text-sm text-[#23313A] mt-0.5">{product.chest_width || 'N/A'}</p>
                </div>
                <div className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/30 rounded-xl p-2.5">
                  <p className="text-[9px] text-[#A8C3A0] font-bold uppercase">Length</p>
                  <p className="font-bold text-xs sm:text-sm text-[#23313A] mt-0.5">{product.length || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 text-xs text-[#23313A]/80 border-t border-[#A8C3A0]/20 pt-4">
              <h3 className="text-[10px] uppercase font-bold tracking-wider text-[#A8C3A0]">
                Curator Notes & Condition
              </h3>
              <p className="leading-relaxed">
                {product.description || 'Authentic single-inventory vintage garment curated by ThriftLoop. Cleaned, measured, and verified.'}
              </p>
            </div>

            {/* Desktop Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={isSold}
                className="w-full bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-95"
              >
                {isSold ? (
                  'Sold Out'
                ) : added ? (
                  <><Check size={16} /> Added to Bag</>
                ) : (
                  <><ShoppingBag size={16} /> Add to Cart</>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenMessageSeller}
                  className="w-full bg-white border border-[#2F6B4F] text-[#2F6B4F] hover:bg-[#2F6B4F]/5 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer active:scale-95 shadow-xs"
                >
                  <MessageSquare size={14} />
                  <span>Message Seller</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="w-full bg-white border border-[#A8C3A0]/50 text-[#23313A] font-bold py-2.5 rounded-xl hover:bg-[#F6F1E8]/40 flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer active:scale-95"
                >
                  <QrCode size={14} />
                  <span>Scan QR</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Sticky Thumb Bar on Mobile Viewports */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#A8C3A0]/30 px-4 py-3 flex items-center justify-between gap-3 z-40 shadow-lg">
        <div>
          <span className="text-[10px] text-[#A8C3A0] font-bold block uppercase">1-of-1 Price</span>
          <span className="font-bold text-base text-[#2F6B4F]">₱{parseFloat(product.price).toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenMessageSeller}
            className="p-2.5 rounded-xl border border-[#2F6B4F] text-[#2F6B4F] active:scale-95 cursor-pointer"
            title="Message Seller"
          >
            <MessageSquare size={18} />
          </button>

          <button
            onClick={handleAddToCart}
            disabled={isSold}
            className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white font-bold px-6 py-2.5 rounded-xl text-xs active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            {isSold ? 'Sold' : added ? <><Check size={14} /> Added</> : <><ShoppingBag size={14} /> Add to Cart</>}
          </button>
        </div>
      </div>

      {/* Direct Seller Messaging Modal (Mobile Sheet + Desktop Modal) */}
      {showChatModal && (
        <div className="fixed inset-0 bg-[#23313A]/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-lg h-[90dvh] sm:h-[580px] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl border border-[#A8C3A0]/30 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-[#2F6B4F] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Store size={16} className="text-[#A8C3A0]" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm leading-tight">ThriftLoop Seller Inquiry</h3>
                  <p className="text-[10px] text-[#A8C3A0] truncate max-w-[200px] sm:max-w-[250px]">
                    Item: {product.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Garment Preview Bar */}
            <div className="bg-[#F6F1E8] px-3.5 py-2 border-b border-[#A8C3A0]/20 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-7 h-7 rounded-lg object-contain bg-white border border-[#A8C3A0]/30"
                />
                <span className="font-bold text-[#23313A] truncate max-w-[180px] text-[11px]">
                  {product.name}
                </span>
              </div>
              <span className="text-[10px] text-[#2F6B4F] font-bold shrink-0">
                ₱{parseFloat(product.price).toFixed(2)} ({product.size})
              </span>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-2.5 bg-[#F6F1E8]/30">
              {chatLoading ? (
                <div className="h-full flex items-center justify-center gap-2 text-xs text-[#23313A]/60">
                  <Loader2 size={16} className="animate-spin text-[#2F6B4F]" />
                  <span>Connecting to seller...</span>
                </div>
              ) : chatError ? (
                <div className="p-3 bg-[#E67E5F]/15 border border-[#E67E5F]/30 text-[#E67E5F] text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{chatError}</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[#23313A]/60 space-y-2">
                  <MessageSquare size={28} className="text-[#A8C3A0]" />
                  <p className="font-bold text-[#23313A]">No messages yet</p>
                  <p className="text-[11px] max-w-xs">
                    Ask about condition details, pit-to-pit flat lays, or custom shipping queries.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = String(m.sender_id) === String(currentUserId);
                  return (
                    <div
                      key={m.message_id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[8px] text-[#23313A]/50 mb-0.5 px-1 font-semibold">
                        {isMine ? 'You' : m.sender?.full_name || 'Seller'}
                      </span>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isMine
                            ? 'bg-[#2F6B4F] text-white rounded-tr-xs'
                            : 'bg-white text-[#23313A] border border-[#A8C3A0]/30 rounded-tl-xs'
                        }`}
                      >
                        {m.message_text}
                      </div>
                      <span className="text-[8px] text-[#23313A]/40 mt-0.5 px-1">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zero-Zoom Mobile Input Field */}
            <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 bg-white border-t border-[#A8C3A0]/20 flex gap-2 items-center shrink-0">
              <input
                type="text"
                inputMode="text"
                placeholder="Type a message to the seller..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2.5 sm:py-2 text-[16px] sm:text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-[#23313A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl border border-[#A8C3A0]/30">
            <h3 className="font-serif font-bold text-lg text-[#23313A]">Garment Archive QR</h3>
            <div className="bg-[#F6F1E8] p-3 rounded-2xl inline-block border border-[#A8C3A0]/30">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.href)}`}
                alt="Product QR"
                className="mx-auto"
              />
            </div>
            <p className="text-[11px] text-[#23313A]/70 leading-relaxed">
              Scan to open this 1-of-1 archive listing instantly on your smartphone.
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-[#2F6B4F] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#23313A] cursor-pointer active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
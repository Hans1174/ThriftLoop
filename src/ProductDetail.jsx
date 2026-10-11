import { API_URL } from './config';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingBag, QrCode, Check, Loader2, 
  MessageSquare, Send, X, AlertCircle, Store 
} from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [added, setAdded] = useState(false);

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

  useEffect(() => {
    fetch(`${API_URL}/api/products/${id}`)
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

  useEffect(() => {
    if (!showChatModal || !conversation?.conversation_id) return;

    const interval = setInterval(() => {
      fetch(`${API_URL}/api/messages/${conversation.conversation_id}`)
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
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleOpenMessageSeller = async () => {
    if (!currentUser) {
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }

    setShowChatModal(true);
    setChatLoading(true);
    setChatError('');

    try {
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: currentUser.user_id,
          product_id: product.product_id,
        }),
      });

      const convoData = await res.json();
      if (!res.ok) throw new Error(convoData.error || 'Failed to start chat thread.');

      setConversation(convoData);

      const msgRes = await fetch(`${API_URL}/api/messages/${convoData.conversation_id}`);
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

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation.conversation_id,
          sender_id: currentUser.user_id,
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
      <div className="min-h-[70vh] bg-[#FDFBF7] flex items-center justify-center gap-2 text-xs text-gray-500">
        <Loader2 className="animate-spin text-[#8C7A6B]" size={18} />
        <span>Loading garment details...</span>
      </div>
    );
  }

  if (!product || product.error) {
    return (
      <div className="min-h-[70vh] bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">Garment Not Found</h2>
        <p className="text-xs text-gray-500">This 1-of-1 vintage item may have already been sold or moved.</p>
        <Link to="/shop" className="bg-[#8C7A6B] text-white px-5 py-2.5 rounded-xl text-xs font-bold">
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] font-sans pb-20 sm:pb-16 overflow-x-hidden">
      
      {/* Breadcrumb Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#E6DFD5] text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500 truncate max-w-[230px] sm:max-w-md">
          <Link to="/" className="hover:underline shrink-0">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:underline shrink-0">Shop</Link>
          <span>/</span>
          <span className="text-[#1A1A1A] font-semibold truncate">{product.name}</span>
        </div>
        <Link to="/shop" className="flex items-center gap-1 font-bold text-[#8C7A6B] hover:text-[#23313A] shrink-0 ml-2">
          <ArrowLeft size={14} /> <span className="hidden xs:inline">Back</span>
        </Link>
      </header>

      {/* Main PDP Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
          
          {/* Responsive Gallery View */}
          <div className="w-full">
            <div className="bg-[#EFECE6] border border-[#E2DBD0] rounded-2xl h-72 sm:h-96 md:h-[440px] flex items-center justify-center overflow-hidden p-3 sm:p-4">
              <img
                src={product.image_url}
                alt={product.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-xs"
              />
            </div>
          </div>

          {/* Garment Details & Actions */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#1A1A1A] text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                  {product.condition_grade}
                </span>
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#8C7A6B]">
                  {product.category_name || 'Vintage'}
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold mt-2 text-[#1A1A1A] leading-tight">
                {product.name}
              </h1>
              <p className="text-xl sm:text-2xl font-bold text-[#E06D44] mt-1.5">
                ₱{parseFloat(product.price).toFixed(2)}
              </p>

              {/* Garment Measurements */}
              <div className="bg-[#FAF7F2] border border-[#E6DFD5] rounded-xl p-3.5 sm:p-4 my-5 sm:my-6">
                <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                  Flat-Lay Measurements
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white border border-[#E6DFD5] rounded-lg p-2">
                    <p className="text-[9px] text-gray-500 uppercase">Tag Size</p>
                    <p className="font-bold text-xs sm:text-sm">{product.size}</p>
                  </div>
                  <div className="bg-white border border-[#E6DFD5] rounded-lg p-2">
                    <p className="text-[9px] text-gray-500 uppercase">Pit-to-Pit</p>
                    <p className="font-bold text-xs sm:text-sm">{product.chest_width || 'N/A'}</p>
                  </div>
                  <div className="bg-white border border-[#E6DFD5] rounded-lg p-2">
                    <p className="text-[9px] text-gray-500 uppercase">Length</p>
                    <p className="font-bold text-xs sm:text-sm">{product.length || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                  Description
                </h3>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {product.description || 'Authentic single-inventory vintage garment curated by ThriftLoop.'}
                </p>
              </div>
            </div>

            {/* Actions Stack */}
            <div className="space-y-2.5 pt-4 border-t border-[#E6DFD5]">
              <button
                onClick={handleAddToCart}
                className="w-full bg-[#8C7A6B] hover:bg-[#786759] text-white font-bold py-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-98"
              >
                {added ? <><Check size={16} /> Added to Cart!</> : <><ShoppingBag size={16} /> Add to Cart</>}
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenMessageSeller}
                  className="w-full bg-white border border-[#2F6B4F] text-[#2F6B4F] hover:bg-[#2F6B4F]/5 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  <MessageSquare size={14} />
                  <span>Message Seller</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="w-full bg-white border border-[#8C7A6B] text-[#8C7A6B] font-bold py-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer active:scale-95"
                >
                  <QrCode size={14} />
                  <span>QR Code</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Direct Chat: Mobile Bottom Sheet + Desktop Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-[#23313A]/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-lg h-[92dvh] sm:h-[580px] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl border border-[#A8C3A0]/30 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-3.5 sm:p-4 bg-[#2F6B4F] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Store size={16} className="text-[#A8C3A0]" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm leading-tight">ThriftLoop Seller Inquiry</h3>
                  <p className="text-[10px] text-[#A8C3A0] truncate max-w-[190px] sm:max-w-[240px]">
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
            <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-2.5 bg-[#FAF7F2]">
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
                  const isMine = m.sender_id === currentUser?.user_id;
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

            {/* Chat Input Field */}
            <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 bg-white border-t border-[#A8C3A0]/20 flex gap-2 items-center shrink-0">
              <input
                type="text"
                placeholder="Type a message to the seller..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs sm:text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full text-center space-y-3 shadow-2xl">
            <h3 className="font-serif font-bold text-lg">Product QR Code</h3>
            <div className="bg-[#FAF7F2] p-3 rounded-xl inline-block border border-[#E6DFD5]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`}
                alt="Product QR"
                className="mx-auto"
              />
            </div>
            <p className="text-[11px] text-gray-500">Scan to open this 1-of-1 listing on mobile.</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-[#1A1A1A] text-white py-2 rounded-xl text-xs font-bold hover:bg-black cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
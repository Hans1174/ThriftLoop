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

  // Get logged-in user profile
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

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-poll messages every 3 seconds while chat is active
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

  // Open Direct Seller Chat
  const handleOpenMessageSeller = async () => {
    if (!currentUser) {
      window.dispatchEvent(new Event('open-login-modal'));
      return;
    }

    setShowChatModal(true);
    setChatLoading(true);
    setChatError('');

    try {
      // 1. Initialize or retrieve existing thread
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

      // 2. Fetch message history
      const msgRes = await fetch(`${API_URL}/api/messages/${convoData.conversation_id}`);
      const msgData = await msgRes.json();
      setMessages(Array.isArray(msgData) ? msgData : []);
    } catch (err) {
      setChatError(err.message || 'Could not connect to seller chat.');
    } finally {
      setChatLoading(false);
    }
  };

  // Send Direct Message
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
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="animate-spin text-[#8C7A6B]" size={20} /> Loading garment details...
      </div>
    );
  }

  if (!product || product.error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">Garment Not Found</h2>
        <p className="text-xs text-gray-500">This 1-of-1 vintage item may have already been sold or moved.</p>
        <Link to="/shop" className="bg-[#8C7A6B] text-white px-5 py-2 rounded-xl text-xs font-bold">
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] font-sans pb-16">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-[#E6DFD5]">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link to="/" className="hover:underline">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:underline">Shop</Link>
          <span>/</span>
          <span className="text-[#1A1A1A] font-semibold">{product.name}</span>
        </div>
        <Link to="/shop" className="flex items-center gap-1 text-xs font-bold hover:text-[#8C7A6B]">
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
      </header>

      {/* Main PDP Grid */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Gallery View */}
          <div className="space-y-4">
            <div className="bg-[#EFECE6] border border-[#E2DBD0] rounded-2xl h-[440px] flex items-center justify-center overflow-hidden p-4">
              <img
                src={product.image_url}
                alt={product.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>

          {/* Garment Details & Actions */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#1A1A1A] text-white text-[11px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                  {product.condition_grade}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B]">
                  {product.category_name || 'Vintage'}
                </span>
              </div>

              <h1 className="font-serif text-3xl font-bold mt-2 text-[#1A1A1A]">{product.name}</h1>
              <p className="text-2xl font-bold text-[#E06D44] mt-2">₱{parseFloat(product.price).toFixed(2)}</p>

              {/* Garment Measurements */}
              <div className="bg-[#FAF7F2] border border-[#E6DFD5] rounded-xl p-4 my-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Flat-Lay Measurements</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white border border-[#E6DFD5] rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase">Tag Size</p>
                    <p className="font-bold text-sm">{product.size}</p>
                  </div>
                  <div className="bg-white border border-[#E6DFD5] rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase">Pit-to-Pit</p>
                    <p className="font-bold text-sm">{product.chest_width || 'N/A'}</p>
                  </div>
                  <div className="bg-white border border-[#E6DFD5] rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase">Length</p>
                    <p className="font-bold text-sm">{product.length || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Garment Description */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Description</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {product.description || 'Authentic single-inventory vintage garment curated by ThriftLoop.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-6 border-t border-[#E6DFD5]">
              <button
                onClick={handleAddToCart}
                className="w-full bg-[#8C7A6B] hover:bg-[#786759] text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95"
              >
                {added ? <><Check size={18} /> Added to Cart!</> : <><ShoppingBag size={18} /> Add to Cart</>}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleOpenMessageSeller}
                  className="w-full bg-white border border-[#2F6B4F] text-[#2F6B4F] hover:bg-[#2F6B4F]/5 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  <MessageSquare size={15} /> Message Seller
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="w-full bg-white border border-[#8C7A6B] text-[#8C7A6B] font-bold py-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
                >
                  <QrCode size={15} /> View via QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Direct Buyer-to-Seller Chat Drawer / Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-[#23313A]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full flex flex-col h-[560px] shadow-2xl border border-[#A8C3A0]/30 overflow-hidden animate-in zoom-in-95">
            
            {/* Chat Modal Header */}
            <div className="p-4 bg-[#2F6B4F] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Store size={20} className="text-[#A8C3A0]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">ThriftLoop Seller Inquiry</h3>
                  <p className="text-[11px] text-[#A8C3A0] truncate max-w-[220px]">
                    Inquiring about: {product.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Garment Preview Strip */}
            <div className="bg-[#F6F1E8] px-4 py-2.5 border-b border-[#A8C3A0]/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-8 h-8 rounded-lg object-contain bg-white border border-[#A8C3A0]/30"
                />
                <div>
                  <span className="font-bold text-[#23313A] truncate block max-w-[200px] text-[11px]">
                    {product.name}
                  </span>
                  <span className="text-[10px] text-[#2F6B4F] font-bold">
                    ₱{parseFloat(product.price).toFixed(2)} ({product.size})
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-[#2F6B4F]/15 text-[#2F6B4F] font-bold px-2 py-0.5 rounded-full uppercase">
                1-of-1 Piece
              </span>
            </div>

            {/* Message Thread Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF7F2]">
              {chatLoading ? (
                <div className="h-full flex items-center justify-center gap-2 text-xs text-[#23313A]/60">
                  <Loader2 size={16} className="animate-spin text-[#2F6B4F]" />
                  <span>Connecting to seller thread...</span>
                </div>
              ) : chatError ? (
                <div className="p-3 bg-[#E67E5F]/15 border border-[#E67E5F]/30 text-[#E67E5F] text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{chatError}</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[#23313A]/60 space-y-2">
                  <MessageSquare size={32} className="text-[#A8C3A0]" />
                  <p className="font-bold text-[#23313A]">No messages yet</p>
                  <p className="text-[11px] max-w-xs">
                    Ask about condition details, styling advice, or specific measurements directly to the seller.
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
                      <span className="text-[9px] text-[#23313A]/50 mb-0.5 px-1 font-semibold">
                        {isMine ? 'You' : m.sender?.full_name || 'Seller'}
                      </span>
                      <div
                        className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-xs ${
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
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#A8C3A0]/20 flex gap-2 items-center">
              <input
                type="text"
                placeholder="Type a message to the seller..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="Send Message"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-serif font-bold text-xl">Product QR Code</h3>
            <div className="bg-[#FAF7F2] p-4 rounded-xl inline-block border border-[#E6DFD5]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.href)}`}
                alt="Product QR"
                className="mx-auto"
              />
            </div>
            <p className="text-xs text-gray-500">Scan with your phone camera to view this 1-of-1 listing on mobile.</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-[#1A1A1A] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-black cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
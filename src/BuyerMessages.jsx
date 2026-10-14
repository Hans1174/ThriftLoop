import { API_URL } from './config';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Send, ArrowLeft, Loader2, 
  Store, ExternalLink, RefreshCw, Image as ImageIcon, X, CheckCheck, Check, User
} from 'lucide-react';

const extractImageAndText = (message) => {
  if (message.image_url) {
    return { imageUrl: message.image_url, text: message.message_text };
  }
  const text = message.message_text || '';
  const match = text.match(/\[IMAGE\](.*?)\[\/IMAGE\]/);
  if (match) {
    return {
      imageUrl: match[1],
      text: text.replace(match[0], '').trim()
    };
  }
  return { imageUrl: null, text };
};

export default function BuyerMessages() {
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [enlargedImage, setEnlargedImage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('thriftloop_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const currentUserId = currentUser?.user_id || currentUser?.id;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'admin@thriftloop.com';

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      window.dispatchEvent(new Event('open-login-modal'));
    }
  }, [currentUser, navigate]);

  // Fetch threads with functional state to prevent resetting selected thread
  const fetchConversations = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API_URL}/api/messages/conversations/user/${currentUserId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
        setActiveConvo((prev) => {
          if (!prev) {
            return (data.length > 0 && window.innerWidth >= 768) ? data[0] : null;
          }
          const updated = data.find((c) => c.conversation_id === prev.conversation_id);
          return updated || prev;
        });
      }
    } catch {
      setError('Could not load conversations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const markConversationAsRead = async (convoId) => {
    if (!convoId || !currentUserId) return;
    try {
      await fetch(`${API_URL}/api/messages/conversations/${convoId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
    } catch {
      // Non-blocking
    }
  };

  const fetchMessages = async (convoId) => {
    if (!convoId) return;
    try {
      const res = await fetch(`${API_URL}/api/messages/${convoId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        markConversationAsRead(convoId);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (!activeConvo?.conversation_id) return;
    setMessagesLoading(true);
    fetchMessages(activeConvo.conversation_id);

    const interval = setInterval(() => {
      fetchMessages(activeConvo.conversation_id);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeConvo?.conversation_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 900;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setSelectedImage(base64);
        setImagePreview(base64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !selectedImage) || !activeConvo) return;

    const textToSend = inputMessage.trim();
    const imageToSend = selectedImage;

    setInputMessage('');
    setSelectedImage(null);
    setImagePreview('');
    setSending(true);

    const targetReceiverId = String(activeConvo.buyer_id) === String(currentUserId)
      ? activeConvo.seller_id
      : activeConvo.buyer_id;

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvo.conversation_id,
          sender_id: currentUserId,
          receiver_id: targetReceiverId,
          message_text: textToSend,
          image_url: imageToSend,
        }),
      });

      const newMsg = await res.json();
      if (!res.ok) throw new Error(newMsg.error || 'Failed to send message.');

      setMessages((prev) => [...prev, newMsg]);
      fetchConversations();
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (!currentUser) return null;

  // Resolve the other participant's display name and avatar
  const getThreadPartnerInfo = (convo) => {
    const isCurrentUserBuyer = String(convo.buyer_id) === String(currentUserId);
    if (isAdmin || !isCurrentUserBuyer) {
      const buyerName = convo.buyer?.full_name || convo.buyer?.email || `Buyer #${convo.buyer_id}`;
      return {
        name: buyerName,
        subtitle: convo.products?.name ? `Item: ${convo.products.name}` : convo.buyer?.email || 'Customer',
        initial: buyerName.charAt(0).toUpperCase(),
        isAdminPartner: false
      };
    }
    return {
      name: 'ThriftLoop Support',
      subtitle: convo.products?.name ? `Inquiry: ${convo.products.name}` : 'Curated Vintage Concierge',
      initial: 'TL',
      isAdminPartner: true
    };
  };

  return (
    <div className="h-[calc(100vh-65px)] w-full bg-[#F6F1E8] flex flex-col font-mono overflow-hidden">
      
      {/* Full-Bleed Messaging Workspace */}
      <div className="flex-1 w-full h-full grid grid-cols-1 md:grid-cols-12 bg-white overflow-hidden shadow-xs">
        
        {/* Left Column: Unified Threads List */}
        <div className={`md:col-span-4 lg:col-span-3 border-r border-[#A8C3A0]/30 flex flex-col bg-[#F6F1E8]/30 h-full ${
          activeConvo ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-[#A8C3A0]/20 flex items-center justify-between shrink-0 bg-white">
            <div>
              <h2 className="font-serif font-bold text-base text-[#23313A]">Inquiries</h2>
              <p className="text-[10px] text-[#A8C3A0] font-semibold">
                {isAdmin ? 'Customer Direct Messages' : 'ThriftLoop Conversations'}
              </p>
            </div>
            <button
              onClick={fetchConversations}
              className="p-1.5 rounded-lg text-[#2F6B4F] hover:bg-[#F6F1E8] transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Threads Scrollable Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#A8C3A0]/15">
            {loading && conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#23313A]/50 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-[#2F6B4F]" />
                <span>Loading threads...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#23313A]/50 space-y-2">
                <MessageSquare size={28} className="mx-auto text-[#A8C3A0]" />
                <p className="font-bold text-[#23313A]">No messages yet</p>
                <p className="text-[11px]">Direct questions asked on garment pages appear here.</p>
              </div>
            ) : (
              conversations.map((convo) => {
                const isSelected = activeConvo?.conversation_id === convo.conversation_id;
                const partner = getThreadPartnerInfo(convo);

                return (
                  <button
                    key={convo.conversation_id}
                    onClick={() => setActiveConvo(convo)}
                    className={`w-full text-left p-3.5 transition-colors flex items-center gap-3 cursor-pointer ${
                      isSelected ? 'bg-white border-l-4 border-[#2F6B4F] shadow-xs' : 'hover:bg-white/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center font-bold text-xs shrink-0 border border-[#A8C3A0]/30">
                      {partner.isAdminPartner ? <Store size={18} /> : partner.initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-serif font-bold text-sm text-[#23313A] truncate">
                          {partner.name}
                        </h4>
                        <span className="text-[9px] text-[#23313A]/40 shrink-0">
                          {new Date(convo.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#2F6B4F] font-semibold truncate mb-0.5">
                        {partner.subtitle}
                      </p>
                      <p className="text-[11px] text-[#23313A]/60 truncate">
                        {convo.last_message || 'Inquiry started'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Full-Height Chat Workspace */}
        <div className={`md:col-span-8 lg:col-span-9 flex flex-col h-full bg-[#FAF7F2] ${
          !activeConvo ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConvo ? (
            <>
              {/* Active Header */}
              {(() => {
                const partner = getThreadPartnerInfo(activeConvo);
                return (
                  <div className="p-3.5 sm:p-4 bg-white border-b border-[#A8C3A0]/20 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => setActiveConvo(null)}
                        className="md:hidden p-1.5 rounded-lg text-[#23313A] hover:bg-[#F6F1E8] shrink-0"
                        title="Back to threads"
                      >
                        <ArrowLeft size={18} />
                      </button>

                      <div className="w-10 h-10 rounded-2xl bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center font-bold text-xs shrink-0 border border-[#A8C3A0]/30">
                        {partner.isAdminPartner ? <Store size={18} /> : partner.initial}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-serif font-bold text-sm sm:text-base text-[#23313A] truncate">
                          {partner.name}
                        </h3>
                        <p className="text-[11px] text-[#A8C3A0] truncate">
                          {activeConvo.buyer?.email || 'Active Customer'}
                        </p>
                      </div>
                    </div>

                    {/* Linked Garment Pill */}
                    {activeConvo.products && (
                      <div className="flex items-center gap-2.5 bg-[#F6F1E8] px-3 py-1.5 rounded-2xl border border-[#A8C3A0]/30 shrink-0">
                        {activeConvo.products.image_url && (
                          <img
                            src={activeConvo.products.image_url}
                            alt={activeConvo.products.name}
                            className="w-7 h-7 rounded-lg object-contain bg-white border border-[#A8C3A0]/30"
                          />
                        )}
                        <div className="hidden sm:block text-right">
                          <span className="font-serif font-bold text-xs text-[#23313A] block truncate max-w-[140px]">
                            {activeConvo.products.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#2F6B4F] font-bold">
                            ₱{parseFloat(activeConvo.products.price).toFixed(2)}
                          </span>
                        </div>
                        <a
                          href={`/product/${activeConvo.product_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2F6B4F] hover:text-[#23313A] p-1"
                          title="View Product Page"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Messages History Feed with Seen Indicator */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3">
                {messagesLoading ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#23313A]/60 gap-2">
                    <Loader2 size={16} className="animate-spin text-[#2F6B4F]" />
                    <span>Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-[#23313A]/50 space-y-1">
                    <p className="font-serif font-bold text-sm text-[#23313A]">No messages yet</p>
                    <p>Start your conversation regarding sizing, condition, or shipping.</p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isMine = String(m.sender_id) === String(currentUserId);
                    const { imageUrl, text } = extractImageAndText(m);
                    const isLastFromMe = isMine && idx === messages.map((msg) => String(msg.sender_id)).lastIndexOf(String(currentUserId));

                    // Accurate Respondent Name (Never calls the buyer "Seller")
                    let senderLabel = 'Customer';
                    if (isMine) {
                      senderLabel = 'You';
                    } else if (m.sender?.role === 'admin' || m.sender?.email === 'admin@thriftloop.com') {
                      senderLabel = 'ThriftLoop Admin';
                    } else if (m.sender?.full_name) {
                      senderLabel = m.sender.full_name;
                    } else if (activeConvo.buyer?.full_name) {
                      senderLabel = activeConvo.buyer.full_name;
                    }

                    return (
                      <div
                        key={m.message_id || idx}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[9px] text-[#23313A]/50 mb-0.5 px-1 font-semibold">
                          {senderLabel}
                        </span>

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                            isMine
                              ? 'bg-[#2F6B4F] text-white rounded-tr-xs'
                              : 'bg-white text-[#23313A] border border-[#A8C3A0]/30 rounded-tl-xs'
                          }`}
                        >
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt="Attachment"
                              onClick={() => setEnlargedImage(imageUrl)}
                              className="max-h-56 rounded-xl object-contain mb-1.5 cursor-pointer hover:opacity-95 bg-black/5"
                            />
                          )}
                          {text && text !== '📷 Sent an image' && <p>{text}</p>}
                        </div>

                        {/* Timestamp & Seen Receipt */}
                        <div className="flex items-center gap-1 text-[9px] text-[#23313A]/40 mt-0.5 px-1 font-mono">
                          <span>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMine && (
                            <span className="flex items-center gap-0.5 ml-1 text-[#2F6B4F] font-bold">
                              {m.is_read ? (
                                <>
                                  <CheckCheck size={12} className="text-[#2F6B4F]" />
                                  <span>Seen</span>
                                </>
                              ) : (
                                <>
                                  <Check size={12} className="text-[#A8C3A0]" />
                                  <span className="text-[#A8C3A0]">Sent</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attached Image Preview Bar */}
              {imagePreview && (
                <div className="px-4 py-2 bg-[#F6F1E8] border-t border-[#A8C3A0]/30 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <img src={imagePreview} alt="Upload preview" className="w-10 h-10 rounded-lg object-cover border border-[#A8C3A0]/40" />
                    <span className="text-[11px] text-[#23313A] font-bold">Image ready to send</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview('');
                    }}
                    className="text-[#E67E5F] p-1 rounded-full hover:bg-white"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#A8C3A0]/20 flex gap-2 items-center shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-[#A8C3A0] hover:text-[#2F6B4F] hover:bg-[#F6F1E8] rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Attach Photo"
                >
                  <ImageIcon size={19} />
                </button>

                <input
                  type="text"
                  placeholder={isAdmin ? "Reply to customer inquiry..." : "Type a message to ThriftLoop..."}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-4 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                />

                <button
                  type="submit"
                  disabled={sending || (!inputMessage.trim() && !selectedImage)}
                  className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-xs text-[#23313A]/50 space-y-2">
              <MessageSquare size={36} className="text-[#A8C3A0]" />
              <h3 className="font-serif font-bold text-base text-[#23313A]">Select an inquiry thread</h3>
              <p className="text-[11px] max-w-xs">
                Pick a conversation from the left to read buyer questions and consult on archive pieces.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Lightbox Modal */}
      {enlargedImage && (
        <div 
          onClick={() => setEnlargedImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
            <img src={enlargedImage} alt="Enlarged" className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" />
          </div>
        </div>
      )}

    </div>
  );
}
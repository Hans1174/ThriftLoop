import { API_URL } from './config';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Send, ArrowLeft, Loader2, 
  Store, ExternalLink, RefreshCw, Image as ImageIcon, X 
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

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      window.dispatchEvent(new Event('open-login-modal'));
    }
  }, [currentUser, navigate]);

  const fetchConversations = async () => {
    if (!currentUser?.user_id) return;
    try {
      const res = await fetch(`${API_URL}/api/messages/conversations/user/${currentUser.user_id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
        if (!activeConvo && data.length > 0 && window.innerWidth >= 768) {
          setActiveConvo(data[0]);
        }
      }
    } catch (err) {
      setError('Could not load conversations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [currentUser?.user_id]);

  const fetchMessages = async (convoId) => {
    if (!convoId) return;
    try {
      const res = await fetch(`${API_URL}/api/messages/${convoId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
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
  }, [activeConvo]);

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

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvo.conversation_id,
          sender_id: currentUser.user_id,
          receiver_id: activeConvo.seller_id,
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

  return (
    <div className="min-h-[85dvh] bg-[#F6F1E8] py-3 sm:py-6 px-3 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-3">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <Link
              to="/shop"
              className="p-1.5 sm:p-2 rounded-xl bg-white border border-[#A8C3A0]/30 text-[#23313A] hover:bg-[#F6F1E8] transition-colors"
              title="Return to Shop"
            >
              <ArrowLeft size={15} />
            </Link>
            <div>
              <h1 className="font-serif text-lg sm:text-2xl font-bold text-[#23313A]">Conversations</h1>
              <p className="text-[10px] sm:text-xs text-[#23313A]/60">Your direct buyer inquiries with ThriftLoop</p>
            </div>
          </div>
          <button
            onClick={fetchConversations}
            className="p-1.5 sm:p-2 rounded-xl bg-white border border-[#A8C3A0]/30 text-[#2F6B4F] hover:bg-[#F6F1E8] transition-colors cursor-pointer"
            title="Refresh Threads"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Messaging Container */}
        <div className="bg-white border border-[#A8C3A0]/30 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 h-[calc(100dvh-175px)] min-h-[460px]">
          
          {/* Thread List */}
          <div className={`md:col-span-5 border-r border-[#A8C3A0]/20 flex flex-col bg-[#F6F1E8]/30 ${
            activeConvo ? 'hidden md:flex' : 'flex'
          }`}>
            <div className="p-3 border-b border-[#A8C3A0]/20 font-bold text-xs text-[#23313A] flex justify-between items-center">
              <span>All Threads</span>
              <span className="text-[10px] text-[#A8C3A0]">({conversations.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#A8C3A0]/15">
              {loading ? (
                <div className="p-8 text-center text-xs text-[#23313A]/50 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-[#2F6B4F]" />
                  <span>Loading threads...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#23313A]/50 space-y-2">
                  <MessageSquare size={26} className="mx-auto text-[#A8C3A0]" />
                  <p className="font-bold text-[#23313A]">No inquiries found</p>
                  <p className="text-[11px]">Click "Message Seller" on any garment page to open a thread.</p>
                  <Link
                    to="/shop"
                    className="inline-block mt-2 bg-[#2F6B4F] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-xl"
                  >
                    Explore Archive
                  </Link>
                </div>
              ) : (
                conversations.map((convo) => {
                  const isSelected = activeConvo?.conversation_id === convo.conversation_id;
                  return (
                    <button
                      key={convo.conversation_id}
                      onClick={() => setActiveConvo(convo)}
                      className={`w-full text-left p-3 transition-colors flex items-center gap-2.5 cursor-pointer ${
                        isSelected ? 'bg-white border-l-4 border-[#2F6B4F]' : 'hover:bg-white/60'
                      }`}
                    >
                      {convo.products?.image_url ? (
                        <img
                          src={convo.products.image_url}
                          alt={convo.products.name}
                          className="w-10 h-10 rounded-xl object-contain bg-white border border-[#A8C3A0]/30 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center shrink-0">
                          <Store size={18} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="font-bold text-xs text-[#23313A] truncate">
                            {convo.products?.name || 'Seller Inquiry'}
                          </h4>
                          <span className="text-[9px] text-[#23313A]/40 shrink-0">
                            {new Date(convo.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
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

          {/* Active Chat Column */}
          <div className={`md:col-span-7 flex flex-col h-full bg-[#FAF7F2] ${
            !activeConvo ? 'hidden md:flex' : 'flex'
          }`}>
            {activeConvo ? (
              <>
                {/* Active Chat Header */}
                <div className="p-3 bg-white border-b border-[#A8C3A0]/20 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setActiveConvo(null)}
                      className="md:hidden p-1.5 rounded-lg text-[#23313A] hover:bg-[#F6F1E8] shrink-0"
                      title="Back to inquiries list"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <h3 className="font-bold text-xs text-[#23313A] truncate max-w-[170px] sm:max-w-xs">
                        {activeConvo.products?.name || 'ThriftLoop Inquiry'}
                      </h3>
                      <p className="text-[10px] text-[#2F6B4F] font-semibold">
                        {activeConvo.products ? `₱${parseFloat(activeConvo.products.price).toFixed(2)}` : 'Direct Chat'}
                      </p>
                    </div>
                  </div>

                  {activeConvo.product_id && (
                    <Link
                      to={`/product/${activeConvo.product_id}`}
                      className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#2F6B4F] hover:text-[#23313A] shrink-0 px-2 py-1 bg-[#F6F1E8] rounded-lg"
                    >
                      <span>Item</span>
                      <ExternalLink size={11} />
                    </Link>
                  )}
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                  {messagesLoading ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#23313A]/60 gap-2">
                      <Loader2 size={16} className="animate-spin text-[#2F6B4F]" />
                      <span>Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-[#23313A]/50">
                      <p>Send your questions regarding this piece below.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.sender_id === currentUser.user_id;
                      const { imageUrl, text } = extractImageAndText(m);

                      return (
                        <div
                          key={m.message_id}
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[8px] text-[#23313A]/50 mb-0.5 px-1 font-semibold">
                            {isMine ? 'You' : 'Seller'}
                          </span>
                          <div
                            className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-xs ${
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
                                className="max-h-52 rounded-xl object-contain mb-1.5 cursor-pointer hover:opacity-95 bg-black/5"
                              />
                            )}
                            {text && text !== '📷 Sent an image' && <p>{text}</p>}
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

                {/* Image Upload Preview Chip */}
                {imagePreview && (
                  <div className="px-3 py-2 bg-[#F6F1E8] border-t border-[#A8C3A0]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={imagePreview} alt="Upload preview" className="w-10 h-10 rounded-lg object-cover border border-[#A8C3A0]/40" />
                      <span className="text-[11px] text-[#23313A] font-bold">Image attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview('');
                      }}
                      className="text-[#E67E5F] p-1 rounded-full hover:bg-white"
                      title="Remove image"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* Message Input Bar with Photo Picker */}
                <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-[#A8C3A0]/20 flex gap-2 items-center shrink-0">
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
                    className="p-2 text-[#A8C3A0] hover:text-[#2F6B4F] hover:bg-[#F6F1E8] rounded-xl transition-colors cursor-pointer"
                    title="Attach Photo"
                  >
                    <ImageIcon size={18} />
                  </button>

                  <input
                    type="text"
                    placeholder="Type a message to the seller..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                  />

                  <button
                    type="submit"
                    disabled={sending || (!inputMessage.trim() && !selectedImage)}
                    className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                  >
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-[#23313A]/50 space-y-2">
                <MessageSquare size={32} className="text-[#A8C3A0]" />
                <h3 className="font-bold text-[#23313A]">Select an inquiry thread</h3>
                <p className="text-[11px] max-w-xs">
                  Tap any conversation from the list to view updates or check sizing details.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Fullscreen Image Lightbox Modal */}
        {enlargedImage && (
          <div 
            onClick={() => setEnlargedImage(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div className="relative max-w-3xl max-h-[90vh]">
              <button
                onClick={() => setEnlargedImage(null)}
                className="absolute -top-10 right-0 text-white/80 hover:text-white"
              >
                <X size={24} />
              </button>
              <img src={enlargedImage} alt="Enlarged" className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
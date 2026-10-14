import { API_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Loader2, Store, User, 
  ExternalLink, RefreshCw, Image as ImageIcon, X, CheckCheck, Check 
} from 'lucide-react';

const extractImageAndText = (message) => {
  if (message.image_url && typeof message.image_url === 'string' && message.image_url.trim().length > 10) {
    const rawText = (message.message_text || '').trim();
    return {
      imageUrl: message.image_url.trim(),
      text: (rawText === '📷 Sent an image' || rawText === '[') ? '' : rawText,
    };
  }

  const text = message.message_text || '';
  const match = text.match(/[IMAGE]([\s\S]*?)\[\/IMAGE\]/);
  if (match && match[1]) {
    const extractedImg = match[1].trim();
    const cleanedText = text.replace(match[0], '').trim();
    return {
      imageUrl: extractedImg,
      text: (cleanedText === '📷 Sent an image' || cleanedText === '[') ? '' : cleanedText,
    };
  }

  if (text.startsWith('data:image/')) {
    return { imageUrl: text.trim(), text: '' };
  }

  return { imageUrl: null, text: text === '[' ? '' : text };
};

export default function AdminInbox({ currentUser }) {
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
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const adminId = currentUser?.user_id || currentUser?.id || 1;

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/messages/conversations/user/${adminId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
        setActiveConvo((prev) => {
          if (!prev) return data.length > 0 ? data[0] : null;
          const updated = data.find((c) => c.conversation_id === prev.conversation_id);
          return updated || prev;
        });
      }
    } catch {
      // Background sync
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [adminId]);

  const markConversationAsRead = async (convoId) => {
    if (!convoId) return;
    try {
      await fetch(`${API_URL}/api/messages/conversations/${convoId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: adminId }),
      });
    } catch {}
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
      console.error('Failed to load message history:', err);
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
        const maxDim = 1000;
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
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedImage(base64);
        setImagePreview(base64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSendReply = async (e) => {
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
          sender_id: adminId,
          receiver_id: activeConvo.buyer_id,
          message_text: textToSend,
          image_url: imageToSend,
        }),
      });

      const newMsg = await res.json();
      if (!res.ok) throw new Error(newMsg.error || 'Failed to send reply.');

      setMessages((prev) => [...prev, newMsg]);
      fetchConversations();
    } catch {
      // Non-blocking
    } finally {
      setSending(false);
    }
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center gap-2 text-xs text-[#23313A]/60 font-mono">
        <Loader2 size={18} className="animate-spin text-[#2F6B4F]" />
        <span>Loading messages inbox...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 h-[680px] font-mono">
      
      {/* Threads */}
      <div className="md:col-span-4 border-r border-[#A8C3A0]/20 flex flex-col bg-[#F6F1E8]/30">
        <div className="p-4 border-b border-[#A8C3A0]/20 flex items-center justify-between bg-white">
          <div>
            <h2 className="font-serif font-bold text-base text-[#23313A]">Customer Inquiries</h2>
            <p className="text-[10px] text-[#A8C3A0]">Direct threads grouped by customer</p>
          </div>
          <button 
            onClick={fetchConversations} 
            className="text-[#2F6B4F] p-1.5 rounded-lg hover:bg-[#F6F1E8] transition-colors cursor-pointer"
            title="Refresh Threads"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#A8C3A0]/15">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#23313A]/50 space-y-2">
              <MessageSquare size={24} className="mx-auto text-[#A8C3A0]" />
              <p>No customer inquiries yet.</p>
            </div>
          ) : (
            conversations.map((convo) => {
              const isSelected = activeConvo?.conversation_id === convo.conversation_id;
              const buyerName = convo.buyer?.full_name || convo.buyer?.email || `Buyer #${convo.buyer_id}`;

              return (
                <button
                  key={convo.conversation_id}
                  onClick={() => setActiveConvo(convo)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                    isSelected ? 'bg-white border-l-4 border-[#2F6B4F]' : 'hover:bg-white/60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center shrink-0 font-bold text-xs border border-[#A8C3A0]/30">
                    {buyerName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-serif font-bold text-sm text-[#23313A] truncate">
                        {buyerName}
                      </h4>
                      <span className="text-[9px] text-[#23313A]/40 shrink-0">
                        {new Date(convo.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {convo.products && (
                      <p className="text-[10px] font-semibold text-[#2F6B4F] truncate mb-0.5">
                        Piece: {convo.products.name}
                      </p>
                    )}

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

      {/* Messages */}
      <div className="md:col-span-8 flex flex-col h-full bg-[#FAF7F2]">
        {activeConvo ? (
          <>
            <div className="p-4 bg-white border-b border-[#A8C3A0]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center font-bold text-xs border border-[#A8C3A0]/30">
                  {activeConvo.buyer?.full_name?.charAt(0).toUpperCase() || 'B'}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#23313A]">
                    {activeConvo.buyer?.full_name || 'Customer'}
                  </h3>
                  <p className="text-[10px] text-[#A8C3A0]">
                    {activeConvo.buyer?.email}
                  </p>
                </div>
              </div>

              {activeConvo.products && (
                <div className="flex items-center gap-2 bg-[#F6F1E8] px-3 py-1.5 rounded-2xl border border-[#A8C3A0]/20">
                  {activeConvo.products.image_url && (
                    <img
                      src={activeConvo.products.image_url}
                      alt={activeConvo.products.name}
                      className="w-7 h-7 rounded-lg object-contain bg-white"
                    />
                  )}
                  <div className="text-[10px] text-right">
                    <span className="font-bold text-[#23313A] block truncate max-w-[130px]">
                      {activeConvo.products.name}
                    </span>
                    <span className="text-[#2F6B4F] font-bold">
                      ₱{parseFloat(activeConvo.products.price).toFixed(2)}
                    </span>
                  </div>
                  <a
                    href={`/product/${activeConvo.product_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#2F6B4F] hover:text-[#23313A] ml-1"
                    title="Open Product"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3">
              {messagesLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-[#23313A]/60 gap-2">
                  <Loader2 size={16} className="animate-spin text-[#2F6B4F]" />
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-[#23313A]/50">
                  <p>No messages exchanged in this thread yet.</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isSeller = String(m.sender_id) === String(adminId);
                  const { imageUrl, text } = extractImageAndText(m);

                  const senderLabel = isSeller 
                    ? 'You (Store Admin)' 
                    : m.sender?.full_name || activeConvo.buyer?.full_name || 'Customer';

                  return (
                    <div
                      key={m.message_id || idx}
                      className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[9px] text-[#23313A]/50 mb-0.5 px-1 font-semibold">
                        {senderLabel}
                      </span>
                      <div
                        className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isSeller
                            ? 'bg-[#2F6B4F] text-white rounded-tr-xs'
                            : 'bg-white text-[#23313A] border border-[#A8C3A0]/30 rounded-tl-xs'
                        }`}
                      >
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt="Attachment"
                            onClick={() => setEnlargedImage(imageUrl)}
                            className="max-h-64 sm:max-h-72 rounded-xl object-contain mb-1.5 cursor-pointer hover:opacity-95 bg-black/5 block"
                          />
                        )}
                        {text && <p className="break-words">{text}</p>}
                      </div>
                      <div className="flex items-center gap-1 text-[8px] text-[#23313A]/40 mt-0.5 px-1">
                        <span>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isSeller && (
                          <span className="flex items-center gap-0.5 ml-1 text-[#2F6B4F] font-bold">
                            {m.is_read ? (
                              <>
                                <CheckCheck size={11} className="text-[#2F6B4F]" />
                                <span>Seen</span>
                              </>
                            ) : (
                              <>
                                <Check size={11} className="text-[#A8C3A0]" />
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

            {imagePreview && (
              <div className="px-4 py-2 bg-[#F6F1E8] border-t border-[#A8C3A0]/30 flex items-center justify-between">
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

            {/* Input Bar without Placeholders */}
            <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-[#A8C3A0]/20 flex gap-2 items-center">
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
                title="Send Photo"
              >
                <ImageIcon size={18} />
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
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
            <h3 className="font-serif font-bold text-base text-[#23313A]">Select a buyer inquiry</h3>
            <p className="text-[11px] max-w-xs">
              Choose a customer thread from the left to consult on sizing, condition, or dispatch.
            </p>
          </div>
        )}
      </div>

      {enlargedImage && (
        <div 
          onClick={() => setEnlargedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-10 right-0 text-white"
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
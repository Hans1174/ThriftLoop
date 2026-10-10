import { API_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Loader2, Store, User, 
  ExternalLink, AlertCircle, RefreshCw 
} from 'lucide-react';

export default function AdminInbox({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const adminId = currentUser?.user_id || 1;

  // 1. Fetch all buyer conversations involving the admin
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/messages/conversations/user/${adminId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
        // Automatically select first conversation if none selected
        if (!activeConvo && data.length > 0) {
          setActiveConvo(data[0]);
        }
      }
    } catch (err) {
      setError('Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 6000);
    return () => clearInterval(interval);
  }, [adminId]);

  // 2. Fetch message logs for the selected conversation
  const fetchMessages = async (convoId) => {
    if (!convoId) return;
    try {
      const res = await fetch(`${API_URL}/api/messages/${convoId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
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
  }, [activeConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Send Admin Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConvo) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');
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
        }),
      });

      const newMsg = await res.json();
      if (!res.ok) throw new Error(newMsg.error || 'Failed to send reply.');

      setMessages((prev) => [...prev, newMsg]);
      fetchConversations();
    } catch (err) {
      setError(err.message || 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center gap-2 text-xs text-[#23313A]/60">
        <Loader2 size={18} className="animate-spin text-[#2F6B4F]" />
        <span>Loading messages inbox...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 h-[650px]">
      
      {/* Left Column: Conversation Thread List */}
      <div className="md:col-span-4 border-r border-[#A8C3A0]/20 flex flex-col bg-[#F6F1E8]/30">
        <div className="p-4 border-b border-[#A8C3A0]/20 flex items-center justify-between">
          <div>
            <h2 className="font-serif font-bold text-sm text-[#23313A]">Customer Inquiries</h2>
            <p className="text-[10px] text-[#23313A]/60">Direct buyer-to-seller threads</p>
          </div>
          <button 
            onClick={fetchConversations} 
            className="text-[#A8C3A0] hover:text-[#2F6B4F] p-1.5 rounded-lg hover:bg-[#F6F1E8] transition-colors"
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
              return (
                <button
                  key={convo.conversation_id}
                  onClick={() => setActiveConvo(convo)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                    isSelected ? 'bg-white border-l-4 border-[#2F6B4F]' : 'hover:bg-white/60'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center shrink-0">
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-bold text-xs text-[#23313A] truncate">
                        {convo.buyer?.full_name || convo.buyer?.email || `Buyer #${convo.buyer_id}`}
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

      {/* Right Column: Active Conversation Messages & Reply Box */}
      <div className="md:col-span-8 flex flex-col h-full bg-[#FAF7F2]">
        {activeConvo ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 bg-white border-b border-[#A8C3A0]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center font-bold text-xs">
                  {activeConvo.buyer?.full_name?.charAt(0) || 'B'}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#23313A]">
                    {activeConvo.buyer?.full_name || 'Buyer'}
                  </h3>
                  <p className="text-[10px] text-[#23313A]/60">
                    {activeConvo.buyer?.email}
                  </p>
                </div>
              </div>

              {/* Linked Product Preview */}
              {activeConvo.products && (
                <div className="flex items-center gap-2 bg-[#F6F1E8] px-3 py-1.5 rounded-xl border border-[#A8C3A0]/20">
                  {activeConvo.products.image_url && (
                    <img
                      src={activeConvo.products.image_url}
                      alt={activeConvo.products.name}
                      className="w-6 h-6 rounded-md object-contain bg-white"
                    />
                  )}
                  <div className="text-[10px] text-right">
                    <span className="font-bold text-[#23313A] block truncate max-w-[120px]">
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
                    title="Open Product Listing"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>

            {/* Message History Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
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
                messages.map((m) => {
                  const isSeller = m.sender_id === adminId;
                  return (
                    <div
                      key={m.message_id}
                      className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[9px] text-[#23313A]/50 mb-0.5 px-1 font-semibold">
                        {isSeller ? 'You (Seller)' : m.sender?.full_name || 'Buyer'}
                      </span>
                      <div
                        className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isSeller
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

            {/* Reply Input Bar */}
            <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-[#A8C3A0]/20 flex gap-2 items-center">
              <input
                type="text"
                placeholder="Type your reply to the buyer..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-xs text-[#23313A]/50 space-y-2">
            <MessageSquare size={36} className="text-[#A8C3A0]" />
            <h3 className="font-bold text-[#23313A]">Select an inquiry to respond</h3>
            <p className="text-[11px] max-w-xs">
              Choose a buyer thread from the list on the left to consult on sizing, condition, or shipping.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Bot, User, Bell, 
  Package, Sparkles, Loader2, Truck, CheckCircle2 
} from 'lucide-react';
import { requestNotificationPermission, showBrowserNotification } from '../utils/notification';

const API_URL = import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! I'm Loopie, your ThriftLoop vintage concierge 🌿\n\nAsk me about garment sizing, flat-lay measurements (PTP), or get instant shipment updates (e.g., 'Where is my order #4?').",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [notifGranted, setNotifGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const messagesEndRef = useRef(null);
  const previousOrderStatusesRef = useRef({});

  // Current authenticated user
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('thriftloop_user')) || {};
    } catch {
      return {};
    }
  })();

  // Auto-scroll chat window
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Request browser notification permissions
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    if (granted) {
      showBrowserNotification('ThriftLoop Alerts Enabled', {
        body: 'You will receive notifications for order dispatches and chat replies.',
      });
    }
  };

  // Background Order Logistics Poller
  useEffect(() => {
    if (!currentUser.email) return;

    const pollOrderUpdates = async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/user/${encodeURIComponent(currentUser.email)}`);
        if (!res.ok) return;
        const orders = await res.json();

        orders.forEach((ord) => {
          const prevStatus = previousOrderStatusesRef.current[ord.order_id];

          // Trigger alert on status transitions
          if (prevStatus && prevStatus !== ord.status) {
            const statusUpper = ord.status.toUpperCase();
            showBrowserNotification(`ThriftLoop Order #${ord.order_id} Update`, {
              body: `Your parcel is now ${statusUpper} via ${ord.courier}! Tracking: ${ord.tracking_number || 'In transit'}`,
              url: `/track/${ord.order_id}`,
              tag: `order-update-${ord.order_id}`,
            });

            // Append notice to chat history
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now(),
                sender: 'bot',
                text: `📦 Live Order Notice: Order #${ord.order_id} is now ${statusUpper} via ${ord.courier}. Tracking: ${ord.tracking_number}`,
              },
            ]);
          }

          previousOrderStatusesRef.current[ord.order_id] = ord.status;
        });
      } catch (err) {
        console.warn('Order status polling notice:', err);
      }
    };

    pollOrderUpdates();
    const interval = setInterval(pollOrderUpdates, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [currentUser.email]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'user', text: userMessage },
    ]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          user_id: currentUser.user_id || null,
          email: currentUser.email || null,
        }),
      });

      const data = await res.json();
      const botReply = data.reply || "I couldn't consult styling or delivery records right now.";

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: botReply },
      ]);

      // If user is working in another tab or minimized, notify them
      if (document.hidden) {
        showBrowserNotification('ThriftLoop Concierge', {
          body: botReply.length > 90 ? `${botReply.slice(0, 90)}...` : botReply,
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: 'Styling & logistics service is currently offline.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Widget Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-[#2F6B4F] hover:bg-[#23313A] text-white p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer group"
          title="Open AI Concierge & Order Assistant"
        >
          <MessageSquare size={22} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#E67E5F] rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="bg-white border border-[#A8C3A0]/40 rounded-3xl shadow-2xl w-[92vw] sm:w-[380px] h-[530px] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header Bar */}
          <div className="bg-[#2F6B4F] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm leading-none">ThriftLoop Concierge</h3>
                <span className="text-[10px] text-[#A8C3A0] font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Gemini 3.6 • Styling & Live Tracking
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!notifGranted && (
                <button
                  onClick={handleEnableNotifications}
                  className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Enable order dispatch notifications"
                >
                  <Bell size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* In-Widget Notification Opt-In Banner */}
          {!notifGranted && (
            <div className="bg-[#F6F1E8] border-b border-[#A8C3A0]/30 px-3.5 py-2 flex items-center justify-between text-[11px]">
              <span className="text-[#23313A]/80 font-medium">Receive real-time parcel notifications?</span>
              <button
                onClick={handleEnableNotifications}
                className="bg-[#2F6B4F] text-white px-2.5 py-1 rounded-md font-bold text-[10px] hover:bg-[#23313A] transition-colors cursor-pointer"
              >
                Enable
              </button>
            </div>
          )}

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F6F1E8]/25 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 items-start ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-[#2F6B4F]/15 text-[#2F6B4F] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    m.sender === 'user'
                      ? 'bg-[#2F6B4F] text-white rounded-tr-none shadow-2xs'
                      : 'bg-white border border-[#A8C3A0]/30 text-[#23313A] rounded-tl-none shadow-2xs'
                  }`}
                >
                  {m.text}
                </div>
                {m.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-[#23313A] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[#A8C3A0] text-xs font-semibold">
                <Loader2 size={13} className="animate-spin text-[#2F6B4F]" />
                <span>Consulting catalog measurements & orders...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          <div className="px-3 py-1.5 bg-white border-t border-[#A8C3A0]/20 flex gap-1.5 overflow-x-auto text-[10px]">
            <button
              onClick={() => setInput('What is the status of my order?')}
              className="bg-[#F6F1E8] hover:bg-[#A8C3A0]/30 text-[#23313A] px-2.5 py-1 rounded-full whitespace-nowrap font-medium cursor-pointer"
            >
              📦 Track my order
            </button>
            <button
              onClick={() => setInput('What tops are currently in stock?')}
              className="bg-[#F6F1E8] hover:bg-[#A8C3A0]/30 text-[#23313A] px-2.5 py-1 rounded-full whitespace-nowrap font-medium cursor-pointer"
            >
              👕 Tops available
            </button>
            <button
              onClick={() => setInput('How do I measure pit-to-pit sizing?')}
              className="bg-[#F6F1E8] hover:bg-[#A8C3A0]/30 text-[#23313A] px-2.5 py-1 rounded-full whitespace-nowrap font-medium cursor-pointer"
            >
              📏 Sizing help
            </button>
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#A8C3A0]/20 flex gap-2 items-center">
            <input
              type="text"
              placeholder="Ask about sizing or order #..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <Send size={14} />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
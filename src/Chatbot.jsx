import { API_URL } from './config';
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hi! I am your ThriftLoop AI Stylist. Ask me anything about our vintage pieces, sizing measurements, or outfit recommendations!',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // --- Drag & Dock State ---
  const [position, setPosition] = useState({
    side: 'right', // 'left' | 'right'
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 25 : 350,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragCoords, setDragCoords] = useState(null);

  const dragStartRef = useRef({ x: 0, y: 0, initialY: 0 });
  const hasMovedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Keep button within screen bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        ...prev,
        y: Math.min(Math.max(prev.y, 80), window.innerHeight - 100),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pointer event handlers for seamless touch + mouse dragging
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialY: position.y,
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (Math.hypot(deltaX, deltaY) > 5) {
      hasMovedRef.current = true;
    }

    const clampedY = Math.min(Math.max(dragStartRef.current.initialY + deltaY, 70), window.innerHeight - 80);

    setDragCoords({
      x: e.clientX,
      y: clampedY,
    });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (hasMovedRef.current) {
      // Snap to whichever edge was closer upon release
      const snapSide = e.clientX < window.innerWidth / 2 ? 'left' : 'right';
      const finalY = dragCoords ? dragCoords.y : position.y;

      setPosition({
        side: snapSide,
        y: finalY,
      });
      setDragCoords(null);
    } else {
      // Clean click without dragging toggles the chat drawer
      setIsOpen((prev) => !prev);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
      } else if (data.error) {
        setMessages((prev) => [...prev, { sender: 'bot', text: `Error: ${data.error}` }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'Sorry, I could not retrieve vintage details at the moment.' },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Unable to reach backend server. Please verify node server.js is running.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Compute live positioning style for the compact arrow trigger
  const triggerStyle = dragCoords
    ? {
        left: `${dragCoords.x - 18}px`,
        top: `${dragCoords.y}px`,
        transition: 'none',
      }
    : {
        top: `${position.y}px`,
        left: position.side === 'left' ? '0px' : 'auto',
        right: position.side === 'right' ? '0px' : 'auto',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      };

  return (
    <>
      {/* 1. Compact Draggable Arrow Tab */}
      {!isOpen && (
        <div
          style={triggerStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`fixed z-50 select-none touch-none cursor-grab active:cursor-grabbing flex items-center shadow-xl ${
            isDragging ? 'scale-110 opacity-90' : 'opacity-100 hover:scale-105'
          }`}
          title="Open AI Stylist"
        >
          <div
            className={`bg-[#2F6B4F] hover:bg-[#23313A] text-white flex items-center justify-center py-3 px-2 border border-[#A8C3A0]/40 transition-all shadow-md ${
              position.side === 'left'
                ? 'rounded-r-xl border-l-0 pl-2 pr-2.5'
                : 'rounded-l-xl border-r-0 pr-2 pl-2.5'
            }`}
          >
            {position.side === 'left' ? (
              <ChevronRight size={19} className="text-white" />
            ) : (
              <ChevronLeft size={19} className="text-white" />
            )}
          </div>
        </div>
      )}

      {/* 2. Animated Chat Drawer */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-out origin-bottom ${
          position.side === 'left' ? 'left-4 sm:left-8' : 'right-4 sm:right-8'
        } bottom-6 sm:bottom-10 ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-8 pointer-events-none'
        }`}
      >
        <div className="bg-white border border-[#A8C3A0]/40 rounded-3xl shadow-2xl w-[90vw] max-w-[370px] sm:w-96 flex flex-col h-[520px] max-h-[80vh] overflow-hidden">
          
          {/* Header */}
          <div className="bg-[#2F6B4F] text-white p-4 flex items-center justify-between border-b border-[#A8C3A0]/20">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg text-[#F6F1E8]">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm leading-tight">AI Stylist</h3>
                <p className="text-[10px] text-[#A8C3A0] font-medium">Boutique Wardrobe Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Stylist"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-[#F6F1E8]/30">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl ${
                    m.sender === 'user'
                      ? 'bg-[#2F6B4F] text-white rounded-br-none shadow-xs'
                      : 'bg-white border border-[#A8C3A0]/30 text-[#23313A] rounded-bl-none shadow-xs leading-relaxed whitespace-pre-wrap'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#A8C3A0]/30 p-3 rounded-2xl rounded-bl-none shadow-xs flex items-center gap-2 text-[#A8C3A0] font-bold">
                  <Loader2 size={14} className="animate-spin text-[#2F6B4F]" />
                  <span>Checking boutique inventory...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#A8C3A0]/20 flex gap-2">
            <input
              type="text"
              placeholder="Ask for fits, sizing, or era details..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2 text-xs text-[#23313A] placeholder-[#A8C3A0] focus:outline-none focus:border-[#2F6B4F] focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-[#E67E5F] hover:bg-[#d67053] disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
              title="Send Message"
            >
              <Send size={14} />
            </button>
          </form>

        </div>
      </div>
    </>
  );
}
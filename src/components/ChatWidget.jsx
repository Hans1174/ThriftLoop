import { API_URL } from '../config';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Send, Loader2 } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hi! I'm Loopie. Ask me about sizing, flat-lay measurements (PTP), or order status.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Screen-edge docking & vertical drag state
  const [position, setPosition] = useState({
    side: 'right', // 'left' | 'right'
    y: typeof window !== 'undefined' ? Math.max(100, window.innerHeight * 0.55) : 350,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialY: 0 });
  const hasMovedRef = useRef(false);

  const storedUser = localStorage.getItem('thriftloop_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        ...prev,
        y: Math.min(Math.max(prev.y, 70), window.innerHeight - 90),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

    const clampedY = Math.min(
      Math.max(dragStartRef.current.initialY + deltaY, 70),
      window.innerHeight - 90
    );

    setPosition((prev) => ({
      ...prev,
      y: clampedY,
    }));
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (hasMovedRef.current) {
      // Snap to whichever side is closer upon release
      const snapSide = e.clientX < window.innerWidth / 2 ? 'left' : 'right';
      setPosition((prev) => ({
        ...prev,
        side: snapSide,
      }));
    } else {
      // Clean tap/click toggles the chat window
      setIsOpen((prev) => !prev);
    }
  };

  const handleSend = async (customMessage) => {
    const messageToSend = (typeof customMessage === 'string' ? customMessage : input).trim();
    if (!messageToSend || loading) return;

    setMessages((prev) => [...prev, { sender: 'user', text: messageToSend }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          user_id: currentUser?.user_id,
          email: currentUser?.email,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: data.reply || 'Could not retrieve details right now.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Loopie is currently offline. Please try again shortly.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. Movable Side-Docked Arrow Tab (0px Gap) */}
      {!isOpen && (
        <div
          style={{
            top: `${position.y}px`,
            left: position.side === 'left' ? '0px' : 'auto',
            right: position.side === 'right' ? '0px' : 'auto',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`fixed z-50 select-none touch-none cursor-grab active:cursor-grabbing flex items-center transition-transform duration-150 ${
            isDragging ? 'scale-105 opacity-90' : 'hover:scale-105'
          }`}
          title="Open Loopie"
        >
          <div
            className={`bg-[#2F6B4F] hover:bg-[#23313A] text-white flex items-center justify-center py-3.5 px-2 border border-[#A8C3A0]/40 shadow-xl transition-colors ${
              position.side === 'left'
                ? 'rounded-r-xl border-l-0 pl-2 pr-2.5'
                : 'rounded-l-xl border-r-0 pr-2 pl-2.5'
            }`}
          >
            {position.side === 'left' ? (
              <ChevronRight size={18} className="text-white" />
            ) : (
              <ChevronLeft size={18} className="text-white" />
            )}
          </div>
        </div>
      )}

      {/* 2. Responsive Chat Drawer */}
      {isOpen && (
        <div
          className={`fixed z-50 bottom-3 sm:bottom-5 ${
            position.side === 'left' ? 'left-2 sm:left-6' : 'right-2 sm:right-6'
          } w-[94vw] sm:w-[370px] max-w-[390px] h-[86dvh] sm:h-[520px] max-h-[580px] bg-white rounded-3xl shadow-2xl border border-[#A8C3A0]/40 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="bg-[#2F6B4F] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#A8C3A0]/20 shrink-0">
            <h3 className="font-serif font-bold text-base tracking-tight leading-tight">Loopie</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-2.5 text-xs bg-[#FAF7F2]">
            {messages.map((m, idx) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-[#2F6B4F] text-white rounded-br-xs'
                        : 'bg-white border border-[#A8C3A0]/30 text-[#23313A] rounded-bl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#A8C3A0]/30 px-3 py-2 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-2 text-[#23313A]/60">
                  <Loader2 size={13} className="animate-spin text-[#2F6B4F]" />
                  <span>Loopie is checking records...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Action Chips */}
          <div className="px-3 py-2 bg-white border-t border-[#A8C3A0]/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => handleSend('What is the status of my order?')}
              className="bg-[#F6F1E8] hover:bg-[#FAF7F2] text-[#23313A] text-[11px] font-bold px-3 py-1 rounded-full border border-[#A8C3A0]/30 whitespace-nowrap cursor-pointer transition-colors"
            >
              Track order
            </button>
            <button
              type="button"
              onClick={() => handleSend('What tops are currently available?')}
              className="bg-[#F6F1E8] hover:bg-[#FAF7F2] text-[#23313A] text-[11px] font-bold px-3 py-1 rounded-full border border-[#A8C3A0]/30 whitespace-nowrap cursor-pointer transition-colors"
            >
              Available tops
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do pit-to-pit (PTP) measurements work?')}
              className="bg-[#F6F1E8] hover:bg-[#FAF7F2] text-[#23313A] text-[11px] font-bold px-3 py-1 rounded-full border border-[#A8C3A0]/30 whitespace-nowrap cursor-pointer transition-colors"
            >
              Sizing guide
            </button>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 sm:p-3 bg-white border-t border-[#A8C3A0]/20 flex gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask Loopie..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2 text-base sm:text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F] focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors shadow-xs cursor-pointer"
              title="Send"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
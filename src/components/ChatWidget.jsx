import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, X, Send, Package, Shirt, 
  Ruler, Loader2, User, GripVertical 
} from 'lucide-react';
import { API_URL } from '../config';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hi! I'm Loopie. Ask me about garment sizing, flat-lay measurements (PTP), or order status.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Movable button positioning (Y-axis clamped to screen)
  const [posY, setPosY] = useState(() => Math.max(120, window.innerHeight * 0.65));
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const initialPosY = useRef(0);
  const hasMoved = useRef(false);
  const messagesEndRef = useRef(null);

  const storedUser = localStorage.getItem('thriftloop_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleResize = () => {
      setPosY((prev) => Math.min(Math.max(80, prev), window.innerHeight - 90));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Drag Event Handlers (Mouse & Touch) ---
  const handleDragStart = (clientY) => {
    setIsDragging(true);
    hasMoved.current = false;
    dragStartY.current = clientY;
    initialPosY.current = posY;
  };

  const handleDragMove = (clientY) => {
    if (!isDragging) return;
    const deltaY = clientY - dragStartY.current;
    if (Math.abs(deltaY) > 5) {
      hasMoved.current = true;
    }
    const newY = initialPosY.current + deltaY;
    const clampedY = Math.min(Math.max(80, newY), window.innerHeight - 90);
    setPosY(clampedY);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (isDragging) handleDragMove(e.clientY);
    };
    const onMouseUp = () => {
      if (isDragging) handleDragEnd();
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const onTouchMove = (e) => {
      if (isDragging && e.touches[0]) handleDragMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      if (isDragging) handleDragEnd();
    };

    if (isDragging) {
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging]);

  const handleButtonClick = () => {
    if (!hasMoved.current) {
      setIsOpen(!isOpen);
    }
  };

  const handleSend = async (messageToSend) => {
    const text = (messageToSend || input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user_id: currentUser?.user_id,
          email: currentUser?.email,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: data.reply || 'I could not retrieve details at this time.' },
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
      {/* 1. Movable Side-Docked Button */}
      {!isOpen && (
        <div
          style={{ top: `${posY}px` }}
          className="fixed right-0 z-50 flex items-center select-none touch-none"
        >
          <div
            onMouseDown={(e) => handleDragStart(e.clientY)}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
            onClick={handleButtonClick}
            className="flex items-center gap-1.5 bg-[#2F6B4F] hover:bg-[#23313A] text-white py-2.5 pl-2.5 pr-3.5 rounded-l-2xl shadow-xl border-l border-t border-b border-[#A8C3A0]/40 cursor-grab active:cursor-grabbing transition-transform active:scale-95"
            title="Drag to reposition or click to open"
          >
            <GripVertical size={13} className="text-white/40 -mr-0.5" />
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
              <Bot size={17} className="text-white" />
            </div>
            <span className="text-xs font-bold hidden sm:inline">Loopie</span>
          </div>
        </div>
      )}

      {/* 2. Refined Chat Window */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 w-[94vw] sm:w-[380px] max-w-[400px] h-[85dvh] sm:h-[540px] max-h-[600px] bg-white rounded-3xl shadow-2xl border border-[#A8C3A0]/40 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Clean Header: Just Loopie + Status + Close */}
          <div className="bg-[#2F6B4F] text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base leading-tight">Loopie</h3>
                <p className="text-[11px] text-[#A8C3A0] flex items-center gap-1.5 mt-0.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A8C3A0] animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF7F2]">
            {messages.map((m, idx) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={idx}
                  className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center shrink-0 mb-1">
                      <Bot size={15} />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-[#2F6B4F] text-white rounded-br-xs'
                        : 'bg-white text-[#23313A] border border-[#A8C3A0]/30 rounded-bl-xs'
                    }`}
                  >
                    {m.text}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-[#23313A] text-white flex items-center justify-center shrink-0 mb-1">
                      <User size={13} />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#23313A]/60 p-2">
                <Loader2 size={15} className="animate-spin text-[#2F6B4F]" />
                <span className="text-[11px]">Loopie is checking archive records...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="px-3 py-2 bg-white border-t border-[#A8C3A0]/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => handleSend('What is the status of my order?')}
              className="flex items-center gap-1 bg-[#F6F1E8] hover:bg-[#FAF7F2] text-[#23313A] text-[11px] font-bold px-3 py-1 rounded-full border border-[#A8C3A0]/30 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Package size={12} className="text-[#2F6B4F]" />
              <span>Track order</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend('What tops are currently available?')}
              className="flex items-center gap-1 bg-[#F6F1E8] hover:bg-[#FAF7F2] text-[#23313A] text-[11px] font-bold px-3 py-1 rounded-full border border-[#A8C3A0]/30 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Shirt size={12} className="text-[#2F6B4F]" />
              <span>Available tops</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do pit-to-pit (PTP) measurements work?')}
              className="flex items-center gap-1 bg-[#F6F1E8] hover:bg-[#FAF7F2] text-[#23313A] text-[11px] font-bold px-3 py-1 rounded-full border border-[#A8C3A0]/30 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Ruler size={12} className="text-[#2F6B4F]" />
              <span>Sizing guide</span>
            </button>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-[#A8C3A0]/20 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask Loopie..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-full px-4 py-2 text-xs text-[#23313A] focus:outline-none focus:border-[#2F6B4F] focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white p-2.5 rounded-full transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
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
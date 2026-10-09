import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! Looking for something specific like vintage denim, jackets, or graphic tees?' }
  ]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');

    // Simulated chatbot response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: `I found items matching "${userText}". Check our Shop page to inspect flat-lay measurements!` }
      ]);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#1A1A1A] hover:bg-[#8C7A6B] text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 font-semibold text-sm transition-all transform hover:scale-105"
        >
          <MessageSquare size={18} /> Chat with us!
        </button>
      ) : (
        <div className="w-80 sm:w-96 bg-white border border-[#E6DFD5] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[460px]">
          {/* Header */}
          <div className="bg-[#1A1A1A] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-[#A39284]" />
              <span className="font-bold text-sm">ThriftLoop Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF7F2]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#8C7A6B] text-white'
                      : 'bg-[#EFECE6] text-[#1A1A1A] border border-[#E2DBD0]'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#E6DFD5] flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-[#FAF7F2] border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#8C7A6B]"
            />
            <button
              type="submit"
              className="bg-[#1A1A1A] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#8C7A6B] flex items-center justify-center transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
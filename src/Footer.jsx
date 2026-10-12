import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const TELEGRAM_URL = import.meta.env.VITE_TELEGRAM_CHANNEL_URL || 'https://t.me/thriftdrops_bot';

export default function Footer() {
  const location = useLocation();

  // Automatically hide on login & register views
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <footer className="bg-white border-t border-[#A8C3A0]/30 py-5 sm:py-4 px-4 sm:px-8 mt-auto transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3.5 sm:gap-4">
        
        {/* Center Links (Ordered first on mobile for quick thumb access) */}
        <div className="flex items-center gap-5 sm:gap-4 text-xs sm:text-sm font-medium text-[#23313A] order-1 md:order-2">
          <Link to="/about" className="hover:text-[#2F6B4F] transition-colors py-1">
            About Us
          </Link>
          <span className="text-[#A8C3A0] select-none text-xs">•</span>
          <Link to="/contact" className="hover:text-[#2F6B4F] transition-colors py-1">
            Contact
          </Link>
        </div>

        {/* Telegram Drop Community Channel Button */}
        <div className="flex items-center order-2 md:order-3">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Join ThriftLoop Drops on Telegram"
            className="inline-flex items-center gap-2 px-4 py-2 sm:py-1.5 rounded-full bg-[#F6F1E8]/70 border border-[#A8C3A0]/40 text-[#2F6B4F] hover:bg-[#2F6B4F] hover:text-white hover:border-[#2F6B4F] transition-all text-xs font-bold shadow-xs active:scale-95 cursor-pointer min-h-[40px] sm:min-h-[36px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0"
            >
              <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.675c.46 0 .663-.211.921-.46l2.211-2.15 4.6 3.398c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.417z" />
            </svg>
            <span>VIP Drops Channel</span>
          </a>
        </div>

        {/* Copyright Text (Ordered last on mobile, aligned left on desktop) */}
        <div className="flex items-center order-3 md:order-1 text-center md:text-left">
          <p className="text-[11px] sm:text-xs font-medium text-[#23313A]/60">
            Copyright © 2026 ThriftLoop. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
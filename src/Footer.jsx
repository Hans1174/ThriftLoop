import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();

  // Automatically hide on login & register views
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <footer className="bg-white border-t border-[#A8C3A0]/30 py-4 px-6 sm:px-8 mt-auto transition-colors">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-4">
        
        {/* Left: Copyright Text */}
        <div className="flex justify-center md:justify-start items-center">
          <p className="text-xs font-medium text-[#23313A]/70">
            Copyright© 2026 ThriftLoop. All rights reserved.
          </p>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex justify-center items-center gap-4 text-sm text-[#23313A]">
          <Link to="/about" className="hover:text-[#2F6B4F] transition-colors">
            About Us
          </Link>
          <span className="text-[#A8C3A0] select-none text-xs">•</span>
          <Link to="/contact" className="hover:text-[#2F6B4F] transition-colors">
            Contact
          </Link>
        </div>

        {/* Right: Social Media Icons */}
        <div className="flex justify-center md:justify-end items-center gap-3">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Facebook"
            className="w-9 h-9 rounded-full bg-[#F6F1E8]/60 border border-[#A8C3A0]/40 flex items-center justify-center text-[#2F6B4F] hover:bg-[#2F6B4F] hover:text-white hover:border-[#2F6B4F] transition-all shadow-xs cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
            </svg>
          </a>

          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            className="w-9 h-9 rounded-full bg-[#F6F1E8]/60 border border-[#A8C3A0]/40 flex items-center justify-center text-[#2F6B4F] hover:bg-[#2F6B4F] hover:text-white hover:border-[#2F6B4F] transition-all shadow-xs cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
        </div>

      </div>
    </footer>
  );
}
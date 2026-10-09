import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CartProvider } from './context/CartContext';

import Navbar from './Navbar';
import Footer from './Footer';
import Landing from './Landing';
import Shop from './Shop';
import ProductDetail from './ProductDetail';
import Cart from './Cart';
import Checkout from './Checkout';
import OrderConfirmation from './OrderConfirmation';
import TrackOrder from './TrackOrder';
import MyAccount from './MyAccount';
import Register from './Register';
import AdminDashboard from './AdminDashboard';
import AdminRoute from './AdminRoute';
import Chatbot from './Chatbot';
import MyOrders from './MyOrders';
import Login from './Login';

const GOOGLE_CLIENT_ID = '1089526724617-1e8fas2jq3noffeigk0kh5v7gfsids1f.apps.googleusercontent.com';

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Global listener: allows any component to trigger the login modal
  useEffect(() => {
    const handleOpenLogin = () => setIsLoginOpen(true);
    window.addEventListener('open-login-modal', handleOpenLogin);
    return () => window.removeEventListener('open-login-modal', handleOpenLogin);
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <CartProvider>
        <Router>
          <div className="min-h-screen flex flex-col justify-between bg-[#F6F1E8]">
            {/* Global Persistent Header */}
            <Navbar onOpenLogin={() => setIsLoginOpen(true)} />

            {/* Main Application Views */}
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<MyOrders />} />
                <Route path="/confirmation" element={<OrderConfirmation />} />
                <Route path="/order-success" element={<OrderConfirmation />} />
                <Route path="/track" element={<TrackOrder />} />
                <Route path="/track/:id" element={<TrackOrder />} />
                <Route path="/account" element={<MyAccount />} />
                <Route path="/register" element={<Register />} />

                {/* Redirect any legacy /login visits to home and open the modal */}
                <Route
                  path="/login"
                  element={
                    <Navigate
                      to="/"
                      replace
                      state={{ triggerLogin: true }}
                    />
                  }
                />

                {/* Protected Admin Route */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
              </Routes>
            </div>

            {/* Global Persistent Footer */}
            <Footer />

            {/* Global AI Stylist */}
            <Chatbot />

            {/* Global Interactive Login Modal */}
            <Login
              isOpen={isLoginOpen}
              onClose={() => setIsLoginOpen(false)}
              onLoginSuccess={() => {
                setIsLoginOpen(false);
                window.location.reload();
              }}
            />
          </div>
        </Router>
      </CartProvider>
    </GoogleOAuthProvider>
  );
}
import { API_URL } from './config';
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
import Confirmation from './Confirmation';
import TrackOrder from './TrackOrder';
import MyAccount from './MyAccount';
import Register from './Register';
import AdminDashboard from './AdminDashboard';
import AdminRoute from './AdminRoute';
import MyOrders from './MyOrders';
import Login from './Login';
import ChatWidget from './components/ChatWidget';
import ResetPassword from './ResetPassword';
import BuyerMessages from './BuyerMessages';

const GOOGLE_CLIENT_ID = '1089526724617-1e8fas2jq3noffeigk0kh5v7gfsids1f.apps.googleusercontent.com';

// Route Guard: Restricts admins exclusively to /admin and prevents them from shopping or checking out
function CustomerRoute({ children }) {
  const storedUser = localStorage.getItem('thriftloop_user');
  let user = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  if (user?.role === 'admin' || user?.email === 'admin@thriftloop.com') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

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
                {/* Storefront & Purchasing Routes Protected from Admin Accounts */}
                <Route
                  path="/"
                  element={
                    <CustomerRoute>
                      <Landing />
                    </CustomerRoute>
                  }
                />
                <Route
                  path="/shop"
                  element={
                    <CustomerRoute>
                      <Shop />
                    </CustomerRoute>
                  }
                />
                <Route
                  path="/product/:id"
                  element={
                    <CustomerRoute>
                      <ProductDetail />
                    </CustomerRoute>
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <CustomerRoute>
                      <Cart />
                    </CustomerRoute>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <CustomerRoute>
                      <Checkout />
                    </CustomerRoute>
                  }
                />

                {/* Account & Tracking Routes */}
                <Route path="/orders" element={<MyOrders />} />
                <Route path="/confirmation" element={<Confirmation />} />
                <Route path="/order-success" element={<Confirmation />} />
                <Route path="/track" element={<TrackOrder />} />
                <Route path="/track/:id" element={<TrackOrder />} />
                <Route path="/account" element={<MyAccount />} />
                <Route
                  path="/register"
                  element={
                    <CustomerRoute>
                      <Register />
                    </CustomerRoute>
                  }
                />

                {/* Direct Buyer-to-Seller Conversations */}
                <Route path="/messages" element={<BuyerMessages />} />

                {/* Password Recovery Routes */}
                <Route path="/forgot-password" element={<ResetPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Legacy /login redirect */}
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

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>

            {/* Global Persistent Footer */}
            <Footer />

            {/* AI Concierge (Loopie) Side Widget */}
            <ChatWidget />

            {/* Global Interactive Login Modal with Role-Based Redirection */}
            <Login
              isOpen={isLoginOpen}
              onClose={() => setIsLoginOpen(false)}
              onLoginSuccess={() => {
                setIsLoginOpen(false);
                try {
                  const storedUser = localStorage.getItem('thriftloop_user');
                  const user = storedUser ? JSON.parse(storedUser) : null;
                  if (user?.role === 'admin' || user?.email === 'admin@thriftloop.com') {
                    window.location.href = '/admin';
                    return;
                  }
                } catch {
                  // Fall through to regular reload
                }
                window.location.reload();
              }}
            />
          </div>
        </Router>
      </CartProvider>
    </GoogleOAuthProvider>
  );
}
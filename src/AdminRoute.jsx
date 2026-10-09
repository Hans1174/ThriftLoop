import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const location = useLocation();
  const storedUser = localStorage.getItem('thriftloop_user');

  let user = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (e) {
    user = null;
  }

  // If not logged in, redirect to login page
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, message: 'Please log in with administrator credentials.' }}
        replace
      />
    );
  }

  // If logged in but NEITHER an admin role NOR the specific admin email, bounce to storefront
  if (user.role !== 'admin' && user.email !== 'admin@thriftloop.com') {
    return <Navigate to="/shop" replace />;
  }

  return children;
}
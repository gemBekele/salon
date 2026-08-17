import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../lib/AppContext';

export function AuthGuard() {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

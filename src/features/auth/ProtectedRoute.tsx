import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const currentUserId = useAuthStore((state) => state.currentUserId);
  const openAuth = useAuthStore((state) => state.openAuth);
  const destination = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (!currentUserId) openAuth("login", destination);
  }, [currentUserId, destination, openAuth]);

  if (!currentUserId) return <Navigate to="/" replace />;
  return children;
};


import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useCurrentUser } from "../../features/auth/hooks/useCurrentUser";

export default function ProtectedRoute() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  // لو مفيش توكن أصلاً
  if (!token) return <Navigate to="/login" replace />;

  // نجيب بيانات المستخدم
  const { isLoading, isError } = useCurrentUser({ enabled: !!token });

  if (isLoading) {
    return (
      <div
        style={{
          height: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        loading
      </div>
    );
  }

  if (isError) return <Navigate to="/login" replace />;

  return <Outlet />;
}

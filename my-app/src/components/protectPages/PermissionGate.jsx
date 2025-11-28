// src/components/protectPages/PermissionGate.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import { useGetUserQuery } from "../../services/userApi";

function LoadingFullScreen() {
  return (
    <div style={{ height: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </div>
  );
}

function NoAccess() {
  return (
    <div style={{ height: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h2> ليست لديك صلاحية للوصول لهذه الصفحة </h2>
    </div>
  );
}

/**
 * props:
 * - children: ReactNode
 * - requireAdmin?: boolean
 * - all?: string[]   // لازم كل المفاتيح تكون true
 * - any?: string[]   // يكفي أي مفتاح منهم يكون true
 * - redirectTo?: string // لو مش مسموح، نعمل Navigate بدل رسالة
 */
export default function PermissionGate({ children, requireAdmin = false, all = [], any = [], redirectTo = "" }) {
  const { data: user, isLoading, isError } = useGetUserQuery();

  if (isLoading) return <LoadingFullScreen />;
  if (isError || !user) return <Navigate to="/login" replace />;

  // admin?
  if (requireAdmin && user?.username !== "admin") {
    return redirectTo ? <Navigate to={redirectTo} replace /> : <NoAccess />;
  }

  // all flags
  if (all.length > 0) {
    const okAll = all.every((key) => Boolean(user?.[key]));
    if (!okAll) return redirectTo ? <Navigate to={redirectTo} replace /> : <NoAccess />;
  }

  // any flags
  if (any.length > 0) {
    const okAny = any.some((key) => Boolean(user?.[key]));
    if (!okAny) return redirectTo ? <Navigate to={redirectTo} replace /> : <NoAccess />;
  }

  return <>{children}</>;
}

// src/route/guards/PermissionGate.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import { useGetUserQuery } from "../../services/userApi";

function Loading() {
  return (
    <div style={{ height: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </div>
  );
}

function NoAccess() {
  return (
    <div style={{ height: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h2>ليست لديك صلاحية للوصول لهذه الصفحة</h2>
    </div>
  );
}

/**
 * props:
 * - children
 * - requireAdmin?: boolean
 * - all?: string[]   (كلهم لازم true)
 * - any?: string[]   (يكفي واحد true)
 * - redirectTo?: string  (اختياري)
 */
export default function PermissionGate({
  children,
  requireAdmin = false,
  all = [],
  any = [],
  redirectTo = "",
}) {
  const { data: user, isLoading, isError } = useGetUserQuery();

  if (isLoading) return <Loading />;
  if (isError || !user) return <Navigate to="/login" replace />;

  // ✅ لو المستخدم admin، يسمح له بكل شيء مهما كانت الشروط
  if (user?.username === "admin") {
    return <>{children}</>;
  }

  // لو الصفحة مخصوص للـ admin فقط، والباقيين لا
  if (requireAdmin && user?.username !== "admin") {
    return redirectTo ? <Navigate to={redirectTo} replace /> : <NoAccess />;
  }

  // all => لازم كل المفاتيح true
  if (all.length > 0) {
    const okAll = all.every((k) => Boolean(user?.[k]));
    if (!okAll) return redirectTo ? <Navigate to={redirectTo} replace /> : <NoAccess />;
  }

  // any => يكفي واحدة true
  if (any.length > 0) {
    const okAny = any.some((k) => Boolean(user?.[k]));
    if (!okAny) return redirectTo ? <Navigate to={redirectTo} replace /> : <NoAccess />;
  }

  return <>{children}</>;
}

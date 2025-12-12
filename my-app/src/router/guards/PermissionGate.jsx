import React from "react";
import { Navigate } from "react-router-dom";
// import CircularProgress from "@mui/material/CircularProgress";
import { useCurrentUser } from "../../features/auth/hooks/useCurrentUser";

function Loading() {
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

function NoAccess() {
  return (
    <div
      style={{
        height: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
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
  const { user, isLoading, isError } = useCurrentUser();

  if (isLoading) return <Loading />;
  if (isError || !user) return <Navigate to="/login" replace />;

  // admin يقدر على كله
  if (user?.username === "admin") {
    return <>{children}</>;
  }

  if (requireAdmin && user?.username !== "admin") {
    return redirectTo ? <Navigate to={redirectTo} replace /> : <NoAccess />;
  }

  if (all.length > 0) {
    const okAll = all.every((k) => Boolean(user?.[k]));
    if (!okAll)
      return redirectTo ? <Navigate to={redirectTo} replace /> : <NoAccess />;
  }

  if (any.length > 0) {
    const okAny = any.some((k) => Boolean(user?.[k]));
    if (!okAny)
      return redirectTo ? <Navigate to={redirectTo} replace /> : <NoAccess />;
  }

  return <>{children}</>;
}

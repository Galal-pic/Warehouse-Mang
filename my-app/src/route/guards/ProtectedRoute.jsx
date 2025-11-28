// src/route/guards/ProtectedRoute.jsx
import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import { useGetUserQuery } from "../../services/userApi";

export default function ProtectedRoute() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const { isLoading, isError } = useGetUserQuery(undefined, { skip: !token });

  if (!token) return <Navigate to="/login" replace />;

  if (isLoading) {
    return (
      <div style={{ height: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </div>
    );
  }

  if (isError) return <Navigate to="/login" replace />;
  return <Outlet />;
}

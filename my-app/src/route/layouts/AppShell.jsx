// src/route/layouts/AppShell.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../../components/header/Header";

export default function AppShell() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

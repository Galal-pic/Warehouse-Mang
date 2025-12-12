import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <main className="pt-[60px] px-4 md:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

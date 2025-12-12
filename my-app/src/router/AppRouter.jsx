// src/router/AppRouter.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layout/MainLayout";
import ProtectedRoute from "./guards/ProtectedRoute";
import PermissionGate from "./guards/PermissionGate";

// صفحات عامة
import LoginPage from "../features/auth/pages/LoginPage";

// صفحات أدمن / features
import UsersPage from "../features/users/pages/UsersPage";
import RegisterPage from "../features/auth/pages/RegisterPage";

import CreateInvoicePage from "../features/invoices/pages/CreateInvoicePage";
import ManageInvoicesPage from "../features/manageInvoices/pages/ManageInvoicesPage";
import ItemsPage from "../features/items/pages/ItemsPage";
import MachinesPage from "../features/machines/pages/MachinesPage";
import MechanismsPage from "../features/mechanisms/pages/MechanismsPage";
import SuppliersPage from "../features/suppliers/pages/SuppliersPage";

import ReportsLayout from "../features/reports/pages/ReportsLayout";
import ReportsFiltersPage from "../features/reports/pages/ReportsFiltersPage";
import ReportsResultsPage from "../features/reports/pages/ReportsResultsPage";

export default function AppRouter() {
  return (
    <Routes>
      {/* عامة */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* محمية */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* Admin فقط */}
          <Route
            path="/employee"
            element={
              <PermissionGate requireAdmin>
                <UsersPage />
              </PermissionGate>
            }
          />
          <Route
            path="/register"
            element={
              <PermissionGate requireAdmin>
                <RegisterPage />
              </PermissionGate>
            }
          />

          {/* الفواتير */}
          <Route
            path="/createinvoice"
            element={
              <PermissionGate
                any={["create_inventory_operations", "create_additions"]}
              >
                <CreateInvoicePage />
              </PermissionGate>
            }
          />

          <Route
            path="/invoices"
            element={
              <PermissionGate
                any={[
                  "view_additions",
                  "view_withdrawals",
                  "view_deposits",
                  "view_returns",
                  "view_damages",
                  "view_reservations",
                  "view_prices",
                  "view_purchase_requests",
                  "view_transfers",
                ]}
              >
                <ManageInvoicesPage />
              </PermissionGate>
            }
          />

          {/* التقارير (nested routes) */}
          <Route
            path="/reports"
            element={
              <PermissionGate all={["view_reports"]}>
                <ReportsLayout />
              </PermissionGate>
            }
          >
            {/* صفحة الفلاتر */}
            <Route index element={<ReportsFiltersPage />} />
            {/* صفحة النتائج */}
            <Route path="search" element={<ReportsResultsPage />} />
          </Route>

          {/* others/items */}
          <Route
            path="/others/items"
            element={
              <PermissionGate
                any={["items_can_edit", "items_can_delete", "items_can_add"]}
              >
                <ItemsPage />
              </PermissionGate>
            }
          />

          <Route
            path="/others/machines"
            element={
              <PermissionGate
                any={[
                  "machines_can_edit",
                  "machines_can_delete",
                  "machines_can_add",
                ]}
              >
                <MachinesPage />
              </PermissionGate>
            }
          />

          <Route
            path="/others/mechanisms"
            element={
              <PermissionGate
                any={[
                  "mechanism_can_edit",
                  "mechanism_can_delete",
                  "mechanism_can_add",
                ]}
              >
                <MechanismsPage />
              </PermissionGate>
            }
          />

          <Route
            path="/others/supliers"
            element={
              <PermissionGate
                any={[
                  "suppliers_can_edit",
                  "suppliers_can_delete",
                  "suppliers_can_add",
                ]}
              >
                <SuppliersPage />
              </PermissionGate>
            }
          />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

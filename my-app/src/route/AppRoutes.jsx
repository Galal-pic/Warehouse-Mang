// src/route/AppRoutes.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AppShell from "./layouts/AppShell";
import ProtectedRoute from "./guards/ProtectedRoute";
import PermissionGate from "./guards/PermissionGate";
import "../App.css";

// صفحات عامة
import Login from "../pages/loginPage/Login";

// الادمن
import Users from "../pages/Users";
import Register from "../pages/loginPage/../registerPage/Register";

// باقي الصفحات
import CreateInvoice from "../pages/createInvoicePage/CreateInvoice";
import Invoices from "../pages/invoicesPage/Invoices";
import Items from "../pages/itemsPage/Items";
import Machines from "../pages/machinesPage/Machines";
import Mechanisms from "../pages/mechanismsPage/Mechanisms";
import Supliers from "../pages/supliers/Supliers";
import Report from "../pages/reportPage/Report";

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* عامة */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* محمية */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            {/* Admin فقط */}
            <Route
              path="/employee"
              element={
                <PermissionGate requireAdmin>
                  <Users />
                </PermissionGate>
              }
            />
            <Route
              path="/register"
              element={
                <PermissionGate requireAdmin>
                  <Register />
                </PermissionGate>
              }
            />

            {/* إنشاء إذن: كلا العلمتين لازم true */}
            <Route
              path="/createinvoice"
              element={
                <PermissionGate
                  all={["create_inventory_operations", "create_additions"]}
                >
                  <CreateInvoice />
                </PermissionGate>
              }
            />

            {/* فواتير: يكفي أي صلاحية من المجموعة */}
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
                  <Invoices />
                </PermissionGate>
              }
            />

            {/* تقارير */}
            <Route
              path="/reports"
              element={
                <PermissionGate all={["view_reports"]}>
                  <Report />
                </PermissionGate>
              }
            />

            {/* Items */}
            <Route
              path="/others/items"
              element={
                <PermissionGate
                  any={["items_can_edit", "items_can_delete", "items_can_add"]}
                >
                  <Items />
                </PermissionGate>
              }
            />

            {/* Machines */}
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
                  <Machines />
                </PermissionGate>
              }
            />

            {/* Mechanisms */}
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
                  <Mechanisms />
                </PermissionGate>
              }
            />

            {/* Suppliers */}
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
                  <Supliers />
                </PermissionGate>
              }
            />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

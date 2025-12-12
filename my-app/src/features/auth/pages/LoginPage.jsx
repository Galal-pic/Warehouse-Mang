import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "../../../api/modules/authApi";
import { useAuthStore } from "../../../store/useAuthStore";
import logo from "../../../assets/logo.png";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleCloseSnackbar = () => setOpenSnackbar(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNameError("");
    setPasswordError("");
    setSnackbarMessage("");

    if (!name) {
      setNameError("يرجى ادخال الاسم");
      return;
    }
    if (!password) {
      setPasswordError("يرجى ادخال كلمة المرور");
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginRequest({
        username: name,
        password: password,
      });

      const token = res.data?.access_token;
      if (!token) {
        setSnackbarMessage("لم يتم استلام التوكن من الخادم");
        setOpenSnackbar(true);
        return;
      }

      await login(token);
      const updatedUser = useAuthStore.getState().user;

      // Navigation Logic
      if (updatedUser?.username === "admin") navigate("/employee");
      else if (updatedUser?.create_inventory_operations || updatedUser?.create_additions)
        navigate("/createinvoice");
      else if (
        updatedUser?.view_additions ||
        updatedUser?.view_withdrawals ||
        updatedUser?.view_deposits ||
        updatedUser?.view_returns ||
        updatedUser?.view_damages ||
        updatedUser?.view_reservations ||
        updatedUser?.view_transfers ||
        updatedUser?.view_purchase_requests
      )
        navigate("/invoices");
      else if (updatedUser?.view_reports) navigate("/reports");
      else if (
        updatedUser?.items_can_edit ||
        updatedUser?.items_can_delete ||
        updatedUser?.items_can_add
      )
        navigate("/others/items");
      else if (
        updatedUser?.machines_can_edit ||
        updatedUser?.machines_can_delete ||
        updatedUser?.machines_can_add
      )
        navigate("/others/machines");
      else if (
        updatedUser?.mechanism_can_edit ||
        updatedUser?.mechanism_can_delete ||
        updatedUser?.mechanism_can_add
      )
        navigate("/others/mechanisms");
      else if (
        updatedUser?.suppliers_can_edit ||
        updatedUser?.suppliers_can_delete ||
        updatedUser?.suppliers_can_add
      )
        navigate("/others/supliers");
      else navigate("/login");
    } catch (error) {
      const msg = error?.response?.data?.message;
      setSnackbarMessage(msg === "Invalid credentials" ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "حدث خطأ أثناء تسجيل الدخول");
      setOpenSnackbar(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-12">
        
        {/* Logo + Text */}
        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
          <img src={logo} alt="logo" className="h-40 md:h-52 select-none" />
          <h1 className="font-bold text-[2.2rem] md:text-[3rem] text-[#1976d2] mt-4 leading-snug">
            Welcome to CUBII
          </h1>
        </div>

        {/* Form */}
        <div className="w-full md:w-1/2 flex justify-center">
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.2)] border px-8 py-8">

              {/* Icon + Title */}
              <div className="flex flex-col items-center mb-6">
                <LockOutlinedIcon style={{ fontSize: "3rem", color: "#1976d2" }} />
                <h2 className="text-[28px] md:text-[30px] font-semibold text-black mt-2">
                  Login
                </h2>
              </div>

              {/* Snackbar */}
              {openSnackbar && (
                <div className="mb-4 text-sm text-red-800 bg-red-50 border border-red-300 rounded-lg px-3 py-2 flex justify-between items-center">
                  <span>{snackbarMessage}</span>
                  <button
                    onClick={handleCloseSnackbar}
                    className="text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" dir="rtl">

                {/* USERNAME */}
                <div>
                  <label className="block mb-1 text-sm font-medium">الاسم</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full rounded-md border px-4 py-3 text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1976d2] ${
                      nameError ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder="ادخل اسم المستخدم"
                  />
                  {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
                </div>

                {/* PASSWORD */}
                <div className="relative">
                  <label className="block mb-1 text-sm font-medium">كلمة المرور</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full rounded-md border px-4 py-3 text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1976d2] ${
                      passwordError ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder="••••••••"
                  />

                  {/* 👁 أيقونة إظهار/إخفاء */}
                  <div
                    className="absolute left-3 top-[48%] text-gray-600 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </div>

                  {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 mt-2 bg-[#1976d2] hover:bg-[#155bb5] transition text-white font-bold rounded-md disabled:opacity-60"
                >
                  {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                </button>

                {isLoading && (
                  <div className="flex justify-center mt-3">
                    <div className="h-7 w-7 border-4 border-[#1976d2] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </form>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

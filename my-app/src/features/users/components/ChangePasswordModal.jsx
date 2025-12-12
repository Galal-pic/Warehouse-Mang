import React, { useState } from "react";
import { changePassword } from "../../../api/modules/usersApi";
import { Visibility, VisibilityOff } from "@mui/icons-material";

export default function ChangePasswordModal({
  open,
  onClose,
  userId,
  onSuccess,
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (newPassword !== confirm) {
      setError("كلمات المرور غير متطابقة");
      return;
    }
    if (newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    try {
      setLoading(true);
      await changePassword({
        id: userId,
        new_password: newPassword,
        confirm_new_password: confirm,
      });
      setError("");
      setNewPassword("");
      setConfirm("");
      onSuccess?.("تم تغيير كلمة المرور بنجاح", "success");
      onClose();
    } catch (err) {
      console.error(err);
      setError("فشل في تغيير كلمة المرور. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const closeAll = () => {
    setNewPassword("");
    setConfirm("");
    setError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={closeAll} // إغلاق عند الضغط على الخلفية
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-5"
        dir="rtl"
        onClick={(e) => e.stopPropagation()} // منع إغلاق عند الضغط داخل الكارت
      >
        <h2 className="text-center text-lg font-bold text-slate-800 mb-4">
          تغيير كلمة المرور
        </h2>

        <div className="space-y-4">
          {/* كلمة المرور الجديدة */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 ${
                  error
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              />

              {/* أيقونة إظهار/إخفاء */}
              <button
                type="button"
                onClick={() => setShowNew((p) => !p)}
                className="
                  absolute left-3 top-1/2 -translate-y-1/2
                  flex items-center justify-center
                  w-7 h-7
                  rounded-full bg-transparent
                  hover:bg-gray-100/70 transition
                  outline-none border-none
                "
              >
                {showNew ? (
                  <VisibilityOff sx={{ color: "#6b7280", fontSize: 20 }} />
                ) : (
                  <Visibility sx={{ color: "#6b7280", fontSize: 20 }} />
                )}
              </button>
            </div>
          </div>

          {/* تأكيد كلمة المرور */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              تأكيد كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 ${
                  error
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              />

              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="
                  absolute left-3 top-1/2 -translate-y-1/2
                  flex items-center justify-center
                  w-7 h-7
                  rounded-full bg-transparent
                  hover:bg-gray-100/70 transition
                  outline-none border-none
                "
              >
                {showConfirm ? (
                  <VisibilityOff sx={{ color: "#6b7280", fontSize: 20 }} />
                ) : (
                  <Visibility sx={{ color: "#6b7280", fontSize: 20 }} />
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 text-right">{error}</p>}
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <button
            onClick={closeAll}
            className="flex-1 inline-flex justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 inline-flex justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {loading ? "جارٍ الحفظ..." : "تغيير"}
          </button>
        </div>
      </div>
    </div>
  );
}

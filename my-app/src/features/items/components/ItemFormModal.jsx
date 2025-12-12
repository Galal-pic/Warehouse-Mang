// src/features/items/components/ItemFormModal.jsx
import React, { useEffect, useState } from "react";

export default function ItemFormModal({
  open,
  loading = false,
  onClose,
  onSubmit,
}) {
  const [values, setValues] = useState({
    item_name: "",
    item_bar: "",
    location: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setValues({
        item_name: "",
        item_bar: "",
        location: "",
      });
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

  const handleChange = (field, val) => {
    setValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    const newErrors = {};
    if (!values.item_name.trim()) newErrors.item_name = "الحقل مطلوب";
    if (!values.item_bar.trim()) newErrors.item_bar = "الحقل مطلوب";
    if (!values.location.trim()) newErrors.location = "الموقع مطلوب";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSubmit(values);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
      onClick={onClose} // يغلق عند الضغط خارج المودال
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        dir="rtl"
        onClick={(e) => e.stopPropagation()} // يمنع الغلق عند الضغط داخل المودال
      >
        <h2 className="text-lg font-semibold text-center mb-4">
          إضافة منتج جديد
        </h2>

        {/* الاسم */}
        <div className="mb-3">
          <label className="block mb-1 text-sm font-medium text-right">
            الاسم
          </label>
          <input
            type="text"
            value={values.item_name}
            onChange={(e) => handleChange("item_name", e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.item_name ? "border-red-400" : "border-slate-300"
            }`}
          />
          {errors.item_name && (
            <p className="mt-1 text-xs text-red-500 text-right">
              {errors.item_name}
            </p>
          )}
        </div>

        {/* الباركود */}
        <div className="mb-3">
          <label className="block mb-1 text-sm font-medium text-right">
            الباركود
          </label>
          <input
            type="text"
            value={values.item_bar}
            onChange={(e) => handleChange("item_bar", e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.item_bar ? "border-red-400" : "border-slate-300"
            }`}
          />
          {errors.item_bar && (
            <p className="mt-1 text-xs text-red-500 text-right">
              {errors.item_bar}
            </p>
          )}
        </div>

        {/* الموقع */}
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium text-right">
            الموقع
          </label>
          <input
            type="text"
            value={values.location}
            onChange={(e) => handleChange("location", e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.location ? "border-red-400" : "border-slate-300"
            }`}
          />
          {errors.location && (
            <p className="mt-1 text-xs text-red-500 text-right">
              {errors.location}
            </p>
          )}
        </div>

        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-100"
            disabled={loading}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "جارٍ الحفظ..." : "إضافة"}
          </button>
        </div>
      </div>
    </div>
  );
}

// src/features/suppliers/components/SupplierFormModal.jsx
import React, { useEffect, useState } from "react";

export default function SupplierFormModal({
  open,
  mode = "add",
  initialValues = { name: "", description: "" },
  loading = false,
  onClose,
  onSubmit,
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues, open]);

  if (!open) return null;

  const handleChange = (field, val) => {
    setValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    const newErrors = {};
    if (!values.name.trim()) newErrors.name = "الحقل مطلوب";
    if (!values.description.trim()) newErrors.description = "الحقل مطلوب";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(values);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
      onClick={onClose}                   // ← غلق عند الضغط خارج المودال
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        dir="rtl"
        onClick={(e) => e.stopPropagation()} // ← منع غلق عند الضغط داخل المودال
      >
        <h2 className="text-lg font-semibold text-center mb-4">
          {mode === "add" ? "إضافة مورد جديد" : "تعديل المورد"}
        </h2>

        {/* name */}
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium text-right">
            الاسم
          </label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? "border-red-400" : "border-slate-300"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500 text-right">{errors.name}</p>
          )}
        </div>

        {/* description */}
        <div className="mb-4">
          <label className="block mb-1 text-sm font-medium text-right">
            الباركود
          </label>
          <input
            type="text"
            value={values.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? "border-red-400" : "border-slate-300"
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-500 text-right">
              {errors.description}
            </p>
          )}
        </div>

        {/* actions */}
        <div className="flex justify-between mt-6">
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
            {loading ? "جارٍ الحفظ..." : mode === "add" ? "إضافة" : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { addUser as addUserApi } from "../../../api/modules/usersApi";
import {
  JOBS,
  CREATE_INVOICE_OPTIONS,
  INVOICES_PAGE_OPTIONS,
  ITEM_OPTIONS,
  MACHINES_OPTIONS,
  MECHANISM_OPTIONS,
  SUPPLIERS_OPTIONS,
} from "../constants/permissions";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";

function buildFlags(options) {
  return Object.keys(options).reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});
}

function PermissionGroup({ label, values, sectionKey, options, onToggle }) {
  return (
    <div className="border border-slate-200 rounded-lg  mb-3 bg-slate-50">
      <div className="bg-slate-200/70 px-3 py-2 text-sm font-semibold text-slate-700">
        {label}
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(options).map(([key, text]) => (
          <label
            key={key}
            className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50 text-sm"
          >
            <span className="text-slate-700">{text}</span>
            <input
              type="checkbox"
              checked={values[key] || false}
              onChange={() => onToggle(sectionKey, key, !values[key])}
              className="w-4 h-4"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export default function AddUserModal({ open, onClose, onCreated, onMessage }) {
  const [formData, setFormData] = useState(() => ({
    username: "",
    phoneNumber: "",
    job: "",
    password: "",
    confirmPassword: "",
    privileges: {
      createInvoice: buildFlags(CREATE_INVOICE_OPTIONS),
      manageOperations: buildFlags(INVOICES_PAGE_OPTIONS),
      items: buildFlags(ITEM_OPTIONS),
      machines: buildFlags(MACHINES_OPTIONS),
      mechanism: buildFlags(MECHANISM_OPTIONS),
      suppliers: buildFlags(SUPPLIERS_OPTIONS),
    },
  }));

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!open) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updatePrivileges = (section, key, value) => {
    setFormData((prev) => ({
      ...prev,
      privileges: {
        ...prev.privileges,
        [section]: {
          ...prev.privileges[section],
          [key]: value,
        },
      },
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username) newErrors.username = "يرجى إدخال الاسم";
    if (!formData.job) newErrors.job = "يرجى اختيار الوظيفة";
    if (!formData.password) newErrors.password = "يرجى إدخال كلمة المرور";
    else if (formData.password.length < 6 || formData.password.length > 120)
      newErrors.password = "يجب أن تتراوح كلمة المرور بين 6 و 120 حرفًا";
    if (!formData.confirmPassword)
      newErrors.confirmPassword = "يرجى تأكيد كلمة المرور";
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "كلمات المرور غير متطابقة";

    return newErrors;
  };

  const resetForm = () => {
    setFormData({
      username: "",
      phoneNumber: "",
      job: "",
      password: "",
      confirmPassword: "",
      privileges: {
        createInvoice: buildFlags(CREATE_INVOICE_OPTIONS),
        manageOperations: buildFlags(INVOICES_PAGE_OPTIONS),
        items: buildFlags(ITEM_OPTIONS),
        machines: buildFlags(MACHINES_OPTIONS),
        mechanism: buildFlags(MECHANISM_OPTIONS),
        suppliers: buildFlags(SUPPLIERS_OPTIONS),
      },
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    const payload = {
      username: formData.username,
      password: formData.password,
      phone_number: formData.phoneNumber || undefined,
      job_name: formData.job,
      permissions: formData.privileges,
    };

    try {
      setSubmitting(true);
      const res = await addUserApi(payload);
      if (res?.data) {
        onMessage?.("تم تسجيل الموظف بنجاح", "success");
        onCreated?.();
        resetForm();
        onClose?.();
      }
    } catch (error) {
      console.error("Error adding user:", error);
      const apiMessage = error?.response?.data?.message;

      if (apiMessage === "Username already exists") {
        setErrors((prev) => ({ ...prev, username: "الاسم غير متاح" }));
        onMessage?.("اسم المستخدم موجود بالفعل. يرجى اختيار اسم آخر", "info");
      } else {
        onMessage?.("فشل التسجيل. يرجى المحاولة مرة أخرى.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = () => {
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick} // إغلاق عند الضغط على الخلفية
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh]  flex flex-col"
        dir="rtl"
        onClick={(e) => e.stopPropagation()} // منع الإغلاق عند الضغط داخل الكارت
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">
            إضافة موظف جديد
          </h2>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
        >
          {/* المعلومات الأساسية */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-base font-semibold text-blue-700 mb-3">
              المعلومات الأساسية
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* الاسم */}
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">
                  الاسم
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border text-sm outline-none text-right ${
                    errors.username
                      ? "border-red-500"
                      : "border-slate-300 focus:border-blue-500"
                  }`}
                />
                {errors.username && (
                  <p className="text-xs text-red-600 mt-1">{errors.username}</p>
                )}
              </div>

              {/* رقم الهاتف */}
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border text-sm outline-none text-right border-slate-300 focus:border-blue-500"
                />
              </div>

              {/* كلمة المرور */}
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border text-sm outline-none text-right ${
                      errors.password
                        ? "border-red-500"
                        : "border-slate-300 focus:border-blue-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-600"
                  >
                    {showPassword ? "إخفاء" : "إظهار"}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1">{errors.password}</p>
                )}
              </div>

              {/* تأكيد كلمة المرور */}
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                    className={`w-full px-3 py-2 rounded-md border text-sm outline-none text-right ${
                      errors.confirmPassword
                        ? "border-red-500"
                        : "border-slate-300 focus:border-blue-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-600"
                  >
                    {showConfirmPassword ? "إخفاء" : "إظهار"}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* الوظيفة */}
              <div>
                <label className="block mb-1 text-sm font-semibold text-slate-700">
                  اختر الوظيفة
                </label>
                <select
                  value={formData.job}
                  onChange={(e) => handleChange("job", e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border text-sm outline-none text-right bg-white ${
                    errors.job
                      ? "border-red-500"
                      : "border-slate-300 focus:border-blue-500"
                  }`}
                >
                  <option value="">-- اختر الوظيفة --</option>
                  {JOBS.map((job) => (
                    <option key={job} value={job}>
                      {job}
                    </option>
                  ))}
                </select>
                {errors.job && (
                  <p className="text-xs text-red-600 mt-1">{errors.job}</p>
                )}
              </div>
            </div>
          </div>

          {/* الصلاحيات */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-base font-semibold text-blue-700 mb-3">
              الصلاحيات
            </h3>

            <PermissionGroup
              label="صفحة إنشاء عملية"
              values={formData.privileges.createInvoice}
              sectionKey="createInvoice"
              options={CREATE_INVOICE_OPTIONS}
              onToggle={updatePrivileges}
            />
            <PermissionGroup
              label="صفحة إدارة العمليات"
              values={formData.privileges.manageOperations}
              sectionKey="manageOperations"
              options={INVOICES_PAGE_OPTIONS}
              onToggle={updatePrivileges}
            />
            <PermissionGroup
              label="صفحة الأصناف"
              values={formData.privileges.items}
              sectionKey="items"
              options={ITEM_OPTIONS}
              onToggle={updatePrivileges}
            />
            <PermissionGroup
              label="صفحة الماكينات"
              values={formData.privileges.machines}
              sectionKey="machines"
              options={MACHINES_OPTIONS}
              onToggle={updatePrivileges}
            />
            <PermissionGroup
              label="صفحة الميكانيزم"
              values={formData.privileges.mechanism}
              sectionKey="mechanism"
              options={MECHANISM_OPTIONS}
              onToggle={updatePrivileges}
            />
            <PermissionGroup
              label="صفحة الموردين"
              values={formData.privileges.suppliers}
              sectionKey="suppliers"
              options={SUPPLIERS_OPTIONS}
              onToggle={updatePrivileges}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {/* إلغاء */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-100"
            title="إلغاء"
          >
            <CancelIcon className="w-4 h-4" />
            <span>إلغاء</span>
          </button>

          {/* حفظ / إضافة */}
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
            title="حفظ"
          >
            {submitting ? (
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <SaveIcon className="w-4 h-4" />
            )}
            <span>{submitting ? "جاري الحفظ..." : "إضافة الموظف"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

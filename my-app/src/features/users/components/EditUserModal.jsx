import React, { useEffect, useState } from "react";
import { updateUser } from "../../../api/modules/usersApi";
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
import EditIcon from "@mui/icons-material/Edit";

function PermissionGroup({ label, options, values = {}, onChange, disabled }) {
  return (
    <div className="border rounded-lg bg-white shadow-sm ">
      <div className="bg-slate-100 px-3 py-2 font-semibold text-sm text-slate-700">
        {label}
      </div>
      <div className="p-3 flex flex-wrap gap-3">
        {Object.entries(options).map(([key, labelText]) => (
          <label
            key={key}
            className={`flex items-center gap-2 text-sm cursor-pointer ${
              disabled ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={Boolean(values[key])}
              onChange={() => onChange(key, !values[key])}
              disabled={disabled}
              className="w-4 h-4"
            />
            <span>{labelText}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function transformUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    phone_number: user.phone_number,
    job_name: user.job_name,
    permissions: {
      createInvoice: {
        create_inventory_operations: user.create_inventory_operations,
        create_additions: user.create_additions,
      },
      manageOperations: {
        view_additions: user.view_additions,
        view_withdrawals: user.view_withdrawals,
        view_deposits: user.view_deposits,
        view_returns: user.view_returns,
        view_damages: user.view_damages,
        view_reservations: user.view_reservations,
        view_prices: user.view_prices,
        view_purchase_requests: user.view_purchase_requests,
        view_transfers: user.view_transfers,
        view_reports: user.view_reports,
        can_edit: user.can_edit,
        can_delete: user.can_delete,
        can_confirm_withdrawal: user.can_confirm_withdrawal,
        can_withdraw: user.can_withdraw,
        can_recover_deposits: user.can_recover_deposits,
      },
      items: {
        items_can_edit: user.items_can_edit,
        items_can_delete: user.items_can_delete,
        items_can_add: user.items_can_add,
      },
      machines: {
        machines_can_edit: user.machines_can_edit,
        machines_can_delete: user.machines_can_delete,
        machines_can_add: user.machines_can_add,
      },
      mechanism: {
        mechanism_can_edit: user.mechanism_can_edit,
        mechanism_can_delete: user.mechanism_can_delete,
        mechanism_can_add: user.mechanism_can_add,
      },
      suppliers: {
        suppliers_can_edit: user.suppliers_can_edit,
        suppliers_can_delete: user.suppliers_can_delete,
        suppliers_can_add: user.suppliers_can_add,
      },
    },
  };
}

export default function EditUserModal({
  open,
  onClose,
  user,
  onUpdated,
  onMessage,
}) {
  const [editing, setEditing] = useState(false);
  const [formUser, setFormUser] = useState(() => transformUser(user));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormUser(transformUser(user));
    setEditing(false);
  }, [user, open]);

  if (!open || !formUser) return null;

  const handleChangePerm = (section, key, value) => {
    setFormUser((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]: {
          ...prev.permissions[section],
          [key]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!formUser.username) {
      onMessage?.("اسم المستخدم مطلوب", "error");
      return;
    }
    if (!formUser.job_name) {
      onMessage?.("اسم الوظيفة مطلوب", "error");
      return;
    }

    const p = formUser.permissions;

    const payload = {
      id: formUser.id,
      username: formUser.username,
      phone_number: formUser.phone_number,
      job_name: formUser.job_name,
      create_inventory_operations: p.createInvoice.create_inventory_operations,
      create_additions: p.createInvoice.create_additions,
      view_additions: p.manageOperations.view_additions,
      view_withdrawals: p.manageOperations.view_withdrawals,
      view_deposits: p.manageOperations.view_deposits,
      view_returns: p.manageOperations.view_returns,
      view_damages: p.manageOperations.view_damages,
      view_reservations: p.manageOperations.view_reservations,
      view_prices: p.manageOperations.view_prices,
      view_purchase_requests: p.manageOperations.view_purchase_requests,
      view_transfers: p.manageOperations.view_transfers,
      can_edit: p.manageOperations.can_edit,
      can_delete: p.manageOperations.can_delete,
      can_confirm_withdrawal: p.manageOperations.can_confirm_withdrawal,
      can_withdraw: p.manageOperations.can_withdraw,
      view_reports: p.manageOperations.view_reports,
      can_recover_deposits: p.manageOperations.can_recover_deposits,
      items_can_edit: p.items.items_can_edit,
      items_can_delete: p.items.items_can_delete,
      items_can_add: p.items.items_can_add,
      machines_can_edit: p.machines.machines_can_edit,
      machines_can_delete: p.machines.machines_can_delete,
      machines_can_add: p.machines.machines_can_add,
      mechanism_can_edit: p.mechanism.mechanism_can_edit,
      mechanism_can_delete: p.mechanism.mechanism_can_delete,
      mechanism_can_add: p.mechanism.mechanism_can_add,
      suppliers_can_edit: p.suppliers.suppliers_can_edit,
      suppliers_can_delete: p.suppliers.suppliers_can_delete,
      suppliers_can_add: p.suppliers.suppliers_can_add,
    };

    try {
      setLoading(true);
      await updateUser(payload);
      onUpdated?.(payload);
      onMessage?.("تم تحديث الموظف بنجاح", "success");
      setEditing(false);
    } catch (err) {
      console.error(err);
      onMessage?.("اسم الموظف موجود بالفعل أو خطأ في التعديل", "error");
    } finally {
      setLoading(false);
    }
  };

  const closeAll = () => {
    setEditing(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={closeAll} // إغلاق عند الضغط على الخلفية
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto p-5"
        dir="rtl"
        onClick={(e) => e.stopPropagation()} // منع الإغلاق عند الضغط داخل الكارت
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">بيانات الموظف</h2>

          <div className="flex gap-2">
            {editing ? (
              <>
                {/* حفظ */}
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="
                    inline-flex items-center justify-center 
                    p-1.5 rounded-full bg-transparent 
                    hover:bg-blue-50 transition disabled:opacity-60
                  "
                  title="حفظ التعديلات"
                >
                  {loading ? (
                    <span className="inline-block h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <SaveIcon sx={{ fontSize: 22, color: "#2563eb" }} />
                  )}
                </button>

                {/* إلغاء */}
                <button
                  onClick={() => {
                    setFormUser(transformUser(user));
                    setEditing(false);
                  }}
                  className="
                    inline-flex items-center justify-center 
                    p-1.5 rounded-full bg-transparent 
                    hover:bg-gray-100 transition
                  "
                  title="إلغاء التعديل"
                >
                  <CancelIcon sx={{ fontSize: 22, color: "#6b7280" }} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="
                  inline-flex items-center justify-center 
                  p-1.5 rounded-full bg-transparent 
                  hover:bg-blue-50 transition
                "
                title="تعديل"
              >
                <EditIcon sx={{ fontSize: 22, color: "#2563eb" }} />
              </button>
            )}
          </div>
        </div>

        {/* بيانات أساسية */}
        <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <label className="w-full md:w-1/4 text-sm font-semibold text-slate-700">
              اسم المستخدم:
            </label>
            <input
              value={formUser.username}
              onChange={(e) =>
                editing &&
                setFormUser((prev) => ({ ...prev, username: e.target.value }))
              }
              disabled={!editing}
              className={`flex-1 w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 ${
                editing
                  ? "border-blue-500 focus:ring-blue-500"
                  : "border-gray-300 bg-gray-100"
              }`}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-center">
            <label className="w-full md:w-1/4 text-sm font-semibold text-slate-700">
              الوظيفة:
            </label>
            <select
              value={formUser.job_name || ""}
              onChange={(e) =>
                editing &&
                setFormUser((prev) => ({ ...prev, job_name: e.target.value }))
              }
              disabled={!editing}
              className={`flex-1 w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 ${
                editing
                  ? "border-blue-500 focus:ring-blue-500"
                  : "border-gray-300 bg-gray-100"
              }`}
            >
              <option value="">-- اختر الوظيفة --</option>
              {JOBS.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-center">
            <label className="w-full md:w-1/4 text-sm font-semibold text-slate-700">
              رقم الهاتف:
            </label>
            <input
              value={formUser.phone_number || ""}
              onChange={(e) =>
                editing &&
                setFormUser((prev) => ({
                  ...prev,
                  phone_number: e.target.value,
                }))
              }
              disabled={!editing}
              className={`flex-1 w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 ${
                editing
                  ? "border-blue-500 focus:ring-blue-500"
                  : "border-gray-300 bg-gray-100"
              }`}
            />
          </div>
        </div>

        {/* الصلاحيات */}
        <h3 className="text-center text-base font-bold text-slate-800 mb-3">
          صلاحيات الموظف
        </h3>

        <div className="space-y-3">
          <PermissionGroup
            label="صفحة إنشاء عملية"
            options={CREATE_INVOICE_OPTIONS}
            values={formUser.permissions.createInvoice}
            disabled={!editing}
            onChange={(key, value) =>
              handleChangePerm("createInvoice", key, value)
            }
          />

          <PermissionGroup
            label="صفحة إدارة العمليات"
            options={INVOICES_PAGE_OPTIONS}
            values={formUser.permissions.manageOperations}
            disabled={!editing}
            onChange={(key, value) =>
              handleChangePerm("manageOperations", key, value)
            }
          />

          <PermissionGroup
            label="صفحة الأصناف"
            options={ITEM_OPTIONS}
            values={formUser.permissions.items}
            disabled={!editing}
            onChange={(key, value) => handleChangePerm("items", key, value)}
          />

          <PermissionGroup
            label="صفحة الماكينات"
            options={MACHINES_OPTIONS}
            values={formUser.permissions.machines}
            disabled={!editing}
            onChange={(key, value) => handleChangePerm("machines", key, value)}
          />

          <PermissionGroup
            label="صفحة الميكانيزم"
            options={MECHANISM_OPTIONS}
            values={formUser.permissions.mechanism}
            disabled={!editing}
            onChange={(key, value) => handleChangePerm("mechanism", key, value)}
          />

          <PermissionGroup
            label="صفحة الموردين"
            options={SUPPLIERS_OPTIONS}
            values={formUser.permissions.suppliers}
            disabled={!editing}
            onChange={(key, value) => handleChangePerm("suppliers", key, value)}
          />
        </div>
      </div>
    </div>
  );
}

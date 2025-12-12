// src/features/invoices/components/InvoiceParties.jsx
import React from "react";

export default function InvoiceParties({
  invoice,
  editingInvoice,
  isEditing,
  setEditingInvoice,
}) {
  const target = isEditing ? editingInvoice : invoice;

  return (
    <div
      className="mt-4 flex flex-wrap justify-around gap-4 text-sm"
      dir="rtl"
    >
      <div className="flex-1 min-w-[140px] flex flex-col items-center gap-1">
        <span className="font-semibold text-gray-700">اسم الموظف</span>
        <span className="text-gray-700">{target.employee_name}</span>
      </div>

      <div className="flex-1 min-w-[160px] flex flex-col items-center gap-1">
        <span className="font-semibold text-gray-700">اسم المستلم</span>
        {isEditing ? (
          <input
            type="text"
            className="w-3/4 border border-gray-300  px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={target.client_name || ""}
            onChange={(e) =>
              setEditingInvoice({
                ...editingInvoice,
                client_name: e.target.value,
              })
            }
          />
        ) : (
          <span className="text-gray-700">{target.client_name}</span>
        )}
      </div>

      <div className="flex-1 min-w-[160px] flex flex-col items-center gap-1">
        <span className="font-semibold text-gray-700">عامل المخازن</span>
        <span className="text-gray-700">{target.warehouse_manager}</span>
      </div>
    </div>
  );
}

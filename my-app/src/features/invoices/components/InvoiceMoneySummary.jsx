// src/features/invoices/components/InvoiceMoneySummary.jsx
import React from "react";
import NumberInput from "../../../components/common/NumberInput";

export default function InvoiceMoneySummary({
  selectedInvoice,
  editingInvoice,
  setEditingInvoice,
  isEditing,
}) {
  const paymentOptions = [
    { label: "Cash", value: "Cash" },
    { label: "Credit", value: "Credit" },
    { label: "عهدة", value: "Custody" },
  ];

  const total = isEditing
    ? editingInvoice.total_amount
    : selectedInvoice.total_amount;

  const paymentValue = isEditing
    ? editingInvoice.payment_method
    : selectedInvoice.payment_method;

  return (
    <div
      className="mt-4 flex flex-wrap gap-3 justify-between text-sm"
      dir="rtl"
    >
      {/* الإجمالي */}
      <div className="flex-1 min-w-[160px] border border-gray-300  bg-white px-3 py-2 flex flex-col items-center gap-1">
        <span className="font-semibold">الإجمالي</span>
        <span className="text-blue-600 font-medium">{total}</span>
      </div>

      {/* طريقة الدفع */}
      <div className="flex-1 min-w-[180px] border border-gray-300  bg-white px-3 py-2 flex flex-col items-center gap-1">
        <span className="font-semibold">طريقة الدفع</span>
        <div className="w-full flex flex-col gap-2 items-center">
          {isEditing ? (
            <>
              <select
                className="w-full border border-gray-300  px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentValue || ""}
                onChange={(e) =>
                  setEditingInvoice({
                    ...editingInvoice,
                    payment_method: e.target.value,
                    custody_person:
                      e.target.value === "Custody"
                        ? editingInvoice.custody_person || ""
                        : "",
                  })
                }
              >
                <option value="">اختر طريقة الدفع</option>
                {paymentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {editingInvoice.payment_method === "Custody" && (
                <input
                  className="w-full border border-gray-300  px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="اسم الشخص"
                  value={editingInvoice.custody_person || ""}
                  onChange={(e) =>
                    setEditingInvoice({
                      ...editingInvoice,
                      custody_person: e.target.value,
                    })
                  }
                />
              )}
            </>
          ) : paymentValue === "Custody" ? (
            <span className="text-blue-600">
              عهدة مع {selectedInvoice.custody_person || "-"}
            </span>
          ) : (
            <span className="text-blue-600">{paymentValue}</span>
          )}
        </div>
      </div>

      {/* المدفوع */}
      <div className="flex-1 min-w-[160px] border border-gray-300  bg-white px-3 py-2 flex flex-col items-center gap-1 text-center">
        <span className="font-semibold">المدفوع</span>
        <div className="w-full">
          {isEditing ? (
            <NumberInput
              value={editingInvoice.paid || 0}
              className="w-full h-9 text-center text-sm border border-gray-300 "
              onChange={(e) =>
                setEditingInvoice({
                  ...editingInvoice,
                  paid: Number(e.target.value) || 0,
                })
              }
            />
          ) : (
            <span className="text-blue-600">
              {selectedInvoice.paid || 0}
            </span>
          )}
        </div>
      </div>

      {/* المتبقي */}
      <div className="flex-1 min-w-[160px] border border-gray-300  bg-white px-3 py-2 flex flex-col items-center gap-1">
        <span className="font-semibold">المتبقي</span>
        <span className="text-blue-600 font-medium">
          {(editingInvoice?.paid || selectedInvoice.paid || 0) -
            (editingInvoice?.total_amount ||
              selectedInvoice.total_amount ||
              0)}
        </span>
      </div>
    </div>
  );
}

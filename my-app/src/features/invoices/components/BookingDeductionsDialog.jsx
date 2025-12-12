// src/features/invoices/components/BookingDeductionsDialog.jsx
import React, { useEffect, useState } from "react";
import { getBookingDeductions } from "../../../api/modules/invoicesApi";
import SnackBar from "../../../components/common/SnackBar";

export default function BookingDeductionsDialog({ open, onClose, invoiceId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "",
  });

  useEffect(() => {
    if (!open || !invoiceId) return;

    let mounted = true;
    setLoading(true);
    setData(null);

    getBookingDeductions(invoiceId)
      .then((res) => {
        if (!mounted) return;
        setData(res.data);
      })
      .catch((err) => {
        console.error("getBookingDeductions error", err);
        if (!mounted) return;
        setSnackbar({
          open: true,
          message: "فشل تحميل تفاصيل خصم الحجز",
          type: "error",
        });
      })
      .finally(() => {
        mounted && setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, invoiceId]);

  if (!open) {
    return (
      <SnackBar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-4" dir="rtl">
          {/* header */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-gray-800">
              تفاصيل خصم الحجز
            </h2>
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-800"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <div className="text-center text-sm text-gray-600">
              لا توجد بيانات متاحة
            </div>
          ) : (
            <>
              {/* summary */}
              <div className="mb-4 text-sm space-y-1">
                <p>
                  <span className="font-semibold">رقم الفاتورة:</span>{" "}
                  {data.invoice_id}
                </p>
                <p>
                  <span className="font-semibold">العميل:</span>{" "}
                  {data.client_name || "-"}
                </p>
                <p>
                  <span className="font-semibold">الحالة:</span>{" "}
                  {data.status}{" "}
                  {data.deduction_status === "minus" && (
                    <span className="inline-flex items-center px-2 py-0.5 ml-2 text-xs rounded-full bg-amber-100 text-amber-700">
                      تم الخصم من هذه الفاتورة
                    </span>
                  )}
                </p>
                <p>
                  <span className="font-semibold">إجمالي الكمية الأصلية:</span>{" "}
                  {data.total_original_quantity}
                </p>
                <p>
                  <span className="font-semibold">
                    إجمالي الكمية المخصومة:
                  </span>{" "}
                  {data.total_deducted_quantity}
                </p>
                <p>
                  <span className="font-semibold">إجمالي الكمية المتبقية:</span>{" "}
                  {data.total_remaining_quantity}
                </p>
              </div>

              {/* items table */}
              <div className="border border-gray-300 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1">الصنف</th>
                      <th className="border px-2 py-1">الباركود</th>
                      <th className="border px-2 py-1">الكمية الأصلية</th>
                      <th className="border px-2 py-1">المخصومة</th>
                      <th className="border px-2 py-1">المتبقية</th>
                      <th className="border px-2 py-1">تفاصيل الخصم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.items || []).map((item) => (
                      <tr key={item.item_id} className="even:bg-gray-50">
                        <td className="border px-2 py-1">{item.item_name}</td>
                        <td className="border px-2 py-1 text-center">
                          {item.barcode}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {item.original_quantity}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {item.deducted_quantity}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {item.remaining_quantity}
                        </td>
                        <td className="border px-2 py-1">
                          {(item.deductions_details || []).length === 0 ? (
                            <span className="text-slate-500">
                              لا توجد خصومات
                            </span>
                          ) : (
                            <ul className="list-disc pr-4 space-y-1">
                              {item.deductions_details.map((d, idx) => (
                                <li key={idx}>
                                  فاتورة رقم{" "}
                                  <span className="font-semibold">
                                    {d.deducted_for_invoice_id}
                                  </span>{" "}
                                  ({d.deducted_for_invoice_type}) – كمية:{" "}
                                  <span className="font-semibold">
                                    {d.quantity}
                                  </span>{" "}
                                  – سعر: {d.price_used} – بتاريخ{" "}
                                  {d.deducted_at}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <SnackBar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </>
  );
}

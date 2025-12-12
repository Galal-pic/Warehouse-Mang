// src/features/invoices/components/BookingDeductionsDialog.jsx
import React, { useEffect, useState, useMemo } from "react";
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
    if (!open) return;
    if (!invoiceId) {
      setData(null);
      setLoading(false);
      return;
    }

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
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, invoiceId]);

  const statusBadge = useMemo(() => {
    if (!data?.deduction_status) return null;

    if (data.deduction_status === "minus") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          تم الخصم من هذه الفاتورة
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-700 border border-slate-200">
        {data.deduction_status}
      </span>
    );
  }, [data?.deduction_status]);

  const StatCard = ({ label, value, highlight = false }) => (
    <div
      className={`flex-1 min-w-[180px] rounded-2xl border px-4 py-3 text-center bg-white ${
        highlight ? "border-blue-200" : "border-slate-200"
      }`}
    >
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div
        className={`text-lg font-bold ${
          highlight ? "text-blue-700" : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );

  const Chip = ({ children, tone = "slate" }) => {
    const tones = {
      slate: "bg-slate-100 text-slate-700 border-slate-200",
      blue: "bg-blue-50 text-blue-700 border-blue-200",
      green: "bg-emerald-50 text-emerald-700 border-emerald-200",
      red: "bg-red-50 text-red-700 border-red-200",
      amber: "bg-amber-50 text-amber-800 border-amber-200",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full border ${
          tones[tone] || tones.slate
        }`}
      >
        {children}
      </span>
    );
  };

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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#f3f5f9] shadow-2xl border border-slate-200"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#f3f5f9] px-6 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                  تفاصيل خصم الحجز
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {statusBadge}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#0B5ED7] text-white text-sm font-semibold shadow-sm hover:bg-[#0a53c5] transition"
              >
                إغلاق
              </button>
            </div>

            <div className="w-full h-[2px] bg-[#0B5ED7] mt-4" />
          </div>

          {/* Body */}
          <div className="px-6 pb-6 pt-5">
            {loading ? (
              <div className="flex justify-center py-14">
                <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !invoiceId ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-600">
                رقم الفاتورة غير متوفر
              </div>
            ) : !data ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-600">
                لا توجد بيانات متاحة
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <div className="flex flex-wrap gap-3 justify-between">
                    <StatCard
                      label="إجمالي الكمية الأصلية"
                      value={data.total_original_quantity ?? 0}
                    />
                    <StatCard
                      label="إجمالي الكمية المخصومة"
                      value={data.total_deducted_quantity ?? 0}
                      highlight
                    />
                    <StatCard
                      label="إجمالي الكمية المتبقية"
                      value={data.total_remaining_quantity ?? 0}
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="mt-5 space-y-4">
                  {(data.items || []).map((item) => {
                    const sources =
                      item.deductions_details?.filter(
                        (d) => Number(d.quantity) !== 0
                      ) || [];

                    const remaining = Number(item.remaining_quantity) || 0;
                    const deducted = Number(item.deducted_quantity) || 0;

                    return (
                      <div
                        key={item.item_id}
                        className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden"
                      >
                        {/* item header */}
                        <div className="px-5 py-4 bg-gradient-to-l from-blue-50 to-white">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-[220px]">
                              <div className="text-lg font-bold text-[#0B5ED7]">
                                {item.item_name}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <Chip tone="slate">باركود: {item.barcode}</Chip>
                                <Chip tone="slate">ID: {item.item_id}</Chip>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Chip tone="blue">
                                الأصلية: {item.original_quantity ?? 0}
                              </Chip>
                              <Chip tone={deducted > 0 ? "amber" : "slate"}>
                                المخصومة: {item.deducted_quantity ?? 0}
                              </Chip>
                              <Chip tone={remaining === 0 ? "red" : "green"}>
                                المتبقية: {item.remaining_quantity ?? 0}
                              </Chip>
                              <Chip tone="slate">
                                عدد الخصومات: {sources.length}
                              </Chip>
                            </div>
                          </div>
                        </div>

                        {/* details */}
                        <div className="px-5 pb-5">
                          {sources.length === 0 ? (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                              لا توجد خصومات على هذا الصنف
                            </div>
                          ) : (
                            <div className="mt-4 space-y-3">
                              {sources.map((d, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-2xl border border-slate-200 bg-[#f7f9fc] p-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Chip tone="blue">
                                        فاتورة رقم:{" "}
                                        <span className="font-bold">
                                          {d.deducted_for_invoice_id}
                                        </span>
                                      </Chip>
                                      <Chip tone="slate">
                                        {d.deducted_for_invoice_type}
                                      </Chip>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <Chip tone="amber">
                                        الكمية:{" "}
                                        <span className="font-bold">
                                          {d.quantity}
                                        </span>
                                      </Chip>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
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

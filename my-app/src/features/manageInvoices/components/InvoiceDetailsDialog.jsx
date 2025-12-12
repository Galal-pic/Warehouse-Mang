// src/features/manageInvoices/components/InvoiceDetailsDialog.jsx
import React, { useEffect, useState } from "react";
import { priceReport } from "../../../api/modules/invoicesApi";

const DetailItem = ({ label, value, emphasize }) => (
  <div className="flex flex-col items-center min-w-[110px] text-xs md:text-sm">
    <span className="text-slate-500 mb-1">{label}</span>
    <span
      className={`font-semibold ${
        emphasize ? "text-emerald-600" : "text-slate-800"
      }`}
    >
      {value}
    </span>
  </div>
);

const InvoiceDetailsDialog = ({ open, onClose, invoiceId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !invoiceId) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await priceReport(invoiceId);
        setData(res.data);
      } catch (error) {
        console.error("Error loading price report", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [open, invoiceId]);

  if (!open) return null;

  const items = data?.items || [];

  return (
    <div
      className="fixed -inset-10 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="bg-[#f3f5f9] rounded-3xl shadow-2xl w-[95%] max-w-4xl max-h-[90vh] overflow-y-auto px-6 py-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* هيدر أعلى المودال */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800">تفاصيل العناصر</h2>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#0B5ED7] text-white text-sm font-semibold shadow-sm hover:bg-[#0a53c5] transition"
          >
            إغلاق
          </button>
        </div>

        {/* خط أزرق تحت الهيدر */}
        <div className="w-full h-[2px] bg-[#0B5ED7] mb-6" />

        {loading && (
          <div className="py-10 text-center text-slate-500 text-sm">
            جاري تحميل تفاصيل الأسعار...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="py-10 text-center text-slate-500 text-sm">
            لا توجد بيانات تفصيلية لعرضها
          </div>
        )}

        {!loading &&
          items.map((item) => {
            const sources =
              item.price_breakdowns?.filter((b) => Number(b.quantity) !== 0) ||
              [];

            return (
              <div
                key={item.item_id}
                className="mb-6 bg-white rounded-3xl shadow-md px-5 py-6"
              >
                {/* عنوان الصنف في المنتصف */}
                <h3 className="text-lg md:text-xl font-bold text-[#0B5ED7] text-center mb-6">
                  {item.item_name}
                </h3>

                {/* صف التفاصيل الأساسي للصنف */}
                <div className="flex flex-wrap justify-around gap-y-6 mb-4">
                  <DetailItem label="الباركود" value={item.barcode} />
                  <DetailItem label="الموقع" value={item.location} />
                  <DetailItem label="الكمية" value={item.quantity} />
                  <DetailItem
                    label="سعر الوحدة"
                    value={`${item.unit_price} جنيه`}
                  />
                  <DetailItem
                    label="السعر الكلي"
                    value={`${item.total_price} جنيه`}
                  />
                  <DetailItem label="عدد المصادر" value={sources.length || 0} />
                </div>

                {/* كارت كل مصدر */}
                {sources.map((breakdown, idx) => (
                  <div
                    key={idx}
                    className="mt-4 bg-[#f7f9fc] rounded-2xl border-r-4 border-[#0B5ED7] px-4 py-4 flex flex-col gap-3"
                  >
                    {/* شريط أزرق بسيط على اليمين (مع RTL) */}
                    <div className="pr-3 rounded-tr-2xl rounded-br-2xl">
                      <h4 className="text-base font-semibold text-slate-800 text-center mb-3">
                        المصدر رقم {idx + 1}
                      </h4>

                      <div className="flex flex-wrap justify-around gap-y-4">
                        <DetailItem
                          label="رقم الفاتورة"
                          value={breakdown.source_invoice_id}
                        />
                        <DetailItem
                          label="تاريخ الفاتورة"
                          value={breakdown.source_invoice_date}
                        />
                        <DetailItem label="الكمية" value={breakdown.quantity} />
                        <DetailItem
                          label="سعر الوحدة"
                          value={`${breakdown.unit_price} جنيه`}
                        />
                        <DetailItem
                          label="الإجمالي"
                          value={`${breakdown.subtotal} جنيه`}
                        />
                        <DetailItem
                          label="النسبة من الإجمالي"
                          value={`${breakdown.percentage_of_total}%`}
                          emphasize
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default InvoiceDetailsDialog;

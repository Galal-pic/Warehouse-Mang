// src/features/items/components/ItemPriceSourcesModal.jsx
import React, { useEffect, useState } from "react";
import { getItemPriceSources } from "../../../api/modules/reportsApi";

export default function ItemPriceSourcesModal({ open, onClose, itemId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !itemId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getItemPriceSources(itemId);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [open, itemId]);

  if (!open) return null;

  const priceRecords = data?.price_records || [];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 rounded-xl shadow-xl w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-blue-500 pb-3">
          <h2 className="text-xl font-semibold text-slate-800">
            المصادر (عمليات الإضافة)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            إغلاق
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <div className="inline-block h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="py-6 text-center text-slate-600 text-sm">
            لا توجد بيانات
          </div>
        ) : (
          <>
            {/* Basic info */}
            <div className="flex flex-wrap gap-6 mb-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">اسم العنصر</div>
                <div className="text-lg font-semibold text-slate-800">
                  {data.item_name || "--"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">الباركود</div>
                <div className="text-lg font-semibold text-slate-800">
                  {data.item_bar || "--"}
                </div>
              </div>
            </div>

            {/* price records */}
            {priceRecords.length > 0 ? (
              <div className="space-y-3">
                {priceRecords.map((rec, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg shadow-sm border-l-4 border-blue-600 p-4"
                  >
                    <div className="grid md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          رقم الفاتورة
                        </div>
                        <div className="font-semibold text-slate-800">
                          {rec.invoice_id}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          التاريخ
                        </div>
                        <div className="font-semibold text-slate-800">
                          {rec.invoice_date}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          الكمية
                        </div>
                        <div className="font-semibold text-slate-800">
                          {rec.quantity}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          السعر/قطعة
                        </div>
                        <div className="font-semibold text-slate-800">
                          {rec.unit_price} ج.م
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-600 text-sm bg-white rounded-lg">
                لا توجد عمليات إضافة مرتبطة بهذا العنصر
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

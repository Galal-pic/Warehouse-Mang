// src/features/invoices/components/OriginalInvoiceDialog.jsx
import React, { useEffect, useState } from "react";
import {
  getInvoice,
  returnWarrantyInvoicePartially,
  getBookingDeductions,
} from "../../../api/modules/invoicesApi";
import InvoiceLayout from "./InvoiceLayout";
import { mapInvoiceFromApi } from "../utils/invoiceHelpers";

export default function OriginalInvoiceDialog({
  open,
  onClose,
  invoiceId,
  canEsterdad = false,
  canViewPrices = false,
}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!open || !invoiceId) return;

    let mounted = true;
    setIsLoading(true);
    setIsError(false);

    (async () => {
      try {
        const res = await getInvoice(invoiceId);
        if (!mounted) return;

        const inv = res.data;
        let status = null;

        if (inv.type === "أمانات") {
          const statusRes = await returnWarrantyInvoicePartially({
            id: inv.id,
          });
          if (!mounted) return;
          status = statusRes.data;
        }

        setData(mapInvoiceFromApi(inv, status));
      } catch (err) {
        console.error("getInvoice error", err);
        if (mounted) setIsError(true);
      } finally {
        mounted && setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, invoiceId]);

  useEffect(() => {
  if (!data || data.type !== "حجز") return;

  let mounted = true;

  (async () => {
    try {
      const res = await getBookingDeductions(data.id);
      if (!mounted) return;

      const bookingData = res.data;

      setData((prev) =>
        !prev
          ? prev
          : {
              ...prev,
              items: (prev.items || []).map((it) => {
                const match =
                  (bookingData.items || []).find(
                    (b) =>
                      (b.item_id && b.item_id === it.item_id) ||
                      (b.barcode === it.barcode &&
                        b.item_name === it.item_name)
                  ) || null;

                return {
                  ...it,
                  borrowed_to_main_quantity:
                    match?.deducted_quantity ?? 0,
                  booking_remaining_quantity:
                    match?.remaining_quantity ?? null,
                };
              }),
            }
      );
    } catch (err) {
      console.error(
        "getBookingDeductions error in OriginalInvoiceDialog",
        err
      );
    }
  })();

  return () => {
    mounted = false;
  };
}, [data?.id, data?.type]);


  if (!open) return null;

  const transformed =
    data &&
    (() => {
      const datePart = data.created_at
        ? data.created_at.split(" ")[0]
        : data.date || "";
      const timePart = data.created_at
        ? new Date(
            `1970-01-01 ${data.created_at.split(" ")[1]}`
          ).toLocaleTimeString("en-US", {
            hour12: true,
            hour: "numeric",
            minute: "2-digit",
          })
        : data.time || "";
      return {
        ...data,
        date: datePart,
        time: timePart,
      };
    })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white  shadow-lg max-w-5xl w-full max-h-[90vh] overflow-auto p-4">
        <div className="flex justify-between items-center mb-3" dir="rtl">
          <h2 className="text-base font-semibold text-gray-800">
            الفاتورة الأصلية
          </h2>
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-800"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent  animate-spin" />
          </div>
        ) : isError || !transformed ? (
          <div className="text-center text-sm text-red-600">
            فشل تحميل الفاتورة الأصلية
          </div>
        ) : (
          <InvoiceLayout
            selectedInvoice={transformed}
            isEditing={false}
            editingInvoice={transformed}
            setEditingInvoice={() => {}}
            selectedNowType={{ type: transformed.type }}
            addRow={() => {}}
            deleteRow={() => {}}
            isPurchasesType={transformed.type === "اضافه"}
            showCommentField
            isCreate={false}
            canEsterdad={canEsterdad}
            canViewPrices={canViewPrices}
          />
        )}
      </div>
    </div>
  );
}

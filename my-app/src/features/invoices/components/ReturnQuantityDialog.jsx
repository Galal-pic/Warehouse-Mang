// src/features/invoices/components/ReturnQuantityDialog.jsx
import React, { useEffect, useState } from "react";
import {
  returnWarrantyInvoice,
  returnWarrantyInvoicePartially,
  getInvoice,
} from "../../../api/modules/invoicesApi";
import SnackBar from "../../../components/common/SnackBar";

export default function ReturnQuantityDialog({
  open,
  onClose,
  selectedInvoice,
  selectedItemIndex,
  setSelectedInvoice,
  onInvoiceUpdated,
}) {
  const [quantity, setQuantity] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantity("");
    }
  }, [open, selectedItemIndex]);

  if (!open || !selectedInvoice || selectedItemIndex == null) {
    return (
      <SnackBar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    );
  }

  const item = selectedInvoice.items[selectedItemIndex];

  const maxQuantity =
    Math.max(
      0,
      (Number(item?.quantity) || 0) - (Number(item?.total_returned) || 0)
    ) || 0;

  const handleConfirm = async () => {
    const q = Number(quantity);

    if (!q || q <= 0) {
      setSnackbar({
        open: true,
        message: "برجاء إدخال كمية صحيحة",
        type: "error",
      });
      return;
    }

    if (q > maxQuantity) {
      setSnackbar({
        open: true,
        message: `الكمية القصوى المسموح بها هي ${maxQuantity}`,
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      await returnWarrantyInvoice({
        id: selectedInvoice.id,
        itemName: item.item_name,
        itemBar: item.barcode,
        location: item.location,
        quantity: q,
      });

      const statusRes = await returnWarrantyInvoicePartially({
        id: selectedInvoice.id,
      });
      const updatedStatus = statusRes.data;
      const invoiceRes = await getInvoice(selectedInvoice.id);
      const data = invoiceRes.data;

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

      const itemsWithReturn =
        data.type === "أمانات" && updatedStatus?.items
          ? (data.items || []).map((it) => {
              const match = updatedStatus.items.find(
                (r) =>
                  r.item_name === it.item_name &&
                  r.item_bar === it.barcode &&
                  r.location === it.location
              );

              if (!match) {
                return {
                  ...it,
                  total_returned: it.total_returned || 0,
                  is_fully_returned: it.is_fully_returned || false,
                };
              }

              return {
                ...it,
                total_returned:
                  typeof match.total_returned === "number"
                    ? match.total_returned
                    : it.total_returned || 0,
                is_fully_returned:
                  typeof match.is_fully_returned === "boolean"
                    ? match.is_fully_returned
                    : it.is_fully_returned || false,
              };
            })
          : data.items || [];

      const isInvoiceFullyReturned =
        data.type === "أمانات" &&
        itemsWithReturn.length > 0 &&
        itemsWithReturn.every((it) => {
          const qty = Number(it.quantity) || 0;
          const returned = Number(it.total_returned) || 0;
          return it.is_fully_returned || returned >= qty;
        });

      const newStatus = isInvoiceFullyReturned
        ? "تم الاسترداد"
        : data.status || "استرداد جزئي";

      setSelectedInvoice({
        ...data,
        status: newStatus,
        date: datePart,
        time: timePart,
        items: itemsWithReturn,
      });

      onInvoiceUpdated?.();

      setSnackbar({
        open: true,
        message: "تم الاسترداد بنجاح",
        type: "success",
      });
      onClose();
    } catch (error) {
      console.log(error);
      setSnackbar({
        open: true,
        message: "حدث خطأ أثناء الاسترداد",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white shadow-lg max-w-sm w-full p-4" dir="rtl">
          <h2 className="text-base font-semibold text-gray-800 mb-3 text-center">
            كمية الاسترداد
          </h2>

          <p className="text-xs text-gray-600 mb-2 text-center">
            الكمية المتاحة للاسترداد:{" "}
            <span className="font-semibold">{maxQuantity}</span>
          </p>

          <input
            type="number"
            min="0"
            className="w-full border border-gray-300 px-2 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm disabled:opacity-50"
            >
              {loading ? "جارٍ الحفظ..." : "تأكيد"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-red-600 text-white text-sm"
            >
              إلغاء
            </button>
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

// src/features/manageInvoices/components/InvoiceModal.jsx
import React, { useEffect, useState } from "react";
import {
  getInvoice,
  updateInvoice as apiUpdateInvoice,
  returnWarrantyInvoicePartially,
  getBookingDeductions,
} from "../../../api/modules/invoicesApi";
import InvoiceLayout from "../../invoices/components/InvoiceLayout";
import SnackBar from "../../../components/common/SnackBar";
import { useInvoicePrint } from "../../invoices/hooks/useInvoicePrint";

export default function InvoiceModal({
  open,
  onClose,
  invoice,
  user,
  onInvoiceUpdated,
}) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "",
  });

  const { handlePrint } = useInvoicePrint();

  const isAdmin = user?.username === "admin";
  const canEdit = user?.can_edit || isAdmin;
  const canViewPrices = user?.view_prices || isAdmin;
  const canRecoverDeposits = user?.can_recover_deposits || isAdmin;

  useEffect(() => {
    if (!open || !invoice?.id) return;

    let mounted = true;

    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const res = await getInvoice(invoice.id);
        if (!mounted) return;

        const data = res.data;

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

        const transformed = {
          ...data,
          date: datePart,
          time: timePart,
        };

        setSelectedInvoice(transformed);
        setEditingInvoice(transformed);
        setIsEditing(false);
      } catch (err) {
        console.error("getInvoice error in InvoiceModal", err);
        setSnackbar({
          open: true,
          message: "فشل في تحميل بيانات الفاتورة",
          type: "error",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchInvoice();

    return () => {
      mounted = false;
    };
  }, [open, invoice?.id]);

  useEffect(() => {
    if (!selectedInvoice || selectedInvoice.type !== "أمانات") return;

    let mounted = true;

    const fetchReturnStatus = async () => {
      try {
        const res = await returnWarrantyInvoicePartially({
          id: selectedInvoice.id,
        });
        const status = res.data;
        if (!mounted || !status?.items) return;

        setSelectedInvoice((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: (prev.items || []).map((it) => {
              const match = status.items.find(
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
            }),
          };
        });

        setEditingInvoice((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: (prev.items || []).map((it) => {
              const match = status.items.find(
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
            }),
          };
        });
      } catch (err) {
        console.error(
          "returnWarrantyInvoicePartially error in InvoiceModal",
          err
        );
      }
    };

    fetchReturnStatus();

    return () => {
      mounted = false;
    };
  }, [selectedInvoice?.id, selectedInvoice?.type]);

  useEffect(() => {
    if (!selectedInvoice || selectedInvoice.type !== "حجز") return;

    let mounted = true;

    (async () => {
      try {
        const res = await getBookingDeductions(selectedInvoice.id);
        if (!mounted) return;

        const bookingData = res.data;

        const enhance = (prev) =>
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
                    borrowed_to_main_quantity: match?.deducted_quantity ?? 0,
                    booking_remaining_quantity:
                      match?.remaining_quantity ?? null,
                  };
                }),
              };

        setSelectedInvoice(enhance);
        setEditingInvoice(enhance);
      } catch (err) {
        console.error("getBookingDeductions error in InvoiceModal", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedInvoice?.id, selectedInvoice?.type]);

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleStartEdit = () => {
    if (!canEdit || !selectedInvoice) return;
    setEditingInvoice(selectedInvoice);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!canEdit || !editingInvoice) return;

    setSaving(true);
    try {
      await apiUpdateInvoice({
        id: editingInvoice.id,
        ...editingInvoice,
      });

      setSelectedInvoice(editingInvoice);
      setIsEditing(false);
      onInvoiceUpdated?.();

      setSnackbar({
        open: true,
        message: "تم حفظ التعديلات بنجاح",
        type: "success",
      });
    } catch (err) {
      console.error("updateInvoice error in InvoiceModal", err);
      setSnackbar({
        open: true,
        message: "حدث خطأ أثناء حفظ التعديلات",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const addRow = () => {
    if (!canEdit) return;
    setEditingInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_name: "",
          barcode: "",
          quantity: 0,
          location: "",
          unit_price: 0,
          total_price: 0,
          description: "",
          supplier_name: "",
          new_location: "",
        },
      ],
    }));
  };

  const deleteRow = (index) => {
    if (!canEdit) return;
    setEditingInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  if (!open || !invoice) {
    return (
      <SnackBar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    );
  }

  const isDeposit = selectedInvoice?.type === "أمانات";

  return (
    <>
      <div
        className="fixed -inset-10 z-50 flex items-center justify-center bg-black/40"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto p-4"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">
              الفاتورة رقم {invoice.id}
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePrint("printable-invoice-modal")}
                disabled={loading || !selectedInvoice || isEditing}
                className="px-3 py-1 rounded-md text-sm bg-green-600 text-white disabled:opacity-50"
              >
                طباعة
              </button>

              {canEdit && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white disabled:opacity-50"
                      >
                        {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingInvoice(selectedInvoice);
                          setIsEditing(false);
                        }}
                        className="px-3 py-1 rounded-md text-sm bg-slate-200 text-slate-800"
                      >
                        إلغاء التعديل
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      disabled={loading || !selectedInvoice}
                      className="px-3 py-1 rounded-md text-sm bg-blue-600 text-white disabled:opacity-50"
                    >
                      تعديل
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1 rounded-md text-sm bg-slate-700 text-white"
              >
                إغلاق
              </button>
            </div>
          </div>

          {loading || !selectedInvoice || !editingInvoice ? (
            <div className="w-full py-10 flex items-center justify-center">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <InvoiceLayout
              className="printable-invoice-modal"
              selectedInvoice={selectedInvoice}
              isEditing={canEdit && isEditing}
              editingInvoice={editingInvoice}
              setEditingInvoice={setEditingInvoice}
              selectedNowType={{ type: selectedInvoice.type }}
              addRow={addRow}
              deleteRow={deleteRow}
              isPurchasesType={selectedInvoice.type === "اضافه"}
              showCommentField
              isCreate={false}
              canEsterdad={isDeposit && canRecoverDeposits}
              setSelectedInvoice={setSelectedInvoice}
              canViewPrices={canViewPrices}
              onInvoiceUpdated={onInvoiceUpdated}
            />
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

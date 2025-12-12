// src/features/invoices/pages/EditInvoicePage.jsx
import React, { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import {
  getInvoice,
  updateInvoice as apiUpdateInvoice,
  returnWarrantyInvoicePartially, // ✅ جديد
} from "../../../api/modules/invoicesApi";
import InvoiceLayout from "../components/InvoiceLayout";
import SnackBar from "../../../components/common/SnackBar";
import { useAuthStore } from "../../../store/useAuthStore";
import { mapInvoiceFromApi } from "../utils/invoiceHelpers"; // ✅ جديد

export default function EditInvoicePage() {
  const { id } = useParams();
  const { user, isUserLoading, fetchCurrentUser } = useAuthStore();

  const [editingInvoice, setEditingInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "",
  });

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const getBackendErrorMessage = (err) => {
    const data = err?.response?.data;

    if (!data) return err?.message || "حدث خطأ غير متوقع";
    if (typeof data === "string") return data;

    if (data.message) return data.message;
    if (data.detail) return data.detail;

    if (data.errors) {
      if (typeof data.errors === "string") return data.errors;
      try {
        return JSON.stringify(data.errors);
      } catch {
        return "حدث خطأ";
      }
    }

    try {
      return JSON.stringify(data);
    } catch {
      return "حدث خطأ";
    }
  };

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    (async () => {
      try {
        const res = await getInvoice(id);
        if (!mounted) return;

        const data = res.data;
        let status = null;

        if (data.type === "أمانات") {
          const statusRes = await returnWarrantyInvoicePartially({
            id: data.id,
          });
          if (!mounted) return;
          status = statusRes.data;
        }

        setEditingInvoice(mapInvoiceFromApi(data, status));
      } catch (err) {
        console.error("getInvoice error", err);
        setSnackbar({
          open: true,
          message: getBackendErrorMessage(err),
          type: "error",
        });
      } finally {
        mounted && setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (isLoading || isUserLoading || !editingInvoice) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const canEditInvoice = user?.can_edit || user?.username === "admin";

  if (!canEditInvoice) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center text-red-600 font-semibold">
        ليست لديك صلاحية لتعديل الفواتير
      </div>
    );
  }

  const canViewPrices = user?.view_prices || user?.username === "admin";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiUpdateInvoice({ id, ...editingInvoice });

      setSnackbar({
        open: true,
        message: "تم تحديث الفاتورة بنجاح",
        type: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: getBackendErrorMessage(err),
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-[90%] mx-auto mt-10 mb-10" dir="rtl">
      <InvoiceLayout
        selectedInvoice={editingInvoice}
        isEditing
        editingInvoice={editingInvoice}
        setEditingInvoice={setEditingInvoice}
        selectedNowType={{ type: editingInvoice.type }}
        addRow={() =>
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
              },
            ],
          }))
        }
        deleteRow={(index) =>
          setEditingInvoice((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
          }))
        }
        isPurchasesType={editingInvoice.type === "اضافه"}
        showCommentField
        isCreate={false}
        canEsterdad={false}
        setSelectedInvoice={undefined}
        canViewPrices={canViewPrices}
      />

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          {isSaving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </button>
      </div>

      <SnackBar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}

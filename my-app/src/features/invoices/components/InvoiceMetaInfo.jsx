// src/features/invoices/components/InvoiceMetaInfo.jsx
import React, { useEffect, useState } from "react";
import CustomAutoCompleteField from "../../../components/common/CustomAutoCompleteField";
import { getMachines } from "../../../api/modules/machinesApi";
import { getMechanisms } from "../../../api/modules/mechanismsApi";
import { getInvoicesNumbers } from "../../../api/modules/invoicesApi";
import OriginalInvoiceDialog from "./OriginalInvoiceDialog";
import SnackBar from "../../../components/common/SnackBar";

export default function InvoiceMetaInfo({
  selectedInvoice,
  editingInvoice,
  setEditingInvoice,
  isEditing,
  selectedNowType,
  justEditUnitPrice = false,
  canEsterdad = false,
  canViewPrices = false,
}) {
  const isReturnType =
    selectedNowType?.type === "مرتجع" ||
    selectedInvoice?.type === "مرتجع" ||
    editingInvoice?.type === "مرتجع";

  const isAdditionType =
    selectedNowType?.type === "اضافه" ||
    selectedInvoice?.type === "اضافه" ||
    editingInvoice?.type === "اضافه";

  const [machines, setMachines] = useState([]);
  const [mechanisms, setMechanisms] = useState([]);
  const [invoiceNumbers, setInvoiceNumbers] = useState([]);

  const [isMachinesLoading, setIsMachinesLoading] = useState(false);
  const [isMechanismsLoading, setIsMechanismsLoading] = useState(false);
  const [isInvoiceNumbersLoading, setIsInvoiceNumbersLoading] = useState(false);

  // =================== [NEW] Snackbar ===================
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const showMessage = (message, type = "success") => {
    setSnackbar({ open: true, message, type });
  };

  // =================== [NEW] Backend error helper ===================
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
    if (!isEditing || justEditUnitPrice) return;

    let mounted = true;

    setIsMachinesLoading(true);
    getMachines({ all: true })
      .then((res) => {
        if (!mounted) return;
        const data = res.data;
        setMachines(data.machines || data || []);
      })
      .catch((err) => {
        console.error("getMachines error", err);
        showMessage(getBackendErrorMessage(err), "error"); // [CHANGED]
      })
      .finally(() => mounted && setIsMachinesLoading(false));

    setIsMechanismsLoading(true);
    getMechanisms({ all: true })
      .then((res) => {
        if (!mounted) return;
        const data = res.data;
        setMechanisms(data.mechanisms || data || []);
      })
      .catch((err) => {
        console.error("getMechanisms error", err);
        showMessage(getBackendErrorMessage(err), "error"); // [CHANGED]
      })
      .finally(() => mounted && setIsMechanismsLoading(false));

    if (isReturnType) {
      setIsInvoiceNumbersLoading(true);
      getInvoicesNumbers()
        .then((res) => {
          if (!mounted) return;

          const data = res.data;
          const nums = data?.["sales-invoices"]?.map((n) => n.toString()) || [];

          setInvoiceNumbers(nums);
        })
        .catch((err) => {
          console.error("getInvoicesNumbers error", err);
          showMessage(getBackendErrorMessage(err), "error"); // [CHANGED]
        })
        .finally(() => mounted && setIsInvoiceNumbersLoading(false));
    }

    return () => {
      mounted = false;
    };
  }, [isEditing, justEditUnitPrice, isReturnType]);

  const [openOriginalModal, setOpenOriginalModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const handleOpenOriginalInvoice = () => {
    if (editingInvoice.original_invoice_id) {
      setSelectedInvoiceId(editingInvoice.original_invoice_id);
      setOpenOriginalModal(true);
    }
  };

  return (
    <>
      {/* [NEW] SnackBar */}
      <SnackBar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        autoHideDuration={2500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />

      {/* 🔹 نفس البوردر مع Rounded من فوق فقط و بدون مسافة تحت */}
      <div className="border border-gray-300 border-b-0" dir="rtl">
        <table className="w-full text-sm">
          <tbody>
            {isReturnType && (
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-2 py-2 w-40 text-center font-semibold bg-[#dddddd]">
                  رقم الفاتورة الأصلية
                </td>
                <td className="border border-gray-300 px-2 py-2">
                  {isEditing && !justEditUnitPrice ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <CustomAutoCompleteField
                          isLoading={isInvoiceNumbersLoading}
                          values={invoiceNumbers || []}
                          editingItem={editingInvoice}
                          setEditingItem={setEditingInvoice}
                          fieldName="original_invoice_id"
                          placeholder="رقم الفاتورة"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!editingInvoice.original_invoice_id}
                        onClick={handleOpenOriginalInvoice}
                        className="px-3 py-1 text-xs bg-blue-600 text-white disabled:opacity-40"
                      >
                        عرض
                      </button>
                    </div>
                  ) : (
                    <span>{selectedInvoice.original_invoice_id || "-"}</span>
                  )}
                </td>
              </tr>
            )}

            {!isAdditionType && (
              <>
                <tr>
                  <td className="border border-gray-300 px-2 py-2 w-40 text-center font-semibold bg-[#dddddd]">
                    اسم الماكينة
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    {isEditing && !justEditUnitPrice ? (
                      <CustomAutoCompleteField
                        isLoading={isMachinesLoading}
                        values={machines}
                        editingItem={editingInvoice}
                        setEditingItem={setEditingInvoice}
                        fieldName="machine_name"
                        placeholder="اسم الماكينة"
                        isBig
                      />
                    ) : (
                      <span>{selectedInvoice.machine_name}</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="border border-gray-300 px-2 py-2 w-40 text-center font-semibold bg-[#dddddd]">
                    اسم الميكانيزم
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    {isEditing && !justEditUnitPrice ? (
                      <CustomAutoCompleteField
                        isLoading={isMechanismsLoading}
                        values={mechanisms}
                        editingItem={editingInvoice}
                        setEditingItem={setEditingInvoice}
                        fieldName="mechanism_name"
                        placeholder="اسم الميكانيزم"
                        isBig
                      />
                    ) : (
                      <span>{selectedInvoice.mechanism_name}</span>
                    )}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <OriginalInvoiceDialog
        open={openOriginalModal}
        onClose={() => setOpenOriginalModal(false)}
        invoiceId={selectedInvoiceId}
        canEsterdad={canEsterdad}
        canViewPrices={canViewPrices}
      />
    </>
  );
}

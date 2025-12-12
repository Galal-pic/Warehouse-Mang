import { useState } from "react";
import {
  confirmInvoice,
  deleteInvoice,
  returnWarrantyInvoice,
  confirmTalabSheraaInvoice,
  updateInvoice,
  getInvoice,
} from "../../../api/modules/invoicesApi";

/**
 * هُوك لكل أكشنات الفواتير
 * onRefresh: دالة لإعادة تحميل البيانات
 * setAlert: دالة لعرض رسالة
 * showConfirm: دالة تفتح مودال تأكيد وترجع Promise<boolean>
 * showPrompt: دالة تفتح مودال إدخال نص وترجع Promise<string | null>
 */
export function useInvoiceActions({ onRefresh, setAlert, showConfirm, showPrompt }) {
  const [confirmLoadingMap, setConfirmLoadingMap] = useState({});
  const [recoverLoadingMap, setRecoverLoadingMap] = useState({});
  const [singleDeleteLoading, setSingleDeleteLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const setConfirmLoading = (id, value) => {
    setConfirmLoadingMap((prev) => ({ ...prev, [id]: value }));
  };

  const setRecoverLoading = (id, value) => {
    setRecoverLoadingMap((prev) => ({ ...prev, [id]: value }));
  };

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

  // تأكيد / تغيير حالة الفاتورة
  const handleConfirmStatus = async (invoice) => {
    const id = invoice.id;
    setConfirmLoading(id, true);
    try {
      await confirmInvoice(id);
      setAlert?.({
        type: "success",
        message: "تم تحديث حالة الفاتورة بنجاح",
      });
      await onRefresh?.();
    } catch (error) {
      console.error(error);
      setAlert?.({
        type: "error",
        message: getBackendErrorMessage(error), // ✅ CHANGED
      });
    } finally {
      setConfirmLoading(id, false);
    }
  };

  // استرداد أمانات
  const handleRecoverDeposit = async (invoice) => {
    const id = invoice.id;
    setRecoverLoading(id, true);
    try {
      await returnWarrantyInvoice({ id });
      setAlert?.({
        type: "success",
        message: "تم استرداد الأمانات بنجاح",
      });
      await onRefresh?.();
    } catch (error) {
      console.error(error);
      setAlert?.({
        type: "error",
        message: getBackendErrorMessage(error), // ✅ CHANGED
      });
    } finally {
      setRecoverLoading(id, false);
    }
  };

  // 🔴 حذف فاتورة واحدة — باستخدام مودال تأكيد بدل window.confirm
  const handleDeleteOne = async (invoice) => {
    if (
      invoice.rawStatus === "confirmed" ||
      invoice.rawStatus === "returned" ||
      invoice.status === "تم" ||
      invoice.status === "تم الاسترداد"
    ) {
      setAlert?.({
        type: "warning",
        message: "لا يمكن حذف هذه الفاتورة لأنها مؤكدة أو تم استردادها",
      });
      return;
    }

    let confirmed = true;

    if (showConfirm) {
      confirmed = await showConfirm({
        title: "حذف فاتورة",
        message: "هل أنت متأكد من رغبتك في حذف هذه الفاتورة؟",
      });
    } else {
      confirmed = window.confirm("هل أنت متأكد من رغبتك في حذف هذه الفاتورة؟");
    }

    if (!confirmed) return;

    setSingleDeleteLoading(true);
    try {
      await deleteInvoice(invoice.id);
      setAlert?.({
        type: "success",
        message: "تم حذف الفاتورة بنجاح",
      });
      await onRefresh?.();
    } catch (error) {
      console.error(error);
      setAlert?.({
        type: "error",
        message: getBackendErrorMessage(error), // ✅ CHANGED
      });
    } finally {
      setSingleDeleteLoading(false);
    }
  };

  // 🔴 حذف مجموعة فواتير — برضه باستخدام مودال تأكيد
  const handleDeleteMany = async (selectedInvoices) => {
    if (!selectedInvoices || selectedInvoices.length === 0) return;

    const hasConfirmed = selectedInvoices.some(
      (invoice) =>
        invoice.rawStatus === "confirmed" ||
        invoice.rawStatus === "returned" ||
        invoice.status === "تم" ||
        invoice.status === "تم الاسترداد"
    );

    if (hasConfirmed) {
      setAlert?.({
        type: "warning",
        message: "لا يمكن حذف بعض الفواتير لأنها مؤكدة أو تم استردادها",
      });
      return;
    }

    let confirmed = true;

    if (showConfirm) {
      confirmed = await showConfirm({
        title: "حذف فواتير",
        message: "هل أنت متأكد من رغبتك في حذف الفواتير المحددة؟",
      });
    } else {
      confirmed = window.confirm(
        "هل أنت متأكد من رغبتك في حذف الفواتير المحددة؟"
      );
    }

    if (!confirmed) return;

    setBulkDeleteLoading(true);
    try {
      for (const invoice of selectedInvoices) {
        await deleteInvoice(invoice.id);
      }
      setAlert?.({
        type: "success",
        message: "تم حذف الفواتير المحددة بنجاح",
      });
      await onRefresh?.();
    } catch (error) {
      console.error(error);
      setAlert?.({
        type: "error",
        message: getBackendErrorMessage(error), // ✅ CHANGED
      });
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // قبول طلب شراء
  const handleAcceptPurchaseRequest = async (invoice) => {
    const id = invoice.id;
    setConfirmLoading(id, true);
    try {
      await confirmTalabSheraaInvoice({
        id,
        isPurchaseApproved: true,
      });
      setAlert?.({
        type: "success",
        message: "تم قبول طلب الشراء بنجاح",
      });
      await onRefresh?.();
    } catch (error) {
      console.error(error);
      setAlert?.({
        type: "error",
        message: getBackendErrorMessage(error), // ✅ CHANGED
      });
    } finally {
      setConfirmLoading(id, false);
    }
  };

  // 🔴 رفض طلب شراء + سبب الرفض — باستخدام مودال إدخال نص بدل window.prompt
  const handleRejectPurchaseRequest = async (invoice) => {
    const id = invoice.id;

    let reason = null;

    if (showPrompt) {
      reason = await showPrompt({
        title: "رفض طلب الشراء",
        message: "من فضلك أدخل سبب الرفض:",
        placeholder: "اكتب سبب الرفض هنا...",
      });
    } else {
      reason = window.prompt("من فضلك أدخل سبب الرفض:");
    }

    if (!reason || !reason.trim()) {
      return;
    }

    setConfirmLoading(id, true);
    try {
      await confirmTalabSheraaInvoice({
        id,
        isPurchaseApproved: false,
      });

      const res = await getInvoice(id);
      const currentInvoice = res.data;

      await updateInvoice({
        id,
        ...currentInvoice,
        comment: reason,
      });

      setAlert?.({
        type: "success",
        message: "تم رفض طلب الشراء وتسجيل سبب الرفض",
      });
      await onRefresh?.();
    } catch (error) {
      console.error(error);
      setAlert?.({
        type: "error",
        message: getBackendErrorMessage(error), // ✅ CHANGED
      });
    } finally {
      setConfirmLoading(id, false);
    }
  };

  return {
    confirmLoadingMap,
    recoverLoadingMap,
    singleDeleteLoading,
    bulkDeleteLoading,
    handleConfirmStatus,
    handleRecoverDeposit,
    handleDeleteOne,
    handleDeleteMany,
    handleAcceptPurchaseRequest,
    handleRejectPurchaseRequest,
  };
}

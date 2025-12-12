// src/features/invoices/pages/CreateInvoicePage.jsx
import React, { useState } from "react";
import { useInvoiceForm } from "../hooks/useInvoiceForm";
import InvoiceLayout from "../components/InvoiceLayout";
import SnackBar from "../../../components/common/SnackBar";
import { useInvoicePrint } from "../hooks/useInvoicePrint";
import TypeSelector from "../../../components/common/TypeSelector";

const operationTypes = ["صرف", "أمانات", "مرتجع", "توالف", "حجز", "تحويل"];
const purchasesTypes = ["اضافه"];

export default function CreateInvoicePage() {
  const {
    user,
    userLoading,
    voucherNumber,
    invoice,
    setInvoice,
    purchaseOrderInvoice,
    setPurchaseOrderInvoice,
    operationType,
    purchasesType,
    isInvoiceSaved,
    isPurchaseOrder,
    setIsPurchaseOrder,
    isPurchaseOrderSaved,
    isPurchaseOrderEditing,
    editingMode,
    selectedNowType,
    addRow,
    removeRow,
    date,
    time,
    showCommentField,
    setShowCommentField,
    showPurchaseOrderCommentField,
    setShowPurchaseOrderCommentField,
    handleTypeChange,
    handleSaveInvoice,
    handleSavePurchaseOrder,
    clearInvoice,
    clearPurchaseOrder,
    isSaving,
  } = useInvoiceForm();

  const canViewPrices = user?.view_prices || user?.username === "admin";

  const canCreateAdditions =
    user?.create_additions || user?.username === "admin";

  const canCreateInventoryOperations =
    user?.create_inventory_operations || user?.username === "admin";

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "",
  });

  const { handlePrint } = useInvoicePrint();

  if (userLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center text-red-600 font-semibold">
        فشل تحميل بيانات المستخدم
      </div>
    );
  }

  if (
    !user?.create_additions &&
    !user?.create_inventory_operations &&
    user?.username !== "admin"
  ) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center text-red-600 font-semibold">
        هذه الصفحة غير متوفرة
      </div>
    );
  }

  const showError = (message) =>
    setSnackbar({ open: true, message, type: "error" });

  const onSaveInvoice = async () => {
    if (purchasesTypes.includes(invoice.type) && !canCreateAdditions) {
      showError("ليست لديك صلاحية إنشاء فواتير الإضافات");
      return;
    }

    if (
      operationTypes.includes(invoice.type) &&
      !canCreateInventoryOperations
    ) {
      showError("ليست لديك صلاحية إنشاء العمليات المخزونية");
      return;
    }

    try {
      await handleSaveInvoice();
      setSnackbar({
        open: true,
        message: "تم حفظ الفاتورة بنجاح",
        type: "success",
      });
    } catch (e) {
      showError(e.message || "حدث خطأ في حفظ الفاتورة");
    }
  };

  const onSavePO = async () => {
    try {
      await handleSavePurchaseOrder();
      setSnackbar({
        open: true,
        message: "تم حفظ طلب الشراء بنجاح",
        type: "success",
      });
    } catch (e) {
      showError(e.message || "حدث خطأ في حفظ طلب الشراء");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-10" dir="rtl">
{!isInvoiceSaved && (
  <div className="max-w-7xl mx-auto mb-6">
    
    {/* شريط الخيارات */}
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg px-5 py-4 flex flex-wrap items-center justify-center gap-5">
      
      {/* نوع المشتريات */}
      {(user?.create_additions || user?.username === "admin") && (
        <div className="flex flex-col items-center">
          <label className="text-xs text-gray-600 mb-1">نوع المشتريات</label>
          <TypeSelector
            label=""
            value={purchasesType}
            options={purchasesTypes}
            onChange={(e) => handleTypeChange(e.target.value, true)}
            className="min-w-[130px]"
          />
        </div>
      )}

      {/* نوع العمليات */}
      {(user?.create_inventory_operations || user?.username === "admin") && (
        <div className="flex flex-col items-center">
          <label className="text-xs text-gray-600 mb-1">نوع العملية</label>
          <TypeSelector
            label=""
            value={operationType}
            options={operationTypes}
            onChange={(e) => handleTypeChange(e.target.value, false)}
            className="min-w-[130px]"
          />
        </div>
      )}

      {/* زر طلب الشراء */}
      <div className="flex flex-col items-center">
        <label className="text-xs text-gray-600 mb-1">طلب شراء</label>

        {!isPurchaseOrder ? (
          <button
            type="button"
            className="min-w-[130px] px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 transition text-white text-sm shadow-sm"
            onClick={() => setIsPurchaseOrder(true)}
          >
            إضافة طلب شراء
          </button>
        ) : (
          <button
            type="button"
            className="min-w-[130px] px-4 py-2 rounded-md border border-red-500 text-red-500 bg-white hover:bg-red-50 transition text-sm shadow-sm"
            onClick={() => setIsPurchaseOrder(false)}
          >
            إلغاء الطلب
          </button>
        )}
      </div>
    </div>
  </div>
)}


      <div className="max-w-7xl mx-auto">
        <div className="w-full overflow-x-auto overflow-y-visible">
          <div className={`gap-5 min-w-max ${isPurchaseOrder ? "flex" : ""}`}>
            {isPurchaseOrder && (
              <div className="flex-none bg-white border border-gray-300 rounded-md px-4 md:px-6 py-4 shadow-sm">
                <InvoiceLayout
                  className="printable-purchase-order"
                  selectedInvoice={{
                    ...purchaseOrderInvoice,
                    id: purchaseOrderInvoice.id ?? voucherNumber?.last_id,
                    type: "طلب شراء",
                    date,
                    time,
                    employee_name: user?.username,
                  }}
                  isEditing={isPurchaseOrderEditing}
                  editingInvoice={purchaseOrderInvoice}
                  setEditingInvoice={setPurchaseOrderInvoice}
                  selectedNowType={{ type: "طلب شراء" }}
                  addRow={() => addRow(true)}
                  deleteRow={(i) => removeRow(i, true)}
                  isPurchasesType={false}
                  showCommentField={showPurchaseOrderCommentField}
                  isCreate
                  canViewPrices={canViewPrices}
                />

                <div className="mt-6 flex flex-wrap justify-between gap-3">
                  {!isPurchaseOrderSaved ? (
                    <>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-lg text-sm font-semibold flex-1 min-w-[120px] ${
                          showPurchaseOrderCommentField
                            ? "border border-red-500 text-red-600 bg-white"
                            : "bg-green-600 text-white"
                        }`}
                        onClick={() =>
                          setShowPurchaseOrderCommentField(
                            !showPurchaseOrderCommentField
                          )
                        }
                      >
                        {showPurchaseOrderCommentField
                          ? "إلغاء التعليق"
                          : "إضافة تعليق"}
                      </button>

                      <button
                        type="button"
                        disabled={isSaving}
                        className="px-4 py-2 rounded-lg text-sm font-semibold flex-1 min-w-[120px] bg-blue-600 text-white disabled:opacity-60"
                        onClick={onSavePO}
                      >
                        {isSaving ? "جاري الحفظ..." : "تأكيد الحفظ"}
                      </button>

                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg text-sm font-semibold flex-1 min-w-[120px] bg-cyan-600 text-white"
                        onClick={clearPurchaseOrder}
                      >
                        طلب جديد
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg text-sm font-semibold flex-1 min-w-[120px] bg-blue-600 text-white"
                        onClick={clearPurchaseOrder}
                      >
                        طلب جديد
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg text-sm font-semibold flex-1 min-w-[120px] bg-green-600 text-white"
                        onClick={() => handlePrint("printable-purchase-order")}
                      >
                        طباعة الطلب
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex-none bg-white border border-gray-300 rounded-md px-4 md:px-6 py-4 shadow-sm">
              <InvoiceLayout
                className="printable-invoice"
                selectedInvoice={{
                  ...invoice,
                  id: invoice.id ?? voucherNumber?.last_id,
                  date,
                  time,
                  employee_name: user?.username,
                }}
                isEditing={editingMode}
                editingInvoice={invoice}
                setEditingInvoice={setInvoice}
                selectedNowType={selectedNowType}
                addRow={() => addRow(false)}
                deleteRow={(i) => removeRow(i, false)}
                isPurchasesType={!!purchasesType}
                showCommentField={showCommentField}
                isCreate
                canViewPrices={canViewPrices}
              />

              <div className="mt-6 flex flex-wrap justify-between gap-3">
                {!isInvoiceSaved ? (
                  <>
                    <button
                      type="button"
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex-1 min-w-[120px] ${
                        showCommentField
                          ? "border border-red-500 text-red-600 bg-white"
                          : "bg-green-600 text-white"
                      }`}
                      onClick={() => setShowCommentField(!showCommentField)}
                    >
                      {showCommentField ? "إلغاء التعليق" : "إضافة تعليق"}
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-lg text-sm font-semibold flex-1 min-w-[120px] bg-blue-600 text-white disabled:opacity-60"
                      onClick={onSaveInvoice}
                    >
                      {isSaving ? "جاري الحفظ..." : "تأكيد الحفظ"}
                    </button>

                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-sm font-semibold flex-1 min-w-[120px] bg-cyan-600 text-white"
                      onClick={clearInvoice}
                    >
                      فاتورة جديدة
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-sm font-semibold flex-1 min-w-[120px] bg-blue-600 text-white"
                      onClick={clearInvoice}
                    >
                      فاتورة جديدة
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-sm font-semibold flex-1 min-w-[120px] bg-green-600 text-white"
                      onClick={() => handlePrint("printable-invoice")}
                    >
                      طباعة الفاتورة
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
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

// src/features/invoices/manageInvoices/pages/ManageInvoicesPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { useInvoicesList } from "../hooks/useInvoicesList";
import { useInvoiceFilters } from "../hooks/useInvoiceFilters";
import { useInvoiceActions } from "../hooks/useInvoiceActions";

import InvoicesFilterTabs from "../components/InvoicesFilterTabs";
import InvoicesTable from "../components/InvoicesTable";
import InvoiceModal from "../components/InvoiceModal";
import InvoiceDetailsDialog from "../components/InvoiceDetailsDialog";
import InvoicesToolbar from "../components/InvoicesToolbar";

const ManageInvoicesPage = () => {
  const { user, isUserLoading, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const [alert, setAlert] = useState(null);

  // pagination
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);

  // selected invoice & dialogs
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [detailsInvoiceId, setDetailsInvoiceId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // selected rows for bulk actions
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // === مودال تأكيد عام ===
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    resolve: null,
  });

  // === مودال إدخال سبب (رفض طلب شراء مثلاً) ===
  const [promptState, setPromptState] = useState({
    open: false,
    title: "",
    message: "",
    placeholder: "",
    resolve: null,
    value: "",
  });

  // === filters ===
  const { filters, selectedFilter, selectedIndex, setSelectedIndex } =
    useInvoiceFilters(user);

  // === invoices list ===
  const {
    invoices,
    totalPages,
    totalItems,
    loading: invoicesLoading,
    refetch,
  } = useInvoicesList({
    selectedFilter,
    page,
    pageSize,
  });

  // دالة لفتح مودال تأكيد وترجع Promise<boolean>
  const showConfirm = useCallback(({ title, message }) => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        title,
        message,
        resolve,
      });
    });
  }, []);

  // دالة لفتح مودال إدخال نص وترجع Promise<string | null>
  const showPrompt = useCallback(({ title, message, placeholder }) => {
    return new Promise((resolve) => {
      setPromptState({
        open: true,
        title,
        message,
        placeholder: placeholder || "",
        resolve,
        value: "",
      });
    });
  }, []);

  // === actions hook ===
  const {
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
  } = useInvoiceActions({
    onRefresh: refetch,
    setAlert,
    showConfirm,
    showPrompt,
  });

  const hasAnyPermission =
    user &&
    (user.view_additions ||
      user.view_withdrawals ||
      user.view_deposits ||
      user.view_returns ||
      user.view_damages ||
      user.view_reservations ||
      user.view_purchase_requests ||
      user.view_transfers ||
      user.username === "admin");

  const handleChangeFilter = (index) => {
    setSelectedIndex(index);
    setSelectedRowIds([]);
    setPage(0);
  };

  const openInvoice = useCallback((invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
  }, []);

  const closeInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedInvoice(null);
  };

  const openDetails = (invoice) => {
    setDetailsInvoiceId(invoice.id);
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    setIsDetailsOpen(false);
    setDetailsInvoiceId(null);
  };

  const handleToggleSelectRow = (invoiceId) => {
    setSelectedRowIds((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleSelectAllRows = (checked) => {
    if (checked) {
      setSelectedRowIds(invoices.map((inv) => inv.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
      setSelectedRowIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    const selectedInvoices = invoices.filter((inv) =>
      selectedRowIds.includes(inv.id)
    );
    await handleDeleteMany(selectedInvoices);
    setSelectedRowIds([]);
  };

  const handleInvoiceUpdated = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <p className="text-lg font-semibold">جارِ تحميل البيانات...</p>
      </div>
    );
  }

  if (!hasAnyPermission) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <h1 className="text-2xl font-bold text-red-600">
          هذه الصفحة غير متاحة لك
        </h1>
      </div>
    );
  }

  return (
    <div className="w-[95%] mx-auto pt-24 pb-6 space-y-4">
      <div className="w-full text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
          العمليات
        </h1>
      </div>

      {/* Alert */}
      {alert && (
        <div
          className={`border px-4 py-2 rounded-md text-right ${
            alert.type === "success"
              ? "bg-green-50 border-green-400 text-green-700"
              : alert.type === "warning"
              ? "bg-yellow-50 border-yellow-400 text-yellow-700"
              : "bg-red-50 border-red-400 text-red-700"
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="flex-1">{alert.message}</span>
            <button
              onClick={() => setAlert(null)}
              className="ml-4 text-sm underline"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <InvoicesFilterTabs
        filters={filters}
        selectedIndex={selectedIndex}
        onChange={handleChangeFilter}
      />

      {/* Toolbar */}
      <InvoicesToolbar
        selectedCount={selectedRowIds.length}
        onDeleteSelected={handleBulkDelete}
        bulkDeleteLoading={bulkDeleteLoading}
        invoices={invoices}
      />

      {/* Table */}
      <InvoicesTable
        user={user}
        invoices={invoices}
        loading={invoicesLoading}
        selectedRowIds={selectedRowIds}
        onToggleSelectRow={handleToggleSelectRow}
        onSelectAll={handleSelectAllRows}
        onOpenInvoice={openInvoice}
        onShowDetails={openDetails}
        onDeleteOne={handleDeleteOne}
        onRecoverDeposit={handleRecoverDeposit}
        onConfirmStatus={handleConfirmStatus}
        onAcceptPurchaseRequest={handleAcceptPurchaseRequest}
        onRejectPurchaseRequest={handleRejectPurchaseRequest}
        confirmLoadingMap={confirmLoadingMap}
        recoverLoadingMap={recoverLoadingMap}
        singleDeleteLoading={singleDeleteLoading}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 0}
            className="px-3 py-1 rounded border text-sm disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-sm">
            صفحة {page + 1} من {totalPages} (إجمالي {totalItems} فاتورة)
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page + 1 >= totalPages}
            className="px-3 py-1 rounded border text-sm disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}

      {/* Invoice Modal */}
      {isInvoiceModalOpen && selectedInvoice && (
        <InvoiceModal
          open={isInvoiceModalOpen}
          onClose={closeInvoiceModal}
          invoice={selectedInvoice}
          user={user}
          onInvoiceUpdated={handleInvoiceUpdated}
        />
      )}

      {/* Details dialog */}
      {isDetailsOpen && detailsInvoiceId && (
        <InvoiceDetailsDialog
          open={isDetailsOpen}
          onClose={closeDetails}
          invoiceId={detailsInvoiceId}
          user={user}
        />
      )}

      {/* 🔵 Modal تأكيد عام */}
      {confirmState.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            confirmState.resolve?.(false);
            setConfirmState((prev) => ({ ...prev, open: false }));
          }}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-sm p-4"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2 text-slate-800">
              {confirmState.title}
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              {confirmState.message}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded border border-gray-300"
                onClick={() => {
                  confirmState.resolve?.(false);
                  setConfirmState((prev) => ({ ...prev, open: false }));
                }}
              >
                إلغاء
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  confirmState.resolve?.(true);
                  setConfirmState((prev) => ({ ...prev, open: false }));
                }}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 Modal إدخال سبب (رفض طلب شراء) */}
      {promptState.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            promptState.resolve?.(null);
            setPromptState((prev) => ({ ...prev, open: false, value: "" }));
          }}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-md p-4"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2 text-slate-800">
              {promptState.title}
            </h2>
            <p className="text-sm text-slate-600 mb-3">
              {promptState.message}
            </p>
            <textarea
              className="w-full border rounded-md px-2 py-1.5 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-blue-600"
              rows={3}
              placeholder={promptState.placeholder}
              value={promptState.value}
              onChange={(e) =>
                setPromptState((prev) => ({ ...prev, value: e.target.value }))
              }
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded border border-gray-300"
                onClick={() => {
                  promptState.resolve?.(null);
                  setPromptState((prev) => ({
                    ...prev,
                    open: false,
                    value: "",
                  }));
                }}
              >
                إلغاء
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  promptState.resolve?.(promptState.value);
                  setPromptState((prev) => ({ ...prev, open: false }));
                }}
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageInvoicesPage;

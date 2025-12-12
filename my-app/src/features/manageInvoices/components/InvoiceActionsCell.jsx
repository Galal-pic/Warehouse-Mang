// src/features/manageInvoices/components/InvoiceActionsCell.jsx
import React from "react";
import ArticleIcon from "@mui/icons-material/Article";

// ==== أيقونات MUI ====
import LaunchIcon from "@mui/icons-material/Launch"; // فتح الفاتورة
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined"; // حذف

const InvoiceActionsCell = ({
  invoice,
  user,
  onOpenInvoice,
  onDeleteOne,
  onShowDetails,
  onRecoverDeposit,
  recoverLoading,
  singleDeleteLoading,
}) => {
  const isAdmin = user?.username === "admin";
  const canDelete = user?.can_delete || isAdmin;
  const canViewPrices = user?.view_prices || isAdmin;
  const canRecoverDeposits = user?.can_recover_deposits || isAdmin;

  const isDeposit = invoice.type === "أمانات";

  const showDetailsAllowed =
    canViewPrices &&
    invoice.type !== "اضافه" &&
    invoice.type !== "طلب شراء" &&
    invoice.type !== "تحويل";

  const isReturned =
    invoice.status === "تم الاسترداد" || invoice.status === "استرداد جزئي";

  return (
    <div className="flex items-center justify-center gap-2">
      {/* === زر فتح الفاتورة === */}
      <button
        type="button"
        onClick={() => onOpenInvoice(invoice)}
        className="px-2 py-1 text-xs rounded bg-white hover:bg-slate-100 flex items-center gap-1"
      >
        <LaunchIcon fontSize="small" />
      </button>

      {/* === حذف === */}
      {canDelete && (
        <button
          type="button"
          onClick={() => onDeleteOne(invoice)}
          disabled={singleDeleteLoading}
          className="px-2 py-1 text-xs rounded text-red-600 bg-white disabled:opacity-60 flex items-center gap-1"
        >
          <ClearOutlinedIcon fontSize="small" />
        </button>
      )}

      {/* === تفاصيل سعرية === */}
      {showDetailsAllowed && (
        <button
          type="button"
          onClick={() => onShowDetails(invoice)}
          className="px-2 py-1 text-xs rounded border bg-white flex items-center gap-1"
        >
          <ArticleIcon sx={{ color: "#001473" }} />
        </button>
      )}

      {/* === أمانات === */}
      {isDeposit && (
        <div className="text-xs">
          {isReturned ? (
            <span className="text-green-600 font-semibold">
              {invoice.status}
            </span>
          ) : canRecoverDeposits ? (
            <button
              type="button"
              onClick={() => onOpenInvoice(invoice)}
              disabled={recoverLoading}
              className="px-2 py-1 text-xs rounded border border-cyan-600 text-cyan-700 bg-white hover:bg-cyan-50 disabled:opacity-60 flex items-center gap-1"
            >
              {recoverLoading ? "..." : "استرداد"}
            </button>
          ) : (
            <span className="text-slate-500">أمانات (بدون صلاحية استرداد)</span>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceActionsCell;

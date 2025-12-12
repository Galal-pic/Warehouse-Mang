// src/features/reports/pages/ReportsLayout.jsx
import React, { useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import SnackBar from "../../../components/common/SnackBar";
import InvoiceModal from "../../manageInvoices/components/InvoiceModal";
import InvoiceDetailsDialog from "../../manageInvoices/components/InvoiceDetailsDialog";
import ItemDetailsDialog from "../components/ItemDetailsDialog";
import { useReportsLogic } from "../hooks/useReportsLogic";

// ماب حالة الفاتورة عربي/إنجليزي للعناوين في الـ URL
const STATUS_EN_TO_AR = {
  draft: "لم تراجع",
  accreditation: "لم تؤكد",
  confirmed: "تم",
  partially_returned: "استرداد جزئي",
  returned: "تم الاسترداد",
};

const STATUS_AR_TO_EN = {
  "لم تراجع": "draft",
  "لم تؤكد": "accreditation",
  تم: "confirmed",
  "استرداد جزئي": "partially_returned",
  "تم الاسترداد": "returned",
};

export default function ReportsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // قراءة القيم من الـ URL لتهيئة الـ hook
  const reportTypeFromUrl = searchParams.get("reportType") || "";
  const pageFromUrl = searchParams.get("page");
  const initialPage = pageFromUrl ? parseInt(pageFromUrl, 10) - 1 : 0;

  const initialFilters = {};
  searchParams.forEach((value, key) => {
    if (key === "reportType" || key === "page") return;

    if (key === "status") {
      initialFilters.status = STATUS_AR_TO_EN[value] || value;
    } else {
      initialFilters[key] = value;
    }
  });

  const reports = useReportsLogic(
    reportTypeFromUrl,
    initialPage,
    initialFilters
  );
  const { user, isUserLoading, snackbar, setSnackbar } = reports;

  // مودالات
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceDetailsOpen, setInvoiceDetailsOpen] = useState(false);
  const [invoiceDetailsId, setInvoiceDetailsId] = useState(null);
  const [itemDetailsOpen, setItemDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleOpenInvoice = (inv) => {
    setSelectedInvoice(inv);
    setInvoiceModalOpen(true);
  };

  const handleOpenInvoiceDetails = (inv) => {
    if (!inv?.id) return;
    setInvoiceDetailsId(inv.id);
    setInvoiceDetailsOpen(true);
  };

  const handleOpenItemDetails = (item) => {
    setSelectedItem(item);
    setItemDetailsOpen(true);
  };

  // بناء الـ URL الحالي من الفلاتر
  const buildSearchParams = () => {
    const params = new URLSearchParams();

    if (reports.reportType) {
      params.set("reportType", reports.reportType);
    }

    Object.entries(reports.filters).forEach(([key, value]) => {
      if (!value || value.toString().trim() === "") return;

      if (key === "status") {
        const ar = STATUS_EN_TO_AR[value] || value;
        params.set("status", ar);
      } else {
        params.set(key, value);
      }
    });

    if (reports.page > 0) {
      params.set("page", reports.page + 1);
    }

    return params;
  };

  const handleCopySearchLink = () => {
    const params = buildSearchParams();

    const searchUrl = `${window.location.origin}/reports/search?${params.toString()}`;
    navigator.clipboard
      .writeText(searchUrl)
      .then(() => {
        setSnackbar({
          open: true,
          message: "تم نسخ رابط البحث إلى الحافظة",
          type: "success",
        });
      })
      .catch(() => {
        setSnackbar({
          open: true,
          message: "فشل نسخ الرابط",
          type: "error",
        });
      });
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const onResultsPage = location.pathname.startsWith("/reports/search");

  return (
    <div className="w-[95%] mx-auto pt-10 pb-10" dir="rtl">
      {/* الهيدر */}
      <div className="flex items-center justify-between mb-2">
        {onResultsPage && (
          <button
            type="button"
            onClick={handleCopySearchLink}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                 transition-colors flex items-center gap-1.5 text-xs"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            نسخ رابط البحث
          </button>
        )}
      </div>

      {/* صفحات الأبناء (فلاتر / نتائج) - نمرر لهم كل حاجة عبر context */}
      <Outlet
        context={{
          reports,
          onOpenInvoice: handleOpenInvoice,
          onOpenInvoiceDetails: handleOpenInvoiceDetails,
          onOpenItemDetails: handleOpenItemDetails,
        }}
      />

      {/* مودال الفاتورة */}
      {invoiceModalOpen && selectedInvoice && (
        <InvoiceModal
          open={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          invoice={selectedInvoice}
          user={user}
        />
      )}

      {/* مودال تفاصيل الأسعار (FIFO) */}
      {invoiceDetailsOpen && invoiceDetailsId && (
        <InvoiceDetailsDialog
          open={invoiceDetailsOpen}
          onClose={() => setInvoiceDetailsOpen(false)}
          invoiceId={invoiceDetailsId}
        />
      )}

      {/* تفاصيل العنصر (مخازن) */}
      {itemDetailsOpen && selectedItem && (
        <ItemDetailsDialog
          open={itemDetailsOpen}
          onClose={() => setItemDetailsOpen(false)}
          item={selectedItem}
          canViewPrices={reports.canViewPrices}
        />
      )}

      {/* Snackbar */}
      <SnackBar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}

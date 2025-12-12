// src/features/reports/components/ReportsResults.jsx
import React, { useState } from "react";
import LaunchIcon from "@mui/icons-material/Launch";
import ArticleIcon from "@mui/icons-material/Article";
import ItemDetailsDialog from "./ItemDetailsDialog";

const STATUS_EN_TO_AR = {
  draft: { text: "لم تراجع", color: "bg-red-100 text-red-800 border-red-200" },
  accreditation: {
    text: "لم تؤكد",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  confirmed: {
    text: "تم",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  partially_returned: {
    text: "استرداد جزئي",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  returned: {
    text: "تم الاسترداد",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
};

const TYPE_COLORS = {
  اضافه: "bg-green-50 text-green-700 border-green-200",
  صرف: "bg-red-50 text-red-700 border-red-200",
  أمانات: "bg-blue-50 text-blue-700 border-blue-200",
  مرتجع: "bg-yellow-50 text-yellow-700 border-yellow-200",
  توالف: "bg-gray-50 text-gray-700 border-gray-200",
  حجز: "bg-purple-50 text-purple-700 border-purple-200",
  "طلب شراء": "bg-indigo-50 text-indigo-700 border-indigo-200",
  تحويل: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export default function ReportsResults({
  reportType,
  results,
  isLoading,
  canViewPrices,
  page,
  totalPages,
  totalItems,
  onPageChange,
  onBackToFilters,
  onOpenInvoice,
  onOpenInvoiceDetails,
  onOpenItemDetails,
}) {
  const [infoModal, setInfoModal] = useState(null);

  const handlePrint = () => {
    const isInvoices = reportType === "فواتير";
    const data = results || [];
    if (!data.length) {
      setInfoModal("لا توجد بيانات للطباعة");
      return;
    }

    const win = window.open("", "_blank");
    if (!win) return;

    let head = "";
    let body = "";
    let title = isInvoices ? "تقرير الفواتير" : "تقرير المخازن";

    if (isInvoices) {
      head = `
        <tr>
          <th>#</th>
          <th>نوع العملية</th>
          <th>تاريخ الإصدار</th>
          ${canViewPrices ? "<th>الإجمالي</th>" : ""}
          <th>الحالة</th>
          <th>اسم الموظف</th>
          <th>اسم العميل</th>
          <th>المراجع</th>
          <th>عامل المخزن</th>
          <th>الماكينة</th>
          <th>الميكانيزم</th>
          <th>المورد</th>
        </tr>
      `;
      body = data
        .map(
          (inv) => `
          <tr>
            <td>${inv.id ?? "-"}</td>
            <td>${inv.type ?? "-"}</td>
            <td>${inv.created_at ? inv.created_at.split(" ")[0] : "-"}</td>
            ${
              canViewPrices
                ? `<td>${
                    ["طلب شراء", "تحويل"].includes(inv.type)
                      ? "-"
                      : (inv.total_amount ?? 0)
                  }</td>`
                : ""
            }
            <td>${STATUS_EN_TO_AR[inv.status]?.text || inv.status || "-"}</td>
            <td>${inv.employee_name || "-"}</td>
            <td>${inv.client_name || "-"}</td>
            <td>${inv.accreditation_manager || "-"}</td>
            <td>${inv.warehouse_manager || "-"}</td>
            <td>${inv.machine || "-"}</td>
            <td>${inv.mechanism || "-"}</td>
            <td>${inv.supplier || "-"}</td>
          </tr>
        `
        )
        .join("");
    } else {
      head = `
        <tr>
          <th>#</th>
          <th>اسم العنصر</th>
          <th>باركود العنصر</th>
          <th>تاريخ الإنشاء</th>
        </tr>
      `;
      body = data
        .map(
          (item) => `
          <tr>
            <td>${item.id ?? "-"}</td>
            <td>${item.item_name ?? "-"}</td>
            <td>${item.item_bar ?? "-"}</td>
            <td>${item.created_at ? item.created_at.split(" ")[0] : "-"}</td>
          </tr>
        `
        )
        .join("");
    }

    win.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            h2 { text-align: center; margin-bottom: 20px; color: #1f2937; }
            .print-header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #3b82f6; }
            .print-header h1 { color: #1e40af; margin: 0; }
            .print-meta { text-align: center; color: #6b7280; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #d1d5db; }
            th { background: #1f2937; color: white; padding: 12px 8px; font-weight: 600; border: 1px solid #374151; }
            td { padding: 10px 8px; border: 1px solid #d1d5db; text-align: center; }
            tr:nth-child(even) { background: #f9fafb; }
            .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${title}</h1>
          </div>
          <div class="print-meta">
            <p>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-EG")} | عدد السجلات: ${data.length}</p>
          </div>
          <table>
            <thead>${head}</thead>
            <tbody>${body}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleExportCsv = () => {
    const isInvoices = reportType === "فواتير";
    const data = results || [];
    if (!data.length) {
      setInfoModal("لا توجد بيانات للتصدير");
      return;
    }

    const escapeVal = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    let headers = [];
    let rows = [];

    if (isInvoices) {
      headers = [
        "#",
        "نوع العملية",
        "تاريخ الإصدار",
        ...(canViewPrices ? ["الإجمالي"] : []),
        "الحالة",
        "اسم الموظف",
        "اسم العميل",
        "المراجع",
        "عامل المخزن",
        "الماكينة",
        "الميكانيزم",
        "المورد",
      ];
      rows = data.map((inv) => [
        inv.id ?? "-",
        inv.type ?? "-",
        inv.created_at ? inv.created_at.split(" ")[0] : "-",
        ...(canViewPrices
          ? [
              ["طلب شراء", "تحويل"].includes(inv.type)
                ? "-"
                : inv.total_amount ?? 0,
            ]
          : []),
        STATUS_EN_TO_AR[inv.status]?.text || inv.status || "-",
        inv.employee_name || "-",
        inv.client_name || "-",
        inv.accreditation_manager || "-",
        inv.warehouse_manager || "-",
        inv.machine || "-",
        inv.mechanism || "-",
        inv.supplier || "-",
      ]);
    } else {
      headers = ["#", "اسم العنصر", "باركود العنصر", "تاريخ الإنشاء"];
      rows = data.map((item) => [
        item.id ?? "-",
        item.item_name ?? "-",
        item.item_bar ?? "-",
        item.created_at ? item.created_at.split(" ")[0] : "-",
      ]);
    }

    const csvLines = [
      headers.map(escapeVal).join(","),
      ...rows.map((r) => r.map(escapeVal).join(",")),
    ];
    const csv = csvLines.join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${
      isInvoices ? "تقرير_فواتير" : "تقرير_مخازن"
    }_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="h-20 w-20 border-4 border-blue-200 rounded-full"></div>
          <div className="h-20 w-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="mt-6 text-lg font-medium text-gray-700">
          جاري تحميل النتائج...
        </p>
        <p className="mt-2 text-sm text-gray-500">يرجى الانتظار قليلاً</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* مودال معلومات بسيط بدل alert() */}
      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-4" dir="rtl">
            <h2 className="text-lg font-semibold mb-2 text-slate-800">تنبيه</h2>
            <p className="text-sm text-slate-600 mb-4">{infoModal}</p>
            <div className="flex justify-end">
              <button
                className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setInfoModal(null)}
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 
                rounded-xl p-4 mb-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={onBackToFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border 
                     border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 
                     transition-all duration-200 shadow-sm text-xs"
              >
                <svg
                  className="w-4 h-4 transform rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
                <span>عودة للفلاتر</span>
              </button>

              <div className="px-3 py-1.5 bg-white rounded-md border border-gray-200 text-xs">
                <span className="text-gray-600">نوع التقرير:</span>
                <span className="font-semibold text-blue-600 mr-1">
                  {reportType}
                </span>
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900">نتائج البحث</h2>
            <p className="text-gray-600 text-xs mt-0.5">
              تم العثور على {totalItems} نتيجة
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-md bg-white border border-gray-300 
                   text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all 
                   duration-200 shadow-sm flex items-center gap-1.5 text-xs"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                ></path>
              </svg>
              طباعة
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 
                   text-white hover:from-emerald-600 hover:to-emerald-700 transition-all 
                   duration-200 shadow flex items-center gap-1.5 text-xs"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              تصدير CSV
            </button>
          </div>
        </div>
      </div>

      {!results.length ? (
        // لو مفيش نتائج
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-12 text-center">
          <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center bg-gray-100 rounded-full">
            <span className="text-4xl">🔍</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            لا توجد نتائج
          </h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            لم يتم العثور على نتائج مطابقة لمعايير البحث المحددة. حاول تعديل
            الفلاتر للحصول على نتائج.
          </p>
          <button
            type="button"
            onClick={onBackToFilters}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            تعديل الفلاتر
          </button>
        </div>
      ) : reportType === "فواتير" ? (
        // لو التقرير فواتير نعرض جدول الفواتير
        <InvoicesTable
          rows={results}
          canViewPrices={canViewPrices}
          onOpenInvoice={onOpenInvoice}
          onOpenInvoiceDetails={onOpenInvoiceDetails}
        />
      ) : (
        // لو التقرير مخازن ➜ نعرض أول عنصر مباشرة في الديالوج
        <ItemDetailsDialog
          open={true}
          onClose={onBackToFilters}
          item={results}
          canViewPrices={canViewPrices}
        />
      )}

      {totalPages > 1 && (
        <div className="mt-10 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              عرض{" "}
              <span className="font-semibold text-gray-900">
                {page * 10 + 1}-{Math.min((page + 1) * 10, totalItems)}
              </span>{" "}
              من أصل{" "}
              <span className="font-semibold text-gray-900">{totalItems}</span>{" "}
              نتيجة
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 0}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5 transform rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
                السابق
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (page < 3) {
                    pageNum = i;
                  } else if (page > totalPages - 4) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => onPageChange(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        page === pageNum
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}

                {totalPages > 5 && page < totalPages - 3 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <button
                      type="button"
                      onClick={() => onPageChange(totalPages - 1)}
                      className="w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page + 1 >= totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                التالي
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
              </button>
            </div>

            <div className="text-sm text-gray-600">
              الصفحة{" "}
              <span className="font-semibold text-gray-900">{page + 1}</span> من{" "}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =================== جدول الفواتير =================== */

function InvoicesTable({
  rows,
  canViewPrices,
  onOpenInvoice,
  onOpenInvoiceDetails,
}) {
  return (
    <div className="bg-white border border-[#032766]/25 rounded-md shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#032766]">
            <tr>
              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                #
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                النوع
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                تاريخ الإصدار
              </th>

              {canViewPrices && (
                <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                  الإجمالي
                </th>
              )}

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                الماكينة
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                الميكانيزم
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                العناصر
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                المورد
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                الموظف
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                المراجع
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                العميل
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                عامل المخزن
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10">
                الحالة
              </th>

              <th className="px-3 py-2 text-center text-[11px] font-semibold text-white">
                الإجراءات
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {rows.map((inv, index) => {
              const showDetailsButton =
                canViewPrices &&
                !["اضافه", "مرتجع", "طلب شراء", "تحويل"].includes(inv.type);

              return (
                <tr
                  key={inv.id}
                  className={`transition-colors duration-150 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                  } hover:bg-slate-100`}
                >
                  <td className="px-2 py-1.5 whitespace-nowrap text-center">
                    <span className="text-[12px] font-bold text-gray-900">
                      #{inv.id}
                    </span>
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        TYPE_COLORS[inv.type] ||
                        "bg-gray-100 text-gray-800 border-gray-200"
                      }`}
                    >
                      {inv.type || "-"}
                    </span>
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap text-center">
                    <div className="text-[12px] text-gray-800">
                      {inv.created_at ? inv.created_at.split(" ")[0] : "-"}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {inv.created_at
                        ? inv.created_at.split(" ")[1]?.substring(0, 5)
                        : ""}
                    </div>
                  </td>

                  {canViewPrices && (
                    <td className="px-2 py-1.5 whitespace-nowrap text-center">
                      <div className="text-[12px] font-bold text-blue-800">
                        {["طلب شراء", "تحويل"].includes(inv.type)
                          ? "-"
                          : (inv.total_amount ?? 0).toLocaleString()}
                        {!["طلب شراء", "تحويل"].includes(inv.type) && (
                          <span className="text-[10px] text-gray-500 mr-0.5">
                            ج
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  <td className="px-2 py-1.5 whitespace-nowrap text-center text-[12px] text-gray-800">
                    {inv.machine || "-"}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap text-center text-[12px] text-gray-800">
                    {inv.mechanism || "-"}
                  </td>

                  <td className="px-2 py-1.5 max-w-xs text-center">
                    <div className="text-[11px] text-gray-800 truncate">
                      {(inv.items || []).map((it) => it.item_name).join("، ")}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {(inv.items || []).length} عنصر
                    </div>
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap text-center text-[12px] text-gray-800">
                    {inv.supplier || "-"}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap text-center">
                    <span className="text-[12px] text-gray-900">
                      {inv.employee_name || "-"}
                    </span>
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap text-center text-[12px] text-gray-800">
                    {inv.accreditation_manager || "-"}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap text-center">
                    <span className="text-[12px] text-gray-900">
                      {inv.client_name || "-"}
                    </span>
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap text-center text-[12px] text-gray-800">
                    {inv.warehouse_manager || "-"}
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        STATUS_EN_TO_AR[inv.status]?.color ||
                        "bg-gray-100 text-gray-800 border-gray-200"
                      }`}
                    >
                      {STATUS_EN_TO_AR[inv.status]?.text || inv.status || "-"}
                    </span>
                  </td>

                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(inv)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#032766] bg-white transition-colors"
                        title="فتح الفاتورة"
                      >
                        <LaunchIcon sx={{ color: "#4caf50" }} />
                      </button>

                      {showDetailsButton && (
                        <button
                          type="button"
                          onClick={() => onOpenInvoiceDetails(inv)}
                          className="text-[11px] px-2 py-1 rounded-md text-emerald-700 transition-colors"
                        >
                          <ArticleIcon sx={{ color: "#001473" }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =================== جدول المخازن =================== */

function ItemsTable({ rows, onOpenItemDetails }) {
  return (
    <div className="bg-white border border-[#032766]/25 rounded-md shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#032766]">
            <tr>
              <th
                scope="col"
                className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10"
              >
                فتح
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10"
              >
                باركود العنصر
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10"
              >
                اسم العنصر
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-center text-[11px] font-semibold text-white border-l border-white/10"
              >
                تاريخ الإنشاء
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-center text-[11px] font-semibold text-white"
              >
                #
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {rows.map((item, index) => (
              <tr
                key={item.id}
                className={`transition-colors duration-150 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                } hover:bg-slate-100`}
              >
                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                  <button
                    type="button"
                    onClick={() => onOpenItemDetails(item)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#032766]/30 text-[#032766] bg-white hover:bg-[#032766]/10 transition-colors"
                    title="تفاصيل العنصر"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      ></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      ></path>
                    </svg>
                  </button>
                </td>

                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                  <span className="font-mono text-[12px] text-gray-900 bg-slate-50 px-3 py-1 rounded-md border border-slate-200 inline-block">
                    {item.item_bar}
                  </span>
                </td>

                <td className="px-2 py-1.5 text-center">
                  <div className="text-[12px] font-semibold text-gray-900">
                    {item.item_name}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {item.locations?.length || 0} موقع
                  </div>
                </td>

                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                  <div className="text-[12px] text-gray-800">
                    {item.created_at ? item.created_at.split(" ")[0] : "-"}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    منذ{" "}
                    {item.created_at
                      ? Math.floor(
                          (new Date() - new Date(item.created_at)) /
                            (1000 * 60 * 60 * 24)
                        )
                      : "?"}{" "}
                    يوم
                  </div>
                </td>

                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                  <span className="text-[12px] font-bold text-gray-900">
                    #{item.id}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

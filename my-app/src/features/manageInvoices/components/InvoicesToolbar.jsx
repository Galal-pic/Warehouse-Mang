import React, { useRef } from "react";

const InvoicesToolbar = ({
  selectedCount,
  onDeleteSelected,
  bulkDeleteLoading,
  invoices,
}) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    if (!invoices || invoices.length === 0) return;

    const printWindow = window.open("", "_blank", "width=900,height=600");
    if (!printWindow) return;

    const html = `
      <html dir="rtl">
        <head>
          <title>تقرير الفواتير</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h2>تقرير الفواتير</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>نوع العملية</th>
                <th>الحالة</th>
                <th>أسماء العناصر</th>
                <th>اسم الموظف</th>
                <th>عامل المخازن</th>
                <th>المراجع</th>
                <th>اسم العميل</th>
                <th>تاريخ الإصدار</th>
                <th>وقت الإصدار</th>
              </tr>
            </thead>
            <tbody>
              ${invoices
                .map(
                  (inv) => `
                <tr>
                  <td>${inv.id}</td>
                  <td>${inv.type || ""}</td>
                  <td>${inv.status || ""}</td>
                  <td>${inv.itemsNames || ""}</td>
                  <td>${inv.employee_name || ""}</td>
                  <td>${inv.warehouse_manager || ""}</td>
                  <td>${inv.accreditation_manager || ""}</td>
                  <td>${inv.client_name || ""}</td>
                  <td>${inv.date || ""}</td>
                  <td>${inv.time || ""}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-2 mt-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2 rounded-md text-sm font-semibold bg-cyan-600 text-white hover:bg-cyan-700 transition"
        >
          طباعة التقرير
        </button>
      </div>
{/* 
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={bulkDeleteLoading}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition"
          >
            {bulkDeleteLoading
              ? "جاري الحذف..."
              : `حذف المحدد (${selectedCount})`}
          </button>
        )}
      </div> */}

      {/* hidden ref just in case نحتاجه مستقبلًا */}
      <div ref={printRef} className="hidden" />
    </div>
  );
};

export default InvoicesToolbar;

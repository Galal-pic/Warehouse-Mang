import React, { useMemo, useState } from "react";

export default function ItemDetailsDialog({
  open,
  onClose,
  item,
  canViewPrices = false,
}) {
  const [activeTab, setActiveTab] = useState("locations");

  const normalizedItem = useMemo(
    () => (Array.isArray(item) ? item[0] || null : item),
    [item]
  );

  const statusMap = useMemo(
    () => ({
      draft: { text: "لم تراجع" },
      accreditation: { text: "لم تؤكد" },
      confirmed: { text: "تم" },
      partially_returned: { text: "استرداد جزئي" },
      returned: { text: "تم الاسترداد" },
    }),
    []
  );

  if (!normalizedItem) return null;

  const locations = normalizedItem.locations || [];
  const prices = normalizedItem.prices || [];
  const invoiceHistory = normalizedItem.invoice_history || [];

  const totalQuantity = locations.reduce(
    (sum, loc) => sum + (Number(loc.quantity) || 0),
    0
  );

  const escapeVal = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const exportTabToCsv = () => {
    let headers = [];
    let rows = [];

    if (activeTab === "locations") {
      headers = ["الموقع", "الكمية"];
      rows = locations.map((loc) => [loc.location ?? "-", loc.quantity ?? "0"]);
    } else if (activeTab === "prices") {
      headers = [];
      if (canViewPrices) headers.push("سعر الوحدة");
      headers.push("الكمية", "التاريخ", "# الفاتورة");

      rows = prices.map((p) => {
        const base = [];
        if (canViewPrices) base.push(p.unit_price ?? "-");
        base.push(
          p.quantity ?? "-",
          p.created_at ? p.created_at.split(" ")[0] : "-",
          p.invoice_id ?? "-"
        );
        return base;
      });
    } else if (activeTab === "history") {
      headers = [
        "# الفاتورة",
        "نوع العملية",
        "التاريخ",
        "الكمية",
        "الموقع",
        "الماكينة",
        "الميكانيزم",
        "الحالة",
      ];
      if (canViewPrices) headers.push("الإجمالي");

      rows = invoiceHistory.map((h) => {
        const arr = [
          h.invoice_id ?? "-",
          h.invoice_type ?? "-",
          h.invoice_date ? h.invoice_date.split(" ")[0] : "-",
          h.quantity ?? "-",
          h.invoice_type === "تحويل"
            ? (h.new_location ?? "-")
            : (h.location ?? "-"),
          h.machine ?? "-",
          h.mechanism ?? "-",
          statusMap[h.status]?.text || h.status || "-",
        ];
        if (canViewPrices) {
          arr.push(
            h.invoice_type === "طلب شراء" ? "-" : (h.total_price ?? "-")
          );
        }
        return arr;
      });
    }

    if (!headers.length) return;

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
    link.download = `تفاصيل_${
      normalizedItem.item_bar || "item"
    }_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printTab = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    let title = "";
    let head = "";
    let body = "";

    if (activeTab === "locations") {
      title = "المواقع";
      head = `
        <tr>
          <th>الموقع</th>
          <th>الكمية</th>
        </tr>
      `;
      body = locations
        .map(
          (loc) => `
        <tr>
          <td>${loc.location ?? "-"}</td>
          <td>${loc.quantity ?? "0"}</td>
        </tr>
      `
        )
        .join("");
    } else if (activeTab === "prices") {
      title = "الأسعار";
      head = `
        <tr>
          ${canViewPrices ? "<th>سعر الوحدة</th>" : ""}
          <th>الكمية</th>
          <th>التاريخ</th>
          <th># الفاتورة</th>
        </tr>
      `;
      body = prices
        .map(
          (p) => `
        <tr>
          ${canViewPrices ? `<td>${p.unit_price ?? "-"}</td>` : ""}
          <td>${p.quantity ?? "-"}</td>
          <td>${p.created_at ? p.created_at.split(" ")[0] : "-"}</td>
          <td>${p.invoice_id ?? "-"}</td>
        </tr>
      `
        )
        .join("");
    } else if (activeTab === "history") {
      title = "تاريخ الفواتير";
      head = `
        <tr>
          <th># الفاتورة</th>
          <th>نوع العملية</th>
          <th>التاريخ</th>
          <th>الكمية</th>
          <th>الموقع</th>
          <th>الماكينة</th>
          <th>الميكانيزم</th>
          <th>الحالة</th>
          ${canViewPrices ? "<th>الإجمالي</th>" : ""}
        </tr>
      `;
      body = invoiceHistory
        .map(
          (h) => `
        <tr>
          <td>${h.invoice_id ?? "-"}</td>
          <td>${h.invoice_type ?? "-"}</td>
          <td>${h.invoice_date ? h.invoice_date.split(" ")[0] : "-"}</td>
          <td>${h.quantity ?? "-"}</td>
          <td>${
            h.invoice_type === "تحويل"
              ? (h.new_location ?? "-")
              : (h.location ?? "-")
          }</td>
          <td>${h.machine ?? "-"}</td>
          <td>${h.mechanism ?? "-"}</td>
          <td>${statusMap[h.status]?.text || h.status || "-"}</td>
          ${
            canViewPrices
              ? `<td>${
                  h.invoice_type === "طلب شراء" ? "-" : (h.total_price ?? "-")
                }</td>`
              : ""
          }
        </tr>
      `
        )
        .join("");
    }

    win.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <title>طباعة ${title}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h2 { text-align: center; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: center; font-size: 13px; }
          th { background: #0b1b5e; color: #fff; }
          tr:nth-child(even) { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h2>${title} - ${normalizedItem.item_name || "-"}</h2>
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

  const renderTableHead = () => {
    if (activeTab === "locations") {
      return (
        <tr>
          <th className="px-4 py-2 text-center text-xs font-semibold text-white">
            الموقع
          </th>
          <th className="px-4 py-2 text-center text-xs font-semibold text-white">
            الكمية
          </th>
        </tr>
      );
    }

    if (activeTab === "prices") {
      return (
        <tr>
          <th className="px-4 py-2 text-center text-xs font-semibold text-white">
            # الفاتورة
          </th>
          <th className="px-4 py-2 text-center text-xs font-semibold text-white">
            التاريخ
          </th>
          <th className="px-4 py-2 text-center text-xs font-semibold text-white">
            الكمية
          </th>
          {canViewPrices && (
            <th className="px-4 py-2 text-center text-xs font-semibold text-white">
              سعر الوحدة
            </th>
          )}
        </tr>
      );
    }

    return (
      <tr>
        <th className="px-4 py-2 text-center text-xs font-semibold text-white">
          # الفاتورة
        </th>
        <th className="px-4 py-2 text-center text-xs font-semibold text-white">
          نوع العملية
        </th>
        <th className="px-4 py-2 text-center text-xs font-semibold text-white">
          التاريخ
        </th>
        <th className="px-4 py-2 text-center text-xs font-semibold text-white">
          الكمية
        </th>
        <th className="px-4 py-2 text-center text-xs font-semibold text-white">
          الموقع
        </th>
        <th className="px-4 py-2 text-center text-xs font-semibold text-white">
          الماكينة
        </th>
        <th className="px-4 py-2 text-center text-xs font-semibold text-white">
          الميكانيزم
        </th>
        <th className="px-4 py-2 text-center text-xs font-semibold text-white">
          الحالة
        </th>
        {canViewPrices && (
          <th className="px-4 py-2 text-center text-xs font-semibold text-white">
            الإجمالي
          </th>
        )}
      </tr>
    );
  };

  const renderTableBody = () => {
    if (activeTab === "locations") {
      if (!locations.length) {
        return (
          <tr>
            <td
              colSpan={2}
              className="px-4 py-4 text-center text-sm text-gray-500"
            >
              لا توجد مواقع مسجلة لهذا العنصر
            </td>
          </tr>
        );
      }

      return locations.map((loc, idx) => (
        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
          <td className="px-4 py-2 text-center text-xs text-gray-800">
            {loc.location || "-"}
          </td>
          <td className="px-4 py-2 text-center text-xs text-gray-800">
            {loc.quantity ?? "0"}
          </td>
        </tr>
      ));
    }

    if (activeTab === "prices") {
      if (!prices.length) {
        return (
          <tr>
            <td
              colSpan={canViewPrices ? 4 : 3}
              className="px-4 py-4 text-center text-sm text-gray-500"
            >
              لا توجد أسعار مسجلة لهذا العنصر
            </td>
          </tr>
        );
      }

      return prices.map((p, idx) => (
        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
          <td className="px-4 py-2 text-center text-xs text-gray-800">
            {p.invoice_id ?? "-"}
          </td>
          <td className="px-4 py-2 text-center text-xs text-gray-800">
            {p.created_at ? p.created_at.split(" ")[0] : "-"}
          </td>
          <td className="px-4 py-2 text-center text-xs text-gray-800">
            {p.quantity ?? "-"}
          </td>
          {canViewPrices && (
            <td className="px-4 py-2 text-center text-xs text-gray-800">
              {(p.unit_price || 0).toLocaleString()}
            </td>
          )}
        </tr>
      ));
    }

    if (!invoiceHistory.length) {
      return (
        <tr>
          <td
            colSpan={canViewPrices ? 9 : 8}
            className="px-4 py-4 text-center text-sm text-gray-500"
          >
            لا توجد حركات مسجلة لهذا العنصر
          </td>
        </tr>
      );
    }

    return invoiceHistory.map((h, idx) => (
      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
        <td className="px-4 py-2 text-center text-xs text-gray-800">
          {h.invoice_id ?? "-"}
        </td>
        <td className="px-4 py-2 text-center text-xs text-gray-800">
          {h.invoice_type ?? "-"}
        </td>
        <td className="px-4 py-2 text-center text-xs text-gray-800">
          {h.invoice_date ? h.invoice_date.split(" ")[0] : "-"}
        </td>
        <td className="px-4 py-2 text-center text-xs text-gray-800">
          {h.quantity ?? "-"}
        </td>
        <td className="px-4 py-2 text-center text-xs text-gray-800">
          {h.invoice_type === "تحويل"
            ? (h.new_location ?? "-")
            : (h.location ?? "-")}
        </td>
        <td className="px-4 py-2 text-center text-xs text-gray-800">
          {h.machine ?? "-"}
        </td>
        <td className="px-4 py-2 text-center text-xs text-gray-800">
          {h.mechanism ?? "-"}
        </td>
        <td className="px-4 py-2 text-center text-xs text-gray-800">
          {statusMap[h.status]?.text || h.status || "-"}
        </td>
        {canViewPrices && (
          <td className="px-4 py-2 text-center text-xs text-gray-800">
            {h.invoice_type === "طلب شراء"
              ? "-"
              : (h.total_price || 0).toLocaleString()}
          </td>
        )}
      </tr>
    ));
  };

  return (
    <div dir="rtl" className="mx-auto rounded-2xl">
      {onClose && (
        <div className="flex justify-start mb-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md bg-gray-500 text-white hover:bg-gray-600"
          >
            إغلاق
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm px-6 py-8 mb-6 text-center">
        <h2 className="text-xl font-bold text-[#032766] mb-3">
          معلومات العنصر
        </h2>

        <p className="text-sm text-gray-800 mb-1">{normalizedItem.id ?? "-"}</p>

        <p className="text-sm text-gray-800 mb-1">
          {normalizedItem.item_name ?? "-"} :{" "}
          <span className="font-medium">اسم العنصر</span>
        </p>

        <p className="text-sm text-gray-800 mb-1">
          {normalizedItem.item_bar ?? "-"} :{" "}
          <span className="font-medium">باركود العنصر</span>
        </p>

        <p className="text-sm text-gray-800">
          {normalizedItem.created_at
            ? normalizedItem.created_at.split(" ")[0]
            : "-"}{" "}
          : <span className="font-medium">تاريخ الإنشاء</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl mb-4 overflow-hidden">
        <div className="flex justify-between items-center border-b">
          <div className="flex">
            {["locations", "prices", "history"].map((tab) => {
              const label =
                tab === "locations"
                  ? "المواقع"
                  : tab === "prices"
                    ? "الأسعار"
                    : "تاريخ الفواتير";
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium border-l last:border-l-0 ${
                    isActive
                      ? "text-[#f39c12] border-b-2 border-[#f39c12] bg-[#fdf7e6]"
                      : "text-gray-700 bg-[#f8fafc] hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 px-4">
            <button
              type="button"
              onClick={printTab}
              className="px-4 py-1.5 text-xs rounded-md bg-[#365b86] text-white hover:bg-[#284568]"
            >
              طباعة
            </button>
            <button
              type="button"
              onClick={exportTabToCsv}
              className="px-4 py-1.5 text-xs rounded-md bg-[#f39c12] text-white hover:bg-[#e08e0b]"
            >
              تصدير
            </button>
          </div>
        </div>

        <div className="mt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#032766] text-white">
                {renderTableHead()}
              </thead>
              <tbody>{renderTableBody()}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

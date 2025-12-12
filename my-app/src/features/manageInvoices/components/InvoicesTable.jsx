import React from "react";
import InvoiceActionsCell from "./InvoiceActionsCell";
import InvoiceStatusCell from "./InvoiceStatusCell";

const InvoicesTable = ({
  user,
  invoices,
  loading,
  selectedRowIds,
  onToggleSelectRow,
  onSelectAll,
  onOpenInvoice,
  onShowDetails,
  onDeleteOne,
  onRecoverDeposit,
  onConfirmStatus,
  onAcceptPurchaseRequest,
  onRejectPurchaseRequest,
  confirmLoadingMap,
  recoverLoadingMap,
  singleDeleteLoading,
}) => {
  const allChecked =
    invoices.length > 0 &&
    invoices.every((inv) => selectedRowIds.includes(inv.id));

  return (
<div className="mt-4 shadow-md bg-white overflow-x-auto w-full">
  <table
    className="min-w-full text-[13px] text-right border border-slate-300 table-auto"
    dir="rtl"
  >

        {/* ===================== هيدر الجدول ===================== */}
        <thead className="bg-[#032766] text-xs font-semibold text-white">
          <tr>
            <th className="px-3 py-3 text-center border border-slate-300">#</th>

            <th className="px-3 py-3 text-center border border-slate-300">
              نوع العملية
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              تاريخ إصدار الفاتورة
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              وقت إصدار الفاتورة
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              الماكينة
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              الميكانيزم
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              أسماء العناصر
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              عامل المخازن
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              المراجع
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              اسم الموظف
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              اسم العميل
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              حالة العملية
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              فتح الفاتورة
            </th>

            <th className="px-3 py-3 text-center border border-slate-300">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="h-4 w-4 border-2 border-sky-400 text-sky-500"
              />
            </th>
          </tr>
        </thead>

        {/* ===================== جسم الجدول ===================== */}
        <tbody>
          {loading && (
            <tr>
              <td
                colSpan={14}
                className="px-4 py-6 text-center text-slate-500"
              >
                جاري تحميل الفواتير...
              </td>
            </tr>
          )}

          {!loading && invoices.length === 0 && (
            <tr>
              <td
                colSpan={14}
                className="px-4 py-6 text-center text-slate-500"
              >
                لا توجد فواتير لعرضها
              </td>
            </tr>
          )}

          {!loading &&
            invoices.map((invoice) => {
              const isSelected = selectedRowIds.includes(invoice.id);
              const confirmLoading = Boolean(confirmLoadingMap[invoice.id]);
              const recoverLoading = Boolean(recoverLoadingMap[invoice.id]);

              const isNotReturnedRow = invoice.status === "لم ترجع";

              return (
                <tr
                  key={invoice.id}
                  className={`border-b border-slate-200 ${
                    isNotReturnedRow
                      ? "bg-red-200/80"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {/* رقم الفاتورة (#) */}
                  <td className="px-3 py-2 text-center border border-slate-300">
                    {invoice.id}
                  </td>

                  {/* نوع العملية */}
                  <td className="px-3 py-2 text-center border border-slate-300">
                    {invoice.type}
                  </td>

                  {/* تاريخ الإصدار */}
                  <td className="px-3 py-2 text-center border border-slate-300">
                    {invoice.date}
                  </td>

                  {/* وقت الإصدار */}
                  <td className="px-3 py-2 text-center border border-slate-300">
                    {invoice.time}
                  </td>

                  {/* الماكينة */}
                  <td className="px-3 py-2 border border-slate-300">
                    {invoice.machine_name}
                  </td>

                  {/* الميكانيزم */}
                  <td className="px-3 py-2 border border-slate-300">
                    {invoice.mechanism_name}
                  </td>

                  {/* أسماء العناصر — النص يتقص عادي */}
                  <td className="px-3 py-2 border border-slate-300 max-w-[150px] truncate">
                    {invoice.itemsNames}
                  </td>

                  {/* عامل المخازن */}
                  <td className="px-3 py-2 border border-slate-300">
                    {invoice.warehouse_manager}
                  </td>

                  {/* المراجع */}
                  <td className="px-3 py-2 border border-slate-300">
                    {invoice.accreditation_manager}
                  </td>

                  {/* اسم الموظف */}
                  <td className="px-3 py-2 border border-slate-300">
                    {invoice.employee_name}
                  </td>

                  {/* اسم العميل */}
                  <td className="px-3 py-2 border border-slate-300">
                    {invoice.client_name}
                  </td>

                  {/* حالة العملية */}
                  <td className="px-3 py-2 text-center border border-slate-300">
                    <InvoiceStatusCell
                      invoice={invoice}
                      user={user}
                      onConfirmStatus={onConfirmStatus}
                      onAcceptPurchaseRequest={onAcceptPurchaseRequest}
                      onRejectPurchaseRequest={onRejectPurchaseRequest}
                      confirmLoading={confirmLoading}
                    />
                  </td>

                  {/* فتح الفاتورة */}
                  <td className="px-3 py-2 text-center border border-slate-300">
                    <InvoiceActionsCell
                      invoice={invoice}
                      user={user}
                      onOpenInvoice={onOpenInvoice}
                      onDeleteOne={onDeleteOne}
                      onShowDetails={onShowDetails}
                      onRecoverDeposit={onRecoverDeposit}
                      recoverLoading={recoverLoading}
                      singleDeleteLoading={singleDeleteLoading}
                    />
                  </td>

                  {/* Checkbox */}
                  <td className="px-3 py-2 text-center border border-slate-300">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectRow(invoice.id)}
                      className="h-4 w-4 border-2 border-sky-400 text-sky-500"
                    />
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

export default InvoicesTable;

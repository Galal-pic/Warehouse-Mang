import React from "react";

const InvoiceStatusCell = ({
  invoice,
  user,
  onConfirmStatus,
  onAcceptPurchaseRequest,
  onRejectPurchaseRequest,
  confirmLoading,
}) => {
  const isAdmin = user?.username === "admin";
  const canConfirmWithdrawal = user?.can_confirm_withdrawal || isAdmin;
  const canWithdraw = user?.can_withdraw || isAdmin;

  const { status, rawStatus, type, id } = invoice;

  if (status === "تم" || status === "تم الاسترداد") {
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
        {status}
      </span>
    );
  }

  if (status === "استرداد جزئي") {
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
        {status}
      </span>
    );
  }

  if (status === "مقبول") {
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
        مقبول
      </span>
    );
  }

  if (status === "مرفوض") {
    return (
      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
        مرفوض
      </span>
    );
  }

  // لو دي فاتورة "طلب شراء" ولسه draft
  if (type === "طلب شراء" && rawStatus === "draft") {
    return (
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onAcceptPurchaseRequest(invoice)}
          disabled={confirmLoading || !canConfirmWithdrawal}
          className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
        >
          {confirmLoading ? "..." : "قبول"}
        </button>
        <button
          type="button"
          onClick={() => onRejectPurchaseRequest(invoice)}
          disabled={confirmLoading || !canConfirmWithdrawal}
          className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
        >
          {confirmLoading ? "..." : "رفض"}
        </button>
      </div>
    );
  }

  // زرار عام لتأكيد / تغيير الحالة
  const disabledByPermission =
    (rawStatus === "draft" && !canConfirmWithdrawal) ||
    (rawStatus === "accreditation" && !canWithdraw);

  return (
    <button
      type="button"
      onClick={() => onConfirmStatus(invoice)}
      disabled={confirmLoading || disabledByPermission}
      className={`px-3 py-1 text-xs rounded font-semibold border ${
        rawStatus === "draft"
          ? "bg-red-50 text-red-700 border-red-400"
          : "bg-blue-50 text-blue-700 border-blue-400"
      } disabled:opacity-60`}
    >
      {confirmLoading ? "..." : status}
    </button>
  );
};

export default InvoiceStatusCell;

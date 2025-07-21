import React from "react";
import AdditionInvoiceModal from "./AdditionInvoiceModal";
import ReturnInvoiceModal from "./ReturnInvoiceModal";
import CustodyInvoiceModal from "./CustodyInvoiceModal";
import TransferInvoiceModal from "./TransferInvoiceModal";
import DisbursementInvoiceModal from "./DisbursementInvoiceModal";
import ReservationInvoiceModal from "./ReservationInvoiceModal";
import DamageInvoiceModal from "./DamageInvoiceModal";

export default function InvoiceModal(props) {
  const { selectedInvoice, editingInvoice, selectedNowType } = props;

  const invoiceType =
    selectedNowType?.type || selectedInvoice?.type || editingInvoice?.type;

  switch (invoiceType) {
    case "اضافه":
      return <AdditionInvoiceModal {...props} />;
    case "مرتجع":
      return <ReturnInvoiceModal {...props} />;
    case "أمانات":
      return <CustodyInvoiceModal {...props} />;
    case "تحويل":
      return <TransferInvoiceModal {...props} />;
    case "صرف":
      return <DisbursementInvoiceModal {...props} />;
    case "حجز":
      return <ReservationInvoiceModal {...props} />;
    case "توالف":
      return <DamageInvoiceModal {...props} />;
    default:
      return <div>نوع الفاتورة غير معروف</div>;
  }
}

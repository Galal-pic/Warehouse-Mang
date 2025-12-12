// src/features/invoices/hooks/usePurchaseOrderForm.js
import { initialInvoiceState } from "./useInvoiceForm";

export const initialPurchaseOrderState = {
  ...initialInvoiceState,
  type: "طلب شراء",
};

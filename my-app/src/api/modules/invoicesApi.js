// src/api/modules/invoicesApi.js
import { httpClient } from "../httpClient";

// ================== Invoice IDs / Numbers ==================

export function getLastInvoiceId() {
  return httpClient.get("/invoice/last-id");
}

export function getInvoicesNumbers() {
  return httpClient.get("/invoice/sales-invoices");
}

// ================== Invoices CRUD ==================

export function createInvoice(invoice) {
  return httpClient.post("/invoice/", invoice);
}

export function getInvoices(params) {
  const { type, page = 0, page_size = 20, all = false } = params;

  const queryParams = all
    ? { all: true }
    : { page: page + 1, page_size, all: false };

  return httpClient.get(`/invoice/${type}`, {
    params: queryParams,
  });
}

export function updateInvoice({ id, ...body }) {
  return httpClient.put(`/invoice/${id}`, body);
}

export function deleteInvoice(id) {
  return httpClient.delete(`/invoice/${id}`);
}

export function confirmInvoice(id) {
  return httpClient.post(`/invoice/${id}/confirm`);
}

export function confirmTalabSheraaInvoice({ id, ...body }) {
  return httpClient.post(
    `/invoice/${id}/PurchaseRequestConfirmation`,
    body
  );
}

export function refreshInvoice(id) {
  return httpClient.get(`/invoice/updateprice/${id}`);
}

export function returnWarrantyInvoice({ id, ...body }) {
  return httpClient.post(`/invoice/${id}/ReturnWarranty`, body);
}

export function returnWarrantyInvoicePartially({ id }) {
  return httpClient.get(`/invoice/${id}/WarrantyReturnStatus`);
}

export function priceReport(id) {
  return httpClient.get(`/invoice/price-report/${id}`);
}

export function getInvoice(id) {
  return httpClient.get(`/invoice/${id}`);
}

// ================== Invoice reports (prices, fifo) ==================

export function detailsReport(id) {
  return httpClient.get(`/invoice/fifo-prices/${id}`);
}

// ================== Booking Deductions (حجز) ==================

export function getBookingDeductions(invoiceId) {
  return httpClient.get(`/rental/missing-qty/${invoiceId}`);
}

// src/api/modules/reportsApi.js
import { httpClient } from "../httpClient";

export function getReports() {
  return httpClient.get("/reports/", {
    params: { all: true },
  });
}

export function getFilteredReports(paramsOptions) {
  const {
    reportType,
    type,
    warehouse_manager,
    machine,
    mechanism,
    client_name,
    accreditation_manager,
    employee_name,
    supplier,
    status,
    invoice_type,
    item_name,
    item_bar,
    location,
    start_date,
    end_date,
    page = 0,
    page_size = 10,
    invoices_page,
    invoices_page_size,
    items_page,
    items_page_size,
    invoice_id,
    all = false,
  } = paramsOptions;

  const params = new URLSearchParams();

  params.append("type", reportType);
  if (warehouse_manager) params.append("warehouse_manager", warehouse_manager);
  if (machine) params.append("machine", machine);
  if (mechanism) params.append("mechanism", mechanism);
  if (client_name) params.append("client_name", client_name);
  if (accreditation_manager)
    params.append("accreditation_manager", accreditation_manager);
  if (employee_name) params.append("employee_name", employee_name);
  if (type) params.append("invoice_type", type === "الكل" ? "" : type);
  if (supplier) params.append("supplier", supplier);
  if (status) params.append("status", status);
  if (invoice_type) params.append("invoice_type", invoice_type);
  if (item_name) params.append("item_name", item_name);
  if (item_bar) params.append("item_bar", item_bar);
  if (location) params.append("location", location);
  if (start_date) params.append("start_date", start_date);
  if (end_date) params.append("end_date", end_date);
  if (invoice_id) params.append("invoice_id", invoice_id);

  if (!all) {
    params.append("page", page + 1);
    params.append("page_size", page_size);
    if (invoices_page !== undefined)
      params.append("invoices_page", invoices_page + 1);
    if (invoices_page_size)
      params.append("invoices_page_size", invoices_page_size);
    if (items_page !== undefined) params.append("items_page", items_page + 1);
    if (items_page_size) params.append("items_page_size", items_page_size);
  } else {
    params.append("all", "true");
  }

  return httpClient.get(`/reports/filter?${params.toString()}`);
}

// /invoice/fifo-prices/:id
export function getItemPriceSources(id) {
  return httpClient.get(`/invoice/fifo-prices/${id}`);
}

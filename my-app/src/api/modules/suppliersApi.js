// src/api/modules/suppliersApi.js
import { httpClient } from "../httpClient";

// GET /supplier/?page=1&page_size=10&all=false
export function getSuppliers({ page, page_size, all = false }) {
  const queryParams = all
    ? "all=true"
    : `page=${page + 1}&page_size=${page_size}&all=false`;

  return httpClient.get(`/supplier/?${queryParams}`);
}

// POST /supplier/
export function addSupplier(newSupplier) {
  return httpClient.post("/supplier/", newSupplier);
}

// PUT /supplier/:id
export function updateSupplier({ id, ...patch }) {
  return httpClient.put(`/supplier/${id}`, patch);
}

// DELETE /supplier/:id
export function deleteSupplier(id) {
  return httpClient.delete(`/supplier/${id}`);
}

// POST /supplier/excel
export function importSupplier(data) {
  return httpClient.post("/supplier/excel", { data });
}

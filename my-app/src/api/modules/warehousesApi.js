// src/api/modules/warehousesApi.js
import { httpClient } from "../httpClient";

export function getWarehouses({ page = 0, page_size = 20, all = false }) {
  const queryParams = all
    ? { all: true }
    : { page: page + 1, page_size, all: false };

  return httpClient.get("/warehouse/", {
    params: queryParams,
  });
}

export function addWarehouse(newItem) {
  return httpClient.post("/warehouse/", newItem);
}

export function updateWarehouse({ id, ...patch }) {
  return httpClient.put(`/warehouse/${id}`, patch);
}

export function deleteWarehouse(id) {
  return httpClient.delete(`/warehouse/${id}`);
}

export function importWarehouse(data) {
  return httpClient.post("/warehouse/excel", data);
}

export function getWarehouseItem(id) {
  return httpClient.get(`/warehouse/${id}`);
}

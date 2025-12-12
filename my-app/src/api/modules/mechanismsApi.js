// src/api/modules/mechanismsApi.js
import { httpClient } from "../httpClient";

// GET /mechanism/?page=1&page_size=10&all=false
export function getMechanisms({ page, page_size, all = false }) {
  const queryParams = all
    ? "all=true"
    : `page=${page + 1}&page_size=${page_size}&all=false`;

  return httpClient.get(`/mechanism/?${queryParams}`);
}

// POST /mechanism/
export function addMechanism(newMechanism) {
  return httpClient.post("/mechanism/", newMechanism);
}

// PUT /mechanism/:id
export function updateMechanism({ id, ...patch }) {
  return httpClient.put(`/mechanism/${id}`, patch);
}

// DELETE /mechanism/:id
export function deleteMechanism(id) {
  return httpClient.delete(`/mechanism/${id}`);
}

export function importMechanism(data) {
  return httpClient.post("/mechanism/excel", { data });
}

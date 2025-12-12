// src/api/modules/machinesApi.js
import { httpClient } from "../httpClient";

// GET /machine/?page=1&page_size=10&all=false
export function getMachines({ page, page_size, all = false }) {
  const queryParams = all
    ? "all=true"
    : `page=${page + 1}&page_size=${page_size}&all=false`;

  return httpClient.get(`/machine/?${queryParams}`);
}

// POST /machine/
export function addMachine(newMachine) {
  return httpClient.post("/machine/", newMachine);
}

// PUT /machine/:id
export function updateMachine({ id, ...patch }) {
  return httpClient.put(`/machine/${id}`, patch);
}

// DELETE /machine/:id
export function deleteMachine(id) {
  return httpClient.delete(`/machine/${id}`);
}

export function importMachines(data) {
  // زي الكود القديم: body: { data }
  return httpClient.post("/machine/excel", { data });
}

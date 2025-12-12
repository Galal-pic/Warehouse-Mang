// src/api/httpClient
import { httpClient } from "../httpClient";

// نفس endpoint القديم: /auth/login
export function loginRequest({ username, password }) {
  return httpClient.post("/auth/login", { username, password });
}

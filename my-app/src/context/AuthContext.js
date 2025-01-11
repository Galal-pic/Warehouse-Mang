import { createAuthProvider } from "react-token-auth";

export const { useAuth, authFetch, login, logout } = createAuthProvider({
  accessTokenKey: "access_token",
  onUpdateToken: (token) =>
    fetch("http://127.0.0.1:5000/auth/refresh", {
      method: "POST",
      body: token.refresh_token,
    }).then((r) => r.json()),
});

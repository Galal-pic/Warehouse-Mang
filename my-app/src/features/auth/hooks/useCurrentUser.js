// src/features/auth/hooks/useCurrentUser.js
import { useEffect, useState } from "react";
import { getCurrentUser } from "../../../api/modules/usersApi";

export function useCurrentUser(options = {}) {
  const { enabled = true } = options;
  const [user, setUser] = useState(null);
  const [isLoading, setLoading] = useState(enabled);
  const [isError, setError] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    // 🔴 هنا المهم:
    // لو مفيش توكن أو enabled = false → ما نطلبش /auth/user
    if (!enabled || !token) {
      setLoading(false);
      setError(false);
      setUser(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(false);

    getCurrentUser()
      .then((res) => {
        if (!cancelled) setUser(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { user, isLoading, isError };
}

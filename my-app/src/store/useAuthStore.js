// src/store/useAuthStore.js
import { create } from "zustand";
import { getCurrentUser } from "../api/modules/usersApi";

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem("access_token") || null,
  user: null,
  isUserLoading: false,
  isUserLoaded: false, // عشان ما نطلبش نفس اليوزر تانى

  // حفظ التوكن فقط
  setToken: (token) => {
    if (token) {
      localStorage.setItem("access_token", token);
    } else {
      localStorage.removeItem("access_token");
    }
    set({ token });
  },

  // استدعاء بيانات اليوزر مرة واحدة
  fetchCurrentUser: async () => {
    const { token, isUserLoaded, isUserLoading } = get();

    // لو مفيش توكن، أو احنا بالفعل بنحمل، أو اليوزر متحمل قبل كده → مفيش داعى نطلب تانى
    if (!token || isUserLoaded || isUserLoading) return;

    set({ isUserLoading: true });
    try {
      const res = await getCurrentUser();
      set({
        user: res.data,
        isUserLoaded: true,
      });
    } catch (err) {
      console.error("Error fetching current user:", err);
      set({
        user: null,
        isUserLoaded: false,
      });
      throw err;
    } finally {
      set({ isUserLoading: false });
    }
  },

  // login: تحفطى التوكن + تجيبى بيانات اليوزر
  login: async (token) => {
    const { setToken, fetchCurrentUser } = get();
    setToken(token);
    await fetchCurrentUser(); // دى اللى هتجيب /auth/user مرة واحدة بس
  },

  logout: () => {
    localStorage.removeItem("access_token");
    set({
      token: null,
      user: null,
      isUserLoaded: false,
    });
  },
}));

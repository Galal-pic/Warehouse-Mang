import { useMemo, useState, useEffect } from "react";

/**
 * بناء الفلاتر حسب صلاحيات المستخدم
 */
function buildFilters(user) {
  if (!user) return [];

  const isAdmin = user.username === "admin";
  const can = (perm) => Boolean(user?.[perm]);

  const filters = [
    (can("view_additions") || isAdmin) && {
      label: "اضافه",
      apiType: "اضافه",
      kind: "operation",
    },
    (can("view_withdrawals") || isAdmin) && {
      label: "صرف",
      apiType: "صرف",
      kind: "operation",
    },
    (can("view_deposits") || isAdmin) && {
      label: "أمانات",
      apiType: "أمانات",
      kind: "operation",
    },
    (can("view_returns") || isAdmin) && {
      label: "مرتجع",
      apiType: "مرتجع",
      kind: "operation",
    },
    (can("view_damages") || isAdmin) && {
      label: "توالف",
      apiType: "توالف",
      kind: "operation",
    },
    (can("view_reservations") || isAdmin) && {
      label: "حجز",
      apiType: "حجز",
      kind: "operation",
    },
    (can("view_purchase_requests") || isAdmin) && {
      label: "طلب شراء",
      apiType: "طلب شراء",
      kind: "operation",
    },
    (can("view_transfers") || isAdmin) && {
      label: "تحويل",
      apiType: "تحويل",
      kind: "operation",
    },
    // الحالات حسب الكود القديم (بنستخدم apiType مخصوص علشان الـ URL لو محتاج -)
    {
      label: "لم تراجع",
      apiType: "لم-تراجع",
      kind: "status",
    },
    {
      label: "لم تؤكد",
      apiType: "لم-تؤكد",
      kind: "status",
    },
    {
      label: "تم",
      apiType: "تم",
      kind: "status",
    },
    {
      label: "صفرية",
      apiType: "صفرية",
      kind: "status",
    },
  ].filter(Boolean);

  return filters;
}

export function useInvoiceFilters(user) {
  const filters = useMemo(() => buildFilters(user), [user]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (filters.length === 0) return;
    if (selectedIndex >= filters.length) {
      setSelectedIndex(0);
    }
  }, [filters, selectedIndex]);

  const selectedFilter = filters[selectedIndex] || null;

  return {
    filters,
    selectedFilter,
    selectedIndex,
    setSelectedIndex,
  };
}

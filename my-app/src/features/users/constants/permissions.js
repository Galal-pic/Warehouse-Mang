// src/features/users/constants/permissions.js
export const JOBS = [
  "مدير المخازن",
  "امين المخزن",
  "مدير المشتريات",
  "مسئول المشتريات",
  "رئيس قسم العمليات",
  "مسئول قسم العمليات",
  "موظف قسم الحسابات",
  "موظف",
];

export const CREATE_INVOICE_OPTIONS = {
  create_inventory_operations: "إنشاء العمليات المخزونية",
  create_additions: "إنشاء الإضافات",
};

export const INVOICES_PAGE_OPTIONS = {
  view_additions: "عرض الإضافات",
  view_withdrawals: "عرض الصرف",
  view_deposits: "عرض الأمانات",
  view_returns: "عرض الاسترجاع",
  view_damages: "عرض التوالفات",
  view_reservations: "عرض الحجوزات",
  view_prices: "عرض الأسعار",
  view_purchase_requests: "عرض طلبات الشراء",
  view_transfers: "عرض التحويلات",
  view_reports: "إمكانية عمل تقرير",
  can_edit: "التعديل",
  can_delete: "الحذف",
  can_confirm_withdrawal: "المراجعة",
  can_withdraw: "الصرف",
  // can_update_prices: "تحديث الأسعار",
  can_recover_deposits: "استرداد الأمانات",
};

export const ITEM_OPTIONS = {
  items_can_edit: "التعديل",
  items_can_delete: "الحذف",
  items_can_add: "الإضافة",
};

export const MACHINES_OPTIONS = {
  machines_can_edit: "التعديل",
  machines_can_delete: "الحذف",
  machines_can_add: "الإضافة",
};

export const MECHANISM_OPTIONS = {
  mechanism_can_edit: "التعديل",
  mechanism_can_delete: "الحذف",
  mechanism_can_add: "الإضافة",
};

export const SUPPLIERS_OPTIONS = {
  suppliers_can_edit: "التعديل",
  suppliers_can_delete: "الحذف",
  suppliers_can_add: "الإضافة",
};

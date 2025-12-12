// src/features/reports/hooks/useReportsLogic.js
import { useEffect, useMemo, useState, useCallback } from "react";

import { getFilteredReports } from "../../../api/modules/reportsApi";
import { getMachines } from "../../../api/modules/machinesApi";
import { getMechanisms } from "../../../api/modules/mechanismsApi";
import { getSuppliers } from "../../../api/modules/suppliersApi";
import { getUsers } from "../../../api/modules/usersApi";
import { getWarehouses } from "../../../api/modules/warehousesApi";
import { useAuthStore } from "../../../store/useAuthStore";

const STATUS_AR_TO_EN = {
  "لم تراجع": "draft",
  "لم تؤكد": "accreditation",
  تم: "confirmed",
  "استرداد جزئي": "partially_returned",
  "تم الاسترداد": "returned",
};

export function useReportsLogic(
  initialReportType = "",
  initialPage = 0,
  initialFilters = {}
) {
  const { user, isUserLoading } = useAuthStore();
  const canViewPrices = !!(user?.view_prices || user?.username === "admin");

  // ===== basic state =====
  const [reportType, setReportType] = useState(initialReportType);
  const [filters, setFilters] = useState({
    employee_name: initialFilters.employee_name || "",
    type: initialFilters.type || "",
    client_name: initialFilters.client_name || "",
    accreditation_manager: initialFilters.accreditation_manager || "",
    warehouse_manager: initialFilters.warehouse_manager || "",
    machine: initialFilters.machine || "",
    mechanism: initialFilters.mechanism || "",
    supplier: initialFilters.supplier || "",
    status: initialFilters.status || "",
    item_name: initialFilters.item_name || "",
    item_bar: initialFilters.item_bar || "",
    fromDate: initialFilters.fromDate || initialFilters.start_date || "",
    toDate: initialFilters.toDate || initialFilters.end_date || "",
    invoice_id: initialFilters.invoice_id || "",
  });

  const [errors, setErrors] = useState({
    fromDate: false,
    toDate: false,
  });

  const hasInitialSearch = useMemo(() => {
    return (
      !!initialReportType &&
      !!(initialFilters.fromDate || initialFilters.start_date) &&
      !!(initialFilters.toDate || initialFilters.end_date)
    );
  }, [
    initialReportType,
    initialFilters.fromDate,
    initialFilters.toDate,
    initialFilters.start_date,
    initialFilters.end_date,
  ]);

  const [isInitialLoadCompleted, setIsInitialLoadCompleted] = useState(false);

  // ===== pagination & results =====
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(10);
  const [results, setResults] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // ===== snackbar =====
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "info",
  });

  const openSnackbar = (message, type = "info") =>
    setSnackbar({ open: true, message, type });

  // ===== reference data =====
  const [usersList, setUsersList] = useState([]);
  const [machines, setMachines] = useState([]);
  const [mechanisms, setMechanisms] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouseItems, setWarehouseItems] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [loadingMechanisms, setLoadingMechanisms] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  // تحميل الداتا المساعدة حسب نوع التقرير
  const loadReferenceData = useCallback(() => {
    if (!reportType) return;

    // فواتير
    if (reportType === "فواتير") {
      setLoadingUsers(true);
      getUsers({ page: 0, page_size: 1000, all: true })
        .then((res) => setUsersList(res.data.users || res.data || []))
        .catch(() =>
          openSnackbar("فشل تحميل المستخدمين، حاول مرة أخرى", "error")
        )
        .finally(() => setLoadingUsers(false));

      setLoadingMachines(true);
      getMachines({ page: 0, page_size: 1000, all: true })
        .then((res) => setMachines(res.data.machines || res.data || []))
        .catch(() =>
          openSnackbar("فشل تحميل الماكينات، حاول مرة أخرى", "error")
        )
        .finally(() => setLoadingMachines(false));

      setLoadingMechanisms(true);
      getMechanisms({ page: 0, page_size: 1000, all: true })
        .then((res) => setMechanisms(res.data.mechanisms || res.data || []))
        .catch(() =>
          openSnackbar("فشل تحميل الميكانيزمات، حاول مرة أخرى", "error")
        )
        .finally(() => setLoadingMechanisms(false));

      setLoadingSuppliers(true);
      getSuppliers({ page: 0, page_size: 1000, all: true })
        .then((res) => setSuppliers(res.data.suppliers || res.data || []))
        .catch(() =>
          openSnackbar("فشل تحميل الموردين، حاول مرة أخرى", "error")
        )
        .finally(() => setLoadingSuppliers(false));
    }

    // مخازن
    if (reportType === "مخازن") {
      setLoadingItems(true);
      getWarehouses({ page: 0, page_size: 1000, all: true })
        .then((res) => setWarehouseItems(res.data.warehouses || res.data || []))
        .catch(() =>
          openSnackbar("فشل تحميل بيانات المخازن، حاول مرة أخرى", "error")
        )
        .finally(() => setLoadingItems(false));
    }
  }, [reportType]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // ===== options للفلاتر =====
  const employeeOptions = useMemo(
    () => (usersList || []).map((u) => ({ name: u.username })),
    [usersList]
  );

  const machinesOptions = useMemo(
    () => (machines || []).map((m) => ({ name: m.name })),
    [machines]
  );

  const mechanismsOptions = useMemo(
    () => (mechanisms || []).map((m) => ({ name: m.name })),
    [mechanisms]
  );

  const suppliersOptions = useMemo(
    () => (suppliers || []).map((s) => ({ name: s.name })),
    [suppliers]
  );

  const itemsNameOptions = useMemo(
    () => (warehouseItems || []).map((it) => ({ name: it.item_name })),
    [warehouseItems]
  );

  const itemsBarcodeOptions = useMemo(
    () => (warehouseItems || []).map((it) => ({ name: it.item_bar })),
    [warehouseItems]
  );

  const statusOptions = useMemo(
    () => [
      { name: "لم تراجع", color: "bg-red-100 text-red-800" },
      { name: "لم تؤكد", color: "bg-yellow-100 text-yellow-800" },
      { name: "تم", color: "bg-green-100 text-green-800" },
      { name: "استرداد جزئي", color: "bg-blue-100 text-blue-800" },
      { name: "تم الاسترداد", color: "bg-emerald-100 text-emerald-800" },
    ],
    []
  );

  const invoiceFilterFields = useMemo(
    () => [
      "employee_name",
      "type",
      "client_name",
      "accreditation_manager",
      "warehouse_manager",
      "machine",
      "mechanism",
      "supplier",
      "status",
      "invoice_id",
    ],
    []
  );

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: field === "status" ? STATUS_AR_TO_EN[value] || "" : value,
    }));

    if (field === "fromDate" || field === "toDate") {
      setErrors((prev) => ({ ...prev, [field]: !value }));
    }
  };

  const resetResults = () => {
    setPage(0);
    setResults([]);
    setTotalPages(1);
    setTotalItems(0);
  };

  // ===== search =====
  const validateBeforeSearch = () => {
    const newErrors = {
      fromDate: !filters.fromDate,
      toDate: !filters.toDate,
    };
    setErrors(newErrors);

    const messages = [];
    if (newErrors.fromDate) messages.push("يجب إدخال تاريخ البداية");
    if (newErrors.toDate) messages.push("يجب إدخال تاريخ النهاية");

    if (reportType === "فواتير") {
      const hasAnyFilter = invoiceFilterFields.some(
        (f) => filters[f] && filters[f].toString().trim() !== ""
      );
      if (!hasAnyFilter) {
        messages.push("يجب إدخال فلتر واحد على الأقل في الفواتير");
      }
    }

    if (reportType === "مخازن") {
      if (!filters.item_name && !filters.item_bar) {
        messages.push("يجب إدخال اسم العنصر أو باركود العنصر");
      }
    }

    if (messages.length) {
      openSnackbar(messages.join("، "), "error");
      return false;
    }
    return true;
  };

  const fetchReports = useCallback(
    (targetPage = 0) => {
      if (!reportType) return;

      setIsLoadingResults(true);

      const apiReportType =
        reportType === "فواتير"
          ? "invoice"
          : reportType === "مخازن"
          ? "item"
          : "invoice";

      const params = {
        reportType: apiReportType,
        page: targetPage,
        page_size: pageSize,
        employee_name: filters.employee_name,
        client_name: filters.client_name,
        accreditation_manager: filters.accreditation_manager,
        warehouse_manager: filters.warehouse_manager,
        machine: filters.machine,
        mechanism: filters.mechanism,
        supplier: filters.supplier,
        type: filters.type,
        status: filters.status,
        item_name: filters.item_name,
        item_bar: filters.item_bar,
        start_date: filters.fromDate,
        end_date: filters.toDate,
        invoice_id: reportType === "فواتير" ? filters.invoice_id : undefined,
        all: false,
      };

      getFilteredReports(params)
        .then((res) => {
          const raw = res.data;

          if (Array.isArray(raw)) {
            const list = raw;

            setPage(0);
            setResults(list);
            setTotalPages(1);
            setTotalItems(list.length);

            if (list.length === 0) {
              openSnackbar(
                "لم يتم العثور على نتائج مطابقة لمعايير البحث",
                "info"
              );
            } else {
              openSnackbar(`تم العثور على ${list.length} نتيجة`, "success");
            }

            return;
          }

          const data = raw || {};
          const apiPage = (data.page || 1) - 1;
          const apiPageSize = data.page_size || pageSize;
          const apiTotalPages = data.pages || data.total_pages || 1;
          const apiTotal =
            data.total ||
            (Array.isArray(data.results) ? data.results.length : 0) ||
            0;

          setPage(apiPage);
          setResults(Array.isArray(data.results) ? data.results : []);
          setTotalPages(apiTotalPages);
          setTotalItems(apiTotal);

          if (apiTotal === 0) {
            openSnackbar(
              "لم يتم العثور على نتائج مطابقة لمعايير البحث",
              "info"
            );
          } else {
            openSnackbar(`تم العثور على ${apiTotal} نتيجة`, "success");
          }
        })
        .catch((err) => {
          console.error("Error fetching reports:", err);
          openSnackbar("فشل في جلب البيانات من السيرفر", "error");
        })
        .finally(() => {
          setIsLoadingResults(false);
          setIsInitialLoadCompleted(true);
        });
    },
    [reportType, filters, pageSize]
  );

  useEffect(() => {
    if (hasInitialSearch && !isInitialLoadCompleted && reportType) {
      const timer = setTimeout(() => {
        fetchReports(initialPage);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [
    hasInitialSearch,
    isInitialLoadCompleted,
    reportType,
    initialPage,
    fetchReports,
  ]);

  const handleSearch = () => {
    if (!validateBeforeSearch()) return false;
    resetResults();
    fetchReports(0);
    return true;
  };

  const handlePageChange = (newPage) => {
    if (newPage < 0 || newPage >= totalPages) return;
    setPage(newPage);
    fetchReports(newPage);
  };

  const updateFilters = (newFilters) => {
    setFilters(newFilters);
  };

  return {
    // auth
    user,
    isUserLoading,
    canViewPrices,

    // filters
    reportType,
    setReportType,
    filters,
    errors,
    handleFilterChange,
    updateFilters,
    handleSearch,

    // results & pagination
    results,
    page,
    totalPages,
    totalItems,
    isLoadingResults,
    handlePageChange,

    // options & loading
    loadingStates: {
      loadingUsers,
      loadingMachines,
      loadingMechanisms,
      loadingSuppliers,
      loadingItems,
    },
    options: {
      employeeOptions,
      machinesOptions,
      mechanismsOptions,
      suppliersOptions,
      itemsNameOptions,
      itemsBarcodeOptions,
      statusOptions,
    },

    // snackbar
    snackbar,
    setSnackbar,

    // other
    isInitialLoadCompleted,
  };
}

export default useReportsLogic;

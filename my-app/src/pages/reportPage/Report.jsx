import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  Tabs,
  Tab,
  Card,
  CardContent,
} from "@mui/material";
import CustomAutoCompleteField from "../../components/customAutoCompleteField/CustomAutoCompleteField";
import SnackBar from "../../components/snackBar/SnackBar";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useGetMachinesQuery } from "../services/machineApi";
import { useGetMechanismsQuery } from "../services/mechanismApi";
import { useGetSuppliersQuery } from "../services/supplierApi";
import { useGetUsersQuery } from "../services/userApi";
import {
  useGetWarehousesQuery,
  useGetFilteredReportsQuery,
} from "../services/invoice&warehouseApi";
import LaunchIcon from "@mui/icons-material/Launch";
import InvoiceModal from "../../components/invoice/Invoice";
import ItemDetailsDialog from "../../components/itemDetailsReport/ItemDetailsReport";
import { GridToolbarContainer } from "@mui/x-data-grid";

export default function Report() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function CustomToolbar({
    columnVisibilityModel,
    searchResults,
    dataType,
    ...props
  }) {
    const handleExport = () => {
      const columnTranslations = {
        invoice_id: "#",
        type: "نوع العملية",
        created_at: "تاريخ الإصدار",
        total_amount: "الإجمالي",
        paid: "المدفوع",
        residual: "المتبقي",
        status: "الحالة",
        employee_name: "اسم الموظف",
        comment: "التعليق",
        supplier: "المورد",
        items: "العناصر",
        mechanism: "الميكانيزم",
        machine: "الماكينة",
        accreditation_manager: "المراجع",
        warehouse_manager: "عامل المخازن",
        client_name: "اسم العميل",
        item_id: "#",
        item_name: "اسم العنصر",
        item_bar: "باركود العنصر",
        item_created_at: "تاريخ الإنشاء",
      };

      const statusMap = {
        draft: "لم تراجع",
        accreditation: "لم تؤكد",
        confirmed: "تم",
        returned: "تم الاسترداد",
      };

      let csvData = [];
      let headers = [];

      if (dataType === "invoices") {
        csvData = searchResults.map((invoice) => ({
          [columnTranslations.invoice_id]: invoice.id || "-",
          [columnTranslations.type]: invoice.type || "-",
          [columnTranslations.created_at]:
            invoice.created_at?.split(" ")[0] || "-",
          [columnTranslations.total_amount]: invoice.total_amount || "-",
          [columnTranslations.paid]: invoice.paid || "-",
          [columnTranslations.residual]: invoice.residual || "-",
          [columnTranslations.status]:
            statusMap[invoice.status] || invoice.status || "-",
          [columnTranslations.employee_name]: invoice.employee_name || "-",
          [columnTranslations.comment]: invoice.comment || "-",
          [columnTranslations.supplier]: invoice.supplier || "-",
          [columnTranslations.items]:
            invoice.items?.map((item) => item.item_name).join(", ") || "-",
          [columnTranslations.mechanism]: invoice.mechanism || "-",
          [columnTranslations.machine]: invoice.machine || "-",
          [columnTranslations.accreditation_manager]:
            invoice.accreditation_manager || "-",
          [columnTranslations.warehouse_manager]:
            invoice.warehouse_manager || "-",
          [columnTranslations.client_name]: invoice.client_name || "-",
        }));
        headers = [
          columnTranslations.invoice_id,
          columnTranslations.type,
          columnTranslations.created_at,
          columnTranslations.total_amount,
          columnTranslations.paid,
          columnTranslations.residual,
          columnTranslations.status,
          columnTranslations.employee_name,
          columnTranslations.comment,
          columnTranslations.supplier,
          columnTranslations.items,
          columnTranslations.mechanism,
          columnTranslations.machine,
          columnTranslations.accreditation_manager,
          columnTranslations.warehouse_manager,
          columnTranslations.client_name,
        ];
      } else if (dataType === "items") {
        csvData = searchResults.map((item) => ({
          [columnTranslations.item_id]: item.id || "-",
          [columnTranslations.item_name]: item.item_name || "-",
          [columnTranslations.item_bar]: item.item_bar || "-",
          [columnTranslations.item_created_at]:
            item.created_at?.split(" ")[0] || "-",
        }));
        headers = [
          columnTranslations.item_id,
          columnTranslations.item_name,
          columnTranslations.item_bar,
          columnTranslations.item_created_at,
        ];
      }

      const escapeCsvValue = (value) => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = [
        headers.map(escapeCsvValue).join(","),
        ...csvData.map((row) =>
          headers.map((header) => escapeCsvValue(row[header])).join(",")
        ),
      ];
      const csv = csvRows.join("\n");

      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `تقرير_${dataType}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    };

    return (
      <GridToolbarContainer
        sx={{
          textAlign: "center",
          margin: "20px 0",
        }}
      >
        <Box
          sx={{
            width: "100% !important",
            textAlign: "right",
          }}
        >
          <Button
            variant="contained"
            onClick={handleExport}
            sx={{
              py: 0.8,
              backgroundColor: "#f39c12",
              borderRadius: "6px",
              fontSize: "0.95rem",
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
              "&:hover": {
                backgroundColor: "#e68e0f",
                boxShadow: "0 3px 8px rgba(0, 0, 0, 0.08)",
              },
            }}
          >
            تصدير
          </Button>
        </Box>
      </GridToolbarContainer>
    );
  }
  const [reportType, setReportType] = useState("");
  const [filters, setFilters] = useState({
    "اسم الموظف": "",
    النوع: "",
    "اسم العميل": "",
    المراجع: "",
    "عامل المخزن": "",
    الماكينه: "",
    الميكانيزم: "",
    "اسم المورد": "",
    الحالة: "",
    عنصر: "",
    "باركود العنصر": "",
    fromDate: "",
    toDate: "",
  });
  const [searchResults, setSearchResults] = useState([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [tabValue, setTabValue] = useState(0);

  // Fetch data from APIs with conditional skip
  const shouldFetchMachineAndSuppliers = [
    "فواتير",
    "ماكينة",
    "ميكانيزم",
  ].includes(reportType);
  const { data: machinesData, isLoading: isMachinesLoading } =
    useGetMachinesQuery(
      {
        page: 0,
        page_size: 1000,
        all: true,
      },
      { skip: !shouldFetchMachineAndSuppliers }
    );
  const { data: mechanismsData, isLoading: isMechanismsLoading } =
    useGetMechanismsQuery(
      {
        page: 0,
        page_size: 1000,
        all: true,
      },
      { skip: !shouldFetchMachineAndSuppliers }
    );
  const { data: suppliersData, isLoading: isSuppliersLoading } =
    useGetSuppliersQuery(
      {
        page: 0,
        page_size: 1000,
        all: true,
      },
      { skip: !shouldFetchMachineAndSuppliers }
    );
  // Get users data with pagination
  const { data: usersData, isLoading: isUsersLoading } = useGetUsersQuery(
    {
      page: 0,
      page_size: 1000,
      all: true,
    },
    { skip: !shouldFetchMachineAndSuppliers }
  );
  const { data: itemsData, isLoading: isItemsLoading } = useGetWarehousesQuery(
    {
      page: 0,
      page_size: 1000,
      all: true,
    },
    { skip: reportType !== "مخازن" }
  );

  const statusToEnglishMap = {
    "لم تراجع": "draft",
    "لم تؤكد": "accreditation",
    تم: "confirmed",
    "تم الاسترداد": "returned",
  };

  const [invoicesPaginationModel, setInvoicesPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [itemsPaginationModel, setItemsPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  // Fetch filtered reports
  const [fetchReports, setFetchReports] = useState(false);
  const {
    data: filteredReportsData,
    isLoading: isFilteredReportsLoading,
    error: filteredReportsError,
  } = useGetFilteredReportsQuery(
    {
      reportType:
        reportType === "فواتير"
          ? "invoice"
          : reportType === "ماكينة"
          ? "machine"
          : reportType === "ميكانيزم"
          ? "mechanism"
          : "item",
      page: paginationModel.page,
      page_size: paginationModel.pageSize || 10,
      invoices_page: invoicesPaginationModel.page,
      invoices_page_size: invoicesPaginationModel.pageSize || 10,
      items_page: itemsPaginationModel.page,
      items_page_size: itemsPaginationModel.pageSize || 10,
      all: false,
      employee_name: filters["اسم الموظف"],
      client_name: filters["اسم العميل"],
      accreditation_manager: filters["المراجع"],
      warehouse_manager: filters["عامل المخزن"],
      machine: filters["الماكينه"],
      mechanism: filters["الميكانيزم"],
      supplier: filters["اسم المورد"],
      status: statusToEnglishMap[filters["الحالة"]] || filters["الحالة"],
      item_name: filters["عنصر"],
      item_bar: filters["باركود العنصر"],
      start_date: filters.fromDate,
      end_date: filters.toDate,
    },
    { skip: !fetchReports || !reportType }
  );

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openInvoice = (id) => {
    let invoice;
    if (reportType === "فواتير") {
      invoice = searchResults.find((item) => item.id === id);
    } else {
      const allInvoices = searchResults[0].invoices.results;
      invoice = allInvoices.find((item) => item.id === id);
    }
    if (!invoice) {
      console.error("Invoice not found:", id);
      return;
    }

    // Transform the invoice to match the expected structure for InvoiceModal
    const transformedInvoice = {
      ...invoice,
      date: invoice.created_at ? invoice.created_at.split(" ")[0] : "-", // Extract date
      time: invoice.created_at
        ? new Date(
            `1970-01-01 ${invoice.created_at.split(" ")[1]}`
          ).toLocaleTimeString("en-US", {
            hour12: true,
            hour: "numeric",
            minute: "2-digit",
          })
        : "-", // Format time
      supplier_name: invoice.supplier || "-", // Rename supplier to supplier_name
      machine_name: invoice.machine || "-", // Rename machine to machine_name
      mechanism_name: invoice.mechanism || "-", // Rename mechanism to mechanism_name
      items: invoice.items.map((item) => ({
        ...item,
        barcode: item.item_bar || "-", // Rename item_bar to barcode
      })),
    };

    setSelectedInvoice(transformedInvoice);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedInvoice(null);
    setIsModalOpen(false);
  };

  // Define columns for invoices
  const invoiceColumns = [
    {
      field: "refresh",
      headerName: "فتح",
      width: 70,
      renderCell: (params) => {
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              height: "100%",
            }}
          >
            <button
              onClick={() => openInvoice(params.id)}
              style={{
                cursor: "pointer",
                border: "none",
                backgroundColor: "transparent",
                display: "flex",
              }}
            >
              <LaunchIcon
                sx={{
                  fontSize: "2.1rem",
                  padding: "3px",
                  "&:hover": {
                    backgroundColor: "#ddd",
                  },
                }}
              />
            </button>
          </div>
        );
      },
    },
    {
      flex: 1,
      field: "items",
      headerName: "العناصر",
      renderCell: (params) =>
        params.value.map((item) => item.item_name).join(", "),
    },
    { flex: 1, field: "supplier", headerName: "المورد" },
    { flex: 1, field: "mechanism", headerName: "الميكانيزم" },
    { flex: 1, field: "machine", headerName: "الماكينة" },
    { flex: 1, field: "employee_name", headerName: "اسم الموظف" },
    {
      flex: 1,
      field: "status",
      headerName: "الحالة",
      renderCell: (params) => {
        const statusMap = {
          draft: "لم تراجع",
          accreditation: "لم تؤكد",
          confirmed: "تم",
          returned: "تم الاسترداد",
        };
        return statusMap[params.value] || params.value || "-";
      },
    },
    { flex: 1, field: "accreditation_manager", headerName: "المراجع" },
    { flex: 1, field: "warehouse_manager", headerName: "عامل المخازن" },
    { flex: 1, field: "client_name", headerName: "اسم العميل" },
    { flex: 1, field: "type", headerName: "نوع العملية" },
    {
      flex: 1,
      field: "created_at",
      headerName: "تاريخ الإصدار",
      renderCell: (params) => (params.value ? params.value.split(" ")[0] : "-"),
    },
    { field: "id", headerName: "#", width: 50 },
  ];
  const itemColumns = [
    {
      field: "refresh",
      headerName: "فتح",
      width: 70,
      renderCell: (params) => {
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              height: "100%",
            }}
          >
            <button
              onClick={() => {
                const selectedItemData = searchResults[0].items.results.find(
                  (item) => item.id === params.row.id
                );
                setSelectedItem(selectedItemData);
                setDialogOpen(true);
              }}
              style={{
                cursor: "pointer",
                border: "none",
                backgroundColor: "transparent",
                display: "flex",
              }}
            >
              <LaunchIcon
                sx={{
                  fontSize: "2.1rem",
                  padding: "3px",
                  "&:hover": {
                    backgroundColor: "#ddd",
                  },
                }}
              />
            </button>
          </div>
        );
      },
    },
    { flex: 1, field: "item_bar", headerName: "باركود العنصر" },
    { flex: 1, field: "item_name", headerName: "اسم العنصر" },
    {
      flex: 1,
      field: "created_at",
      headerName: "تاريخ الإنشاء",
      renderCell: (params) => (params.value ? params.value.split(" ")[0] : "-"),
    },
    { flex: 1, field: "id", headerName: "#" },
  ];

  // Dynamic filter options using API data
  const filterOptions = useMemo(
    () => ({
      النوع: [
        "اضافه",
        "صرف",
        "أمانات",
        "مرتجع",
        "توالف",
        "حجز",
        "طلب شراء",
        "الكل",
      ].map((name) => ({ name })),
      "اسم الموظف":
        usersData?.users?.map((user) => ({
          name: user.username,
        })) || [],
      الماكينه:
        machinesData?.machines?.map((machine) => ({ name: machine.name })) ||
        [],
      الميكانيزم:
        mechanismsData?.mechanisms?.map((mechanism) => ({
          name: mechanism.name,
        })) || [],
      "اسم المورد":
        suppliersData?.suppliers?.map((supplier) => ({
          name: supplier.name,
        })) || [],
      الحالة: [
        { name: "لم تراجع", value: "لم تراجع" },
        { name: "لم تؤكد", value: "لم تؤكد" },
        { name: "تم", value: "تم" },
        { name: "تم الاسترداد", value: "تم الاسترداد" },
      ],
      عنصر:
        itemsData?.warehouses?.map((item) => ({ name: item.item_name })) || [],
      "باركود العنصر":
        itemsData?.warehouses?.map((item) => ({ name: item.item_bar })) || [],
    }),
    [
      usersData?.users,
      machinesData?.machines,
      mechanismsData?.mechanisms,
      suppliersData?.suppliers,
      itemsData?.warehouses,
    ]
  );

  // Snackbar state
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setSnackbarMessage("");
    setSnackBarType("");
  };

  const [errors, setErrors] = useState({
    fromDate: false,
    toDate: false,
  });

  const [showFilters, setShowFilters] = useState(true);

  const handleSearch = () => {
    // Validate required fields
    const newErrors = {
      fromDate: !filters.fromDate,
      toDate: !filters.toDate,
    };
    setErrors(newErrors);

    // Collect error messages
    const errorMessages = [];
    if (newErrors.fromDate) errorMessages.push("يجب إدخال تاريخ البداية");
    if (newErrors.toDate) errorMessages.push("يجب إدخال تاريخ النهاية");

    // Validate filters for "فواتير"
    let hasFilter = false;
    if (reportType === "فواتير") {
      hasFilter = invoiceFields.some((field) => filters[field]);
      if (!hasFilter) {
        errorMessages.push("يجب إدخال فلتر واحد على الأقل");
      }
    }

    // Validate machine selection for "ماكينة" report type
    if (reportType === "ماكينة" && !filters["الماكينه"]) {
      errorMessages.push("يجب اختيار ماكينة");
    }

    // Validate mechanism selection for "ميكانيزم" report type
    if (reportType === "ميكانيزم" && !filters["الميكانيزم"]) {
      errorMessages.push("يجب اختيار ميكانيزم");
    }

    // Validate fields for "مخازن"
    if (reportType === "مخازن") {
      if (!filters["عنصر"] && !filters["باركود العنصر"]) {
        errorMessages.push("يجب إدخال اسم العنصر أو باركود العنصر");
      }
    }

    // If there are errors, show SnackBar and stop
    if (errorMessages?.length > 0) {
      setOpenSnackbar(true);
      setSnackbarMessage(errorMessages.join("، "));
      setSnackBarType("error");
      return;
    }

    // Trigger API call for filtered reports
    setSearchExecuted(true);
    setFetchReports(true);
    setShowFilters(false);
  };

  // Handle API response
  useEffect(() => {
    if (filteredReportsData && searchExecuted) {
      const results = filteredReportsData.results.map((item) => ({
        ...item,
        invoices: item.invoices || {
          results: [],
          page: 1,
          page_size: 10,
          pages: 1,
        },
        items: item.items || { results: [], page: 1, page_size: 10, pages: 1 },
      }));
      setSearchResults(results);
      setPaginationModel({
        page: filteredReportsData.page - 1,
        pageSize: filteredReportsData.page_size || 10,
      });
      setInvoicesPaginationModel({
        page: (results[0]?.invoices?.page || 1) - 1,
        pageSize: results[0]?.invoices?.page_size || 10,
      });
      setItemsPaginationModel({
        page: (results[0]?.items?.page || 1) - 1,
        pageSize: results[0]?.items?.page_size || 10,
      });
      setShowFilters(false);
      setFetchReports(false);
    }

    if (filteredReportsError) {
      setOpenSnackbar(true);
      setSnackbarMessage("فشل في جلب البيانات من السيرفر");
      setSnackBarType("error");
    }
  }, [filteredReportsData]);

  const [searchExecuted, setSearchExecuted] = useState(false);

  const handleBackToFilters = () => {
    setShowFilters(true);
    setFetchReports(false);
    setSearchExecuted(false);
    setTabValue(0);
    setPaginationModel({
      page: 0,
      pageSize: 10,
    });
  };

  const handleFilterChange = (fieldName, value) => {
    setFilters((prev) => ({
      ...prev,
      [fieldName]:
        fieldName === "الحالة"
          ? filterOptions["الحالة"].find((option) => option.name === value)
              ?.value || ""
          : value,
    }));
    if (fieldName === "fromDate" || fieldName === "toDate") {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: !value,
      }));
    }
  };

  const invoiceFields = [
    "اسم الموظف",
    "النوع",
    "اسم العميل",
    "المراجع",
    "عامل المخزن",
    "الماكينه",
    "الميكانيزم",
    "اسم المورد",
    "الحالة",
  ];
  const firstRowInvoiceFields = invoiceFields.slice(0, 4);
  const secondRowInvoiceFields = invoiceFields.slice(4, 9);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight:
          !showFilters && searchResults?.length > 0 ? undefined : "100vh",
        justifyContent: "center",
        alignItems: "center",
        marginTop: searchResults?.length > 0 ? "70px" : undefined,
      }}
    >
      {showFilters && (
        <Box
          sx={{
            maxWidth: 900,
            width: "100%",
            p: 2.5,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            direction: "rtl",
          }}
        >
          <Typography
            variant="h6"
            align="center"
            sx={{
              fontWeight: 600,
              color: "#1e293b",
              mb: 2,
            }}
          >
            تقارير
          </Typography>

          {/* Report Type Selection */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <FormControl sx={{ maxWidth: 240, width: "100%" }}>
              <Select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setFilters({
                    "اسم الموظف": "",
                    النوع: "",
                    "اسم العميل": "",
                    المراجع: "",
                    "عامل المخزن": "",
                    الماكينه: "",
                    الميكانيزم: "",
                    "اسم المورد": "",
                    الحالة: "",
                    عنصر: "",
                    "باركود العنصر": "",
                    fromDate: "",
                    toDate: "",
                  });
                  setSearchResults([]);
                  setFetchReports(false);
                  setPaginationModel({ page: 0, pageSize: 10 });
                }}
                displayEmpty
                inputProps={{ "aria-label": "نوع التقرير" }}
                sx={{
                  direction: "rtl",
                  "& .MuiSelect-select": {
                    padding: "8px 28px 8px 8px",
                    fontSize: "0.95rem",
                    color: "#1e293b",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#e2e8f0",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#4b6584",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#4b6584",
                  },
                  backgroundColor: "#f8fafc",
                  borderRadius: "6px",
                  "&:hover": {
                    backgroundColor: "#f1f5f9",
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      borderRadius: "6px",
                      "& .MuiMenuItem-root": {
                        fontSize: "0.95rem",
                        direction: "rtl",
                        padding: "8px 16px",
                        "&:hover": {
                          backgroundColor: "#f1f5f9",
                          color: "#4b6584",
                        },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="" disabled>
                  اختر نوع التقرير
                </MenuItem>
                <MenuItem value="فواتير">فواتير</MenuItem>
                <MenuItem value="ماكينة">ماكينة</MenuItem>
                <MenuItem value="ميكانيزم">ميكانيزم</MenuItem>
                <MenuItem value="مخازن">مخازن</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {(reportType === "فواتير" ||
            reportType === "ماكينة" ||
            reportType === "ميكانيزم") && (
            <>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1.5,
                  mb: 1.5,
                  justifyContent: "space-between",
                }}
              >
                {firstRowInvoiceFields.map((fieldName) => (
                  <Box
                    key={fieldName}
                    sx={{
                      flex: { xs: "1 1 100%", sm: "1 1 48%", md: "1 1 24%" },
                      backgroundColor: "#ddd",
                    }}
                  >
                    {["المراجع", "اسم العميل"].includes(fieldName) ? (
                      <input
                        placeholder={fieldName}
                        value={filters[fieldName]}
                        onChange={(e) =>
                          handleFilterChange(fieldName, e.target.value)
                        }
                        style={{
                          border: "none",
                          outline: "none",
                          height: "50px",
                          width: "100%",
                          backgroundColor: "#ddd",
                          textAlign: "center",
                        }}
                      />
                    ) : (
                      <CustomAutoCompleteField
                        isLoading={false}
                        values={filterOptions[fieldName]}
                        editingItem={{ [fieldName]: filters[fieldName] }}
                        setEditingItem={(newItem) =>
                          handleFilterChange(fieldName, newItem[fieldName])
                        }
                        fieldName={fieldName}
                        placeholder={`اختر ${fieldName}`}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: "0.95rem",
                            backgroundColor: "#f8fafc",
                            borderRadius: "6px",
                            "&:hover": {
                              backgroundColor: "#f1f5f9",
                            },
                          },
                          "& .MuiInputLabel-root": {
                            fontSize: "0.95rem",
                            color: "#4b6584",
                            "&.Mui-focused": {
                              color: "#4b6584",
                            },
                          },
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1.5,
                  mb: 1.5,
                  justifyContent: "space-between",
                }}
              >
                {secondRowInvoiceFields.map((fieldName) => (
                  <Box
                    key={fieldName}
                    sx={{
                      flex: { xs: "1 1 100%", sm: "1 1 48%", md: "1 1 24%" },
                      backgroundColor: "#ddd",
                    }}
                  >
                    {fieldName === "عامل المخزن" ? (
                      <input
                        placeholder={fieldName}
                        value={filters[fieldName]}
                        onChange={(e) =>
                          handleFilterChange(fieldName, e.target.value)
                        }
                        style={{
                          border: "none",
                          outline: "none",
                          height: "50px",
                          width: "100%",
                          backgroundColor: "#ddd",
                          textAlign: "center",
                        }}
                      />
                    ) : (
                      <CustomAutoCompleteField
                        isLoading={
                          fieldName === "الماكينه"
                            ? isMachinesLoading
                            : fieldName === "الميكانيزم"
                            ? isMechanismsLoading
                            : fieldName === "اسم المورد"
                            ? isSuppliersLoading
                            : fieldName === "اسم الموظف"
                            ? isUsersLoading
                            : false
                        }
                        values={filterOptions[fieldName]}
                        editingItem={{ [fieldName]: filters[fieldName] }}
                        setEditingItem={(newItem) =>
                          handleFilterChange(fieldName, newItem[fieldName])
                        }
                        fieldName={fieldName}
                        placeholder={`اختر ${fieldName}`}
                        sx={{
                          "& .MuiInputBase-root": {
                            fontSize: "0.95rem",
                            backgroundColor: "#f8fafc",
                            borderRadius: "6px",
                            "&:hover": {
                              backgroundColor: "#f1f5f9",
                            },
                          },
                          "& .MuiInputLabel-root": {
                            fontSize: "0.95rem",
                            color: "#4b6584",
                            "&.Mui-focused": {
                              color: "#4b6584",
                            },
                          },
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            </>
          )}

          {reportType === "مخازن" && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                mb: 1.5,
                justifyContent: "space-between",
              }}
            >
              <Box
                sx={{
                  flex: { xs: "1 1 100%", sm: "1 1 48%" },
                  backgroundColor: "#ddd",
                }}
              >
                <CustomAutoCompleteField
                  isLoading={isItemsLoading}
                  values={filterOptions["عنصر"]}
                  editingItem={{ عنصر: filters["عنصر"] }}
                  setEditingItem={(newItem) =>
                    handleFilterChange("عنصر", newItem["عنصر"])
                  }
                  fieldName="عنصر"
                  placeholder="اختر عنصر"
                  sx={{
                    "& .MuiInputBase-root": {
                      fontSize: "0.95rem",
                      backgroundColor: "#f8fafc",
                      borderRadius: "6px",
                      "&:hover": {
                        backgroundColor: "#f1f5f9",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: "0.95rem",
                      color: "#4b6584",
                      "&.Mui-focused": {
                        color: "#4b6584",
                      },
                    },
                  }}
                />
              </Box>
              <Box
                sx={{
                  flex: { xs: "1 1 100%", sm: "1 1 48%" },
                  backgroundColor: "#ddd",
                }}
              >
                <CustomAutoCompleteField
                  isLoading={isItemsLoading}
                  values={filterOptions["باركود العنصر"]}
                  editingItem={{ "باركود العنصر": filters["باركود العنصر"] }}
                  setEditingItem={(newItem) =>
                    handleFilterChange(
                      "باركود العنصر",
                      newItem["باركود العنصر"]
                    )
                  }
                  fieldName="باركود العنصر"
                  placeholder="اختر باركود العنصر"
                  sx={{
                    "& .MuiInputBase-root": {
                      fontSize: "0.95rem",
                      backgroundColor: "#f8fafc",
                      borderRadius: "6px",
                      "&:hover": {
                        backgroundColor: "#f1f5f9",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: "0.95rem",
                      color: "#4b6584",
                      "&.Mui-focused": {
                        color: "#4b6584",
                      },
                    },
                  }}
                />
              </Box>
            </Box>
          )}

          {(reportType === "فواتير" ||
            reportType === "ماكينة" ||
            reportType === "ميكانيزم" ||
            reportType === "مخازن") && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                mb: 1.5,
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 48%" } }}>
                <TextField
                  fullWidth
                  required
                  label="من تاريخ"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.fromDate}
                  onChange={(e) =>
                    handleFilterChange("fromDate", e.target.value)
                  }
                  error={errors.fromDate}
                  helperText={errors.fromDate ? "هذا الحقل مطلوب" : ""}
                  sx={{
                    direction: "rtl",
                    "& .MuiInputBase-root": {
                      fontSize: "0.95rem",
                      backgroundColor: "#f8fafc",
                      borderRadius: "6px",
                      "&:hover": {
                        backgroundColor: "#f1f5f9",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: "0.95rem",
                      color: "#4b6584",
                      "&.Mui-focused": {
                        color: "#4b6584",
                      },
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#e2e8f0",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#4b6584",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#4b6584",
                    },
                    "& .MuiFormHelperText-root": {
                      fontSize: "0.75rem",
                      color: "#d32f2f",
                    },
                  }}
                />
              </Box>
              <Box sx={{ flex: { xs: "1 1 100%", sm: "1 1 48%" } }}>
                <TextField
                  fullWidth
                  required
                  label="إلى تاريخ"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange("toDate", e.target.value)}
                  error={errors.toDate}
                  helperText={errors.toDate ? "هذا الحقل مطلوب" : ""}
                  sx={{
                    direction: "rtl",
                    "& .MuiInputBase-root": {
                      fontSize: "0.95rem",
                      backgroundColor: "#f8fafc",
                      borderRadius: "6px",
                      "&:hover": {
                        backgroundColor: "#f1f5f9",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: "0.95rem",
                      color: "#4b6584",
                      "&.Mui-focused": {
                        color: "#4b6584",
                      },
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#e2e8f0",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#4b6584",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#4b6584",
                    },
                    "& .MuiFormHelperText-root": {
                      fontSize: "0.75rem",
                      color: "#d32f2f",
                    },
                  }}
                />
              </Box>
            </Box>
          )}

          {(reportType === "فواتير" ||
            reportType === "ماكينة" ||
            reportType === "ميكانيزم" ||
            reportType === "مخازن") && (
            <Button
              variant="contained"
              fullWidth
              sx={{
                mt: 2,
                py: 0.8,
                backgroundColor: "#f39c12",
                borderRadius: "6px",
                fontSize: "0.95rem",
                fontWeight: 600,
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
                "&:hover": {
                  backgroundColor: "#e68e0f",
                  boxShadow: "0 3px 8px rgba(0, 0, 0, 0.08)",
                },
              }}
              onClick={handleSearch}
              disabled={isFilteredReportsLoading}
            >
              {isFilteredReportsLoading ? "جاري البحث..." : "بحث"}
            </Button>
          )}

          <SnackBar
            open={openSnackbar}
            message={snackbarMessage}
            type={snackBarType}
            onClose={handleCloseSnackbar}
          />
        </Box>
      )}

      {/* Display search results */}
      {!showFilters && (searchExecuted || searchResults.length > 0) && (
        <Box sx={{ width: "100%", maxWidth: 1200, mt: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <IconButton
              onClick={handleBackToFilters}
              sx={{
                color: "#4b6584",
                "&:hover": { color: "#f39c12" },
                padding: 0,
              }}
            >
              <ArrowBackIcon sx={{ fontSize: "50px" }} />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 600, color: "#1e293b" }}>
              نتائج البحث
            </Typography>
            <Box></Box>
          </Box>
          {(reportType === "ماكينة" || reportType === "ميكانيزم") && (
            <>
              {searchResults?.[0] && (
                <Card
                  sx={{ mb: 3, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
                >
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, color: "#1e293b" }}
                    >
                      تفاصيل
                      {reportType === "ماكينة" ? " الماكينة" : " الميكانيزم"}
                    </Typography>
                    <Typography variant="body1">
                      <strong>المعرف:</strong> {searchResults[0].id}
                    </Typography>
                    <Typography variant="body1">
                      <strong>الاسم:</strong> {searchResults[0].name}
                    </Typography>
                    <Typography variant="body1">
                      <strong>الوصف:</strong>{" "}
                      {searchResults[0].description || "-"}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                sx={{
                  mb: 3,
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                  padding: "4px",
                  direction: "rtl",
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#f39c12",
                    height: "3px",
                    borderRadius: "2px",
                    transition: "all 0.3s ease",
                  },
                  "& .MuiTabs-flexContainer": {
                    justifyContent: "flex-start",
                  },
                }}
              >
                <Tab
                  label="الفواتير"
                  sx={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#4b6584",
                    padding: "12px 24px",
                    borderRadius: "6px",
                    transition: "all 0.2s ease",
                    "&.Mui-selected": {
                      color: "#f39c12",
                      backgroundColor: "#fff",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    },
                    "&:hover": {
                      color: "#f39c12",
                      backgroundColor: "#f1f5f9",
                    },
                  }}
                />
                <Tab
                  label="العناصر"
                  sx={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#4b6584",
                    padding: "12px 24px",
                    borderRadius: "6px",
                    transition: "all 0.2s ease",
                    "&.Mui-selected": {
                      color: "#f39c12",
                      backgroundColor: "#fff",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    },
                    "&:hover": {
                      color: "#f39c12",
                      backgroundColor: "#f1f5f9",
                    },
                  }}
                />
              </Tabs>

              {tabValue === 0 && (
                <CustomDataGrid
                  rows={searchResults[0]?.invoices?.results || []}
                  columns={invoiceColumns}
                  paginationModel={invoicesPaginationModel}
                  onPageChange={(newModel) => {
                    setInvoicesPaginationModel(newModel);
                    setFetchReports(true);
                  }}
                  CustomToolbarFromComponent={(props) => (
                    <CustomToolbar
                      {...props}
                      searchResults={searchResults[0]?.invoices?.results || []}
                      dataType="invoices"
                    />
                  )}
                  pageCount={searchResults[0]?.invoices?.pages || 1}
                  loader={isFilteredReportsLoading}
                  type="invoices"
                  checkBox={false}
                />
              )}

              {tabValue === 1 && (
                <CustomDataGrid
                  rows={searchResults
                    .flatMap((machine) => machine.items?.results || [])
                    .map((item) => ({
                      ...item,
                      id: item.id,
                    }))}
                  columns={itemColumns}
                  paginationModel={itemsPaginationModel}
                  onPageChange={(newModel) => {
                    setItemsPaginationModel(newModel);
                    setFetchReports(true);
                  }}
                  CustomToolbarFromComponent={(props) => (
                    <CustomToolbar
                      {...props}
                      searchResults={searchResults
                        .flatMap((machine) => machine.items?.results || [])
                        .map((item) => ({
                          ...item,
                          id: item.id,
                        }))}
                      dataType="items"
                    />
                  )}
                  pageCount={searchResults[0]?.items?.pages || 1}
                  loader={isFilteredReportsLoading}
                  type="items"
                  checkBox={false}
                />
              )}
            </>
          )}

          {reportType === "مخازن" && (
            <>
              {searchResults.length > 0 ? (
                <ItemDetailsDialog
                  item={searchResults[0]}
                  renderAsDialog={false}
                />
              ) : (
                <CustomDataGrid
                  rows={[]}
                  columns={itemColumns}
                  paginationModel={paginationModel}
                  onPageChange={(newModel) => {
                    setPaginationModel(newModel);
                    setFetchReports(true);
                  }}
                  CustomToolbarFromComponent={(props) => (
                    <CustomToolbar
                      {...props}
                      searchResults={[]}
                      dataType="items"
                    />
                  )}
                  pageCount={1}
                  loader={isFilteredReportsLoading}
                  type="items"
                  checkBox={false}
                />
              )}
            </>
          )}

          {reportType === "فواتير" && (
            <>
              {searchResults?.length > 0 ? (
                <CustomDataGrid
                  rows={searchResults}
                  columns={invoiceColumns}
                  paginationModel={paginationModel}
                  onPageChange={(newModel) => {
                    setPaginationModel({
                      ...newModel,
                      page: newModel.page,
                    });
                    setFetchReports(true);
                  }}
                  CustomToolbarFromComponent={(props) => (
                    <CustomToolbar
                      {...props}
                      searchResults={searchResults}
                      dataType="invoices"
                    />
                  )}
                  pageCount={filteredReportsData?.total_pages || 1} // التأكد من تمرير total_pages
                  loader={isFilteredReportsLoading}
                  type="invoices"
                  checkBox={false}
                />
              ) : (
                <CustomDataGrid
                  rows={[]}
                  columns={invoiceColumns}
                  paginationModel={paginationModel}
                  onPageChange={(newModel) => {
                    setPaginationModel({
                      ...newModel,
                      page: newModel.page,
                    });
                    setFetchReports(true);
                  }}
                  CustomToolbarFromComponent={(props) => (
                    <CustomToolbar
                      {...props}
                      searchResults={[]}
                      dataType="invoices"
                    />
                  )}
                  pageCount={filteredReportsData?.total_pages || 1}
                  loader={isFilteredReportsLoading}
                  type="invoices"
                  checkBox={false}
                />
              )}
            </>
          )}
        </Box>
      )}

      {/* Modal for displaying the invoice */}
      <Dialog open={isModalOpen} onClose={closeModal} maxWidth="lg" fullWidth>
        <Box sx={{ padding: "20px", direction: "rtl" }}>
          {selectedInvoice ? (
            <InvoiceModal
              selectedInvoice={selectedInvoice}
              isEditingInvoice={false}
              editingInvoice={selectedInvoice}
              setEditingInvoice={() => {}}
              show={true}
              selectedNowType={{ type: selectedInvoice.type }}
              addRow={() => {}}
              handleDeleteItemClick={() => {}}
              isPurchasesType={selectedInvoice.type === "purchase"}
              isCreate={false}
              showCommentField={true}
            />
          ) : (
            <Box>لم يتم العثور على الفاتورة</Box>
          )}
        </Box>
      </Dialog>

      <ItemDetailsDialog
        item={selectedItem}
        open={dialogOpen}
        onClose={() => {
          setSelectedItem(null);
          setDialogOpen(false);
        }}
      />
    </Box>
  );
}

import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import CustomAutoCompleteField from "../../components/customAutoCompleteField/CustomAutoCompleteField";
import SnackBar from "../../components/snackBar/SnackBar";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useGetMachinesQuery } from "../services/machineApi";
import { useGetMechanismsQuery } from "../services/mechanismApi";
import { useGetSuppliersQuery } from "../services/supplierApi";
import {
  useGetWarehousesQuery,
  useGetFilteredReportsQuery,
} from "../services/invoice&warehouseApi";

export default function Report() {
  const [reportType, setReportType] = useState("");
  const [filters, setFilters] = useState({
    "اسم الموظف": "",
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
    pageSize: 5,
  });

  // Fetch data from APIs
  const { data: machinesData, isLoading: isMachinesLoading } =
    useGetMachinesQuery({
      page: 0,
      page_size: 1000,
      all: true,
    });
  const { data: mechanismsData, isLoading: isMechanismsLoading } =
    useGetMechanismsQuery({
      page: 0,
      page_size: 1000,
      all: true,
    });
  const { data: suppliersData, isLoading: isSuppliersLoading } =
    useGetSuppliersQuery({
      page: 0,
      page_size: 1000,
      all: true,
    });
  const { data: itemsData, isLoading: isItemsLoading } = useGetWarehousesQuery({
    page: 0,
    page_size: 1000,
    all: true,
  });

  // Fetch filtered reports
  const [fetchReports, setFetchReports] = useState(false);
  const {
    data: filteredReportsData,
    isLoading: isFilteredReportsLoading,
    error: filteredReportsError,
  } = useGetFilteredReportsQuery(
    {
      type: reportType === "فواتير" ? "invoice" : "item",
      page: paginationModel.page,
      page_size: paginationModel.pageSize,
      all: false,
      employee_name: filters["اسم الموظف"],
      client_name: filters["اسم العميل"],
      accreditation_manager: filters["المراجع"],
      warehouse_manager: filters["عامل المخزن"],
      machine: filters["الماكينه"],
      mechanism: filters["الميكانيزم"],
      supplier: filters["اسم المورد"],
      status: filters["الحالة"],
      item_name: filters["عنصر"],
      item_bar: filters["باركود العنصر"],
      start_date: filters.fromDate,
      end_date: filters.toDate,
    },
    { skip: !fetchReports }
  );

  // Define columns for invoices
  const invoiceColumns = [
    { field: "id", headerName: "المعرف", width: 100 },
    { field: "employeeName", headerName: "اسم الموظف", width: 150 },
    { field: "clientName", headerName: "اسم العميل", width: 150 },
    { field: "reference", headerName: "المراجع", width: 150 },
    { field: "storeWorker", headerName: "عامل المخزن", width: 150 },
    { field: "machine", headerName: "الماكينة", width: 150 },
    { field: "mechanism", headerName: "الميكانيزم", width: 150 },
    { field: "supplierName", headerName: "اسم المورد", width: 150 },
    { field: "status", headerName: "الحالة", width: 150 },
    { field: "date", headerName: "التاريخ", width: 150 },
    { field: "amount", headerName: "المبلغ", width: 150 },
  ];

  // Define columns for inventory
  const inventoryColumns = [
    { field: "id", headerName: "المعرف", width: 100 },
    { field: "item", headerName: "العنصر", width: 150 },
    { field: "barcode", headerName: "باركود العنصر", width: 150 },
    { field: "quantity", headerName: "الكمية", width: 150 },
    { field: "location", headerName: "الموقع", width: 150 },
    { field: "date", headerName: "التاريخ", width: 150 },
  ];

  // Dynamic filter options using API data
  const filterOptions = useMemo(
    () => ({
      "اسم الموظف": ["أحمد", "منى", "سعيد"].map((name) => ({ name })),
      "اسم العميل": ["عميل 1", "عميل 2", "عميل 3"].map((name) => ({ name })),
      المراجع: ["مراجع أ", "مراجع ب"].map((name) => ({ name })),
      "عامل المخزن": ["عامل 1", "عامل 2"].map((name) => ({ name })),
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
      الحالة: ["لم تراجع", "لم تؤكد"].map((name) => ({ name })),
      عنصر:
        itemsData?.warehouses?.map((item) => ({ name: item.item_name })) || [],
      "باركود العنصر":
        itemsData?.warehouses?.map((item) => ({ name: item.item_bar })) || [],
    }),
    [machinesData, mechanismsData, suppliersData, itemsData]
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

    // Validate fields for "مخازن"
    if (reportType === "مخازن") {
      if (!filters["عنصر"] && !filters["باركود العنصر"]) {
        errorMessages.push("يجب إدخال اسم العنصر أو باركود العنصر");
      }
    }

    // If there are errors, show SnackBar and stop
    if (errorMessages.length > 0) {
      setOpenSnackbar(true);
      setSnackbarMessage(errorMessages.join("، "));
      setSnackBarType("error");
      return;
    }

    // Trigger API call for filtered reports
    setFetchReports(true);

    // Update search results when data is fetched
    if (filteredReportsData) {
      const results = filteredReportsData.results.map((item) => ({
        ...item,
        employeeName: item.employee_name,
        clientName: item.client_name,
        reference: item.accreditation_manager,
        storeWorker: item.warehouse_manager,
        supplierName: item.supplier,
        item: item.item_name,
        barcode: item.item_bar,
      }));
      setSearchResults(results);
      setPaginationModel({
        page: filteredReportsData.page - 1,
        pageSize: filteredReportsData.page_size,
      });
      setShowFilters(false);
    }

    // Handle API errors
    if (filteredReportsError) {
      setOpenSnackbar(true);
      setSnackbarMessage("فشل في جلب البيانات من السيرفر");
      setSnackBarType("error");
      return;
    }

    // Log data to console
    const searchData = { reportType, filters };
    console.log("Search Data:", JSON.stringify(searchData, null, 2));
  };

  const handleBackToFilters = () => {
    setShowFilters(true);
    setFetchReports(false);
    setSearchResults([]);
  };

  const handleFilterChange = (fieldName, value) => {
    setFilters((prev) => ({
      ...prev,
      [fieldName]: value,
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
    "اسم العميل",
    "المراجع",
    "عامل المخزن",
    "الماكينه",
    "الميكانيزم",
    "اسم المورد",
    "الحالة",
  ];
  const firstRowInvoiceFields = invoiceFields.slice(0, 4);
  const secondRowInvoiceFields = invoiceFields.slice(4, 8);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: !(!showFilters && searchResults.length > 0) && "100vh",
        justifyContent: "center",
        alignItems: "center",
        marginTop: searchResults.length > 0 && "70px",
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
                <MenuItem value="مخازن">مخازن</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {reportType === "فواتير" && (
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
                    <CustomAutoCompleteField
                      isLoading={
                        fieldName === "الماكينه"
                          ? isMachinesLoading
                          : fieldName === "الميكانيزم"
                          ? isMechanismsLoading
                          : fieldName === "اسم المورد"
                          ? isSuppliersLoading
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

          {(reportType === "فواتير" || reportType === "مخازن") && (
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

          {(reportType === "فواتير" || reportType === "مخازن") && (
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
      {!showFilters && searchResults.length > 0 && (
        <Box sx={{ width: "100%", maxWidth: 1200, mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <IconButton
              onClick={handleBackToFilters}
              sx={{
                mr: 1,
                color: "#4b6584",
                "&:hover": {
                  color: "#f39c12",
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b" }}>
              نتائج البحث
            </Typography>
          </Box>
          <CustomDataGrid
            rows={searchResults}
            columns={
              reportType === "فواتير" ? invoiceColumns : inventoryColumns
            }
            paginationModel={paginationModel}
            onPageChange={(newModel) => {
              setPaginationModel(newModel);
              setFetchReports(true);
            }}
            pageCount={filteredReportsData?.total_pages || 1}
            loader={isFilteredReportsLoading}
            type={reportType === "فواتير" ? "invoices" : "inventory"}
            checkBox={false}
          />
        </Box>
      )}
    </Box>
  );
}

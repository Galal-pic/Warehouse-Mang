import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import CustomAutoCompleteField from "../../components/customAutoCompleteField/CustomAutoCompleteField";
import SnackBar from "../../components/snackBar/SnackBar";

export default function Report() {
  const filterOptions = {
    "اسم الموظف": ["أحمد", "منى", "سعيد"].map((name) => ({ name })),
    "اسم العميل": ["عميل 1", "عميل 2", "عميل 3"].map((name) => ({ name })),
    المراجع: ["مرجع أ", "مرجع ب"].map((name) => ({ name })),
    "عامل المخزن": ["عامل 1", "عامل 2"].map((name) => ({ name })),
    الماكينه: ["ماكينة A", "ماكينة B"].map((name) => ({ name })),
    الميكانيزم: ["ميكانيزم X", "ميكانيزم Y"].map((name) => ({ name })),
    "اسم المورد": ["مورد 1", "مورد 2"].map((name) => ({ name })),
    عنصر: ["عنصر 1", "عنصر 2"].map((name) => ({ name })),
    "نوع تقرير المخازن": [
      "بيانات توفر العنصر في المخزن",
      "بيانات سحب العنصر من المخزن",
    ].map((name) => ({ name })),
  };

  // Snackbar state
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setSnackbarMessage("");
    setSnackBarType("");
  };

  const [reportType, setReportType] = useState("");
  const [filters, setFilters] = useState({
    "اسم الموظف": "",
    "اسم العميل": "",
    المراجع: "",
    "عامل المخزن": "",
    الماكينه: "",
    الميكانيزم: "",
    "اسم المورد": "",
    عنصر: "",
    "نوع تقرير المخازن": "",
    fromDate: "",
    toDate: "",
  });
  const [errors, setErrors] = useState({
    fromDate: false,
    toDate: false,
  });

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
      if (!filters["نوع تقرير المخازن"] || !filters["عنصر"]) {
        errorMessages.push("يجب إدخال نوع تقرير المخازن واسم العنصر");
      }
    }

    // If there are errors, show SnackBar and stop
    if (errorMessages.length > 0) {
      setOpenSnackbar(true);
      setSnackbarMessage(errorMessages.join("، "));
      setSnackBarType("error");
      return;
    }

    // Collect search data
    const searchData = {
      reportType,
      filters,
    };

    // Log data to console
    console.log("Search Data:", searchData);

    // Generate JSON string
    const jsonData = JSON.stringify(searchData, null, 2);
  };

  const handleFilterChange = (fieldName, value) => {
    // Update filter state
    setFilters((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear error when a value is entered
    if (fieldName === "fromDate" || fieldName === "toDate") {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: !value,
      }));
    }
    // Reset "عنصر" when "نوع تقرير المخازن" changes
    if (fieldName === "نوع تقرير المخازن") {
      setFilters((prev) => ({
        ...prev,
        عنصر: "",
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
  ];
  const firstRowInvoiceFields = invoiceFields.slice(0, 4);
  const secondRowInvoiceFields = invoiceFields.slice(4, 7);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        justifyContent: "center",
        alignItems: "center",
        // bgcolor: "#f8fafc",
      }}
    >
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <FormControl
            sx={{
              maxWidth: 240,
              width: "100%",
            }}
          >
            <Select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setFilters((prev) => ({
                  ...prev,
                  "اسم الموظف": "",
                  "اسم العميل": "",
                  المراجع: "",
                  "عامل المخزن": "",
                  الماكينه: "",
                  الميكانيزم: "",
                  "اسم المورد": "",
                  عنصر: "",
                  "نوع تقرير المخازن": "",
                }));
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
            {/* First Row: 4 invoice fields */}
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

            {/* Second Row: 3 invoice fields */}
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
                isLoading={false}
                values={filterOptions["نوع تقرير المخازن"]}
                editingItem={{
                  "نوع تقرير المخازن": filters["نوع تقرير المخازن"],
                }}
                setEditingItem={(newItem) =>
                  handleFilterChange(
                    "نوع تقرير المخازن",
                    newItem["نوع تقرير المخازن"]
                  )
                }
                fieldName="نوع تقرير المخازن"
                placeholder="اختر نوع تقرير المخازن"
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
                isLoading={false}
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
                onChange={(e) => handleFilterChange("fromDate", e.target.value)}
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
          >
            بحث
          </Button>
        )}

        {/* Snackbar */}
        <SnackBar
          open={openSnackbar}
          message={snackbarMessage}
          type={snackBarType}
          onClose={handleCloseSnackbar}
        />
      </Box>
    </Box>
  );
}

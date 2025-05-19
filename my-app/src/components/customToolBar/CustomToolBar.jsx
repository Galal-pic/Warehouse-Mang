import React, { useState } from "react";
import { GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { Box, IconButton, Menu, MenuItem } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import * as XLSX from "xlsx";
import SnackBar from "../../components/snackBar/SnackBar";
import { useImportMachinesMutation } from "../../pages/services/machineApi";
import { useImportMechanismMutation } from "../../pages/services/mechanismApi";
import { useImportSupplierMutation } from "../../pages/services/supplierApi";
import { useImportWarehouseMutation } from "../../pages/services/invoice&warehouseApi";
import { supplierApi } from "../../pages/services/supplierApi";
import { machineApi } from "../../pages/services/machineApi";
import { mechanismApi } from "../../pages/services/mechanismApi";
import { useDispatch } from "react-redux";

const CustomToolbar = ({
  initialItems,
  setOpenDialog,
  paginationModel,
  type,
  addPermissions = false,
  columnVisibilityModel,
}) => {
  const primaryColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--primary-color");

  const [importMachines] = useImportMachinesMutation();
  const [importMechanisms] = useImportMechanismMutation();
  const [importSuppliers] = useImportSupplierMutation();
  const [importWarehouses] = useImportWarehouseMutation();
  const dispatch = useDispatch();

  // SnackBar state
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // Menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleExportImport = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const sendDataToEndpoint = async (data) => {
    console.log("Sending data to API:", data);
    try {
      let result;
      if (type === "machine") result = await importMachines(data).unwrap();
      else if (type === "mechanism")
        result = await importMechanisms(data).unwrap();
      else if (type === "supplier")
        result = await importSuppliers(data).unwrap();
      else if (type === "items") result = await importWarehouses(data).unwrap();

      setOpenSnackbar(true);
      setSnackbarMessage("تم إضافة البيانات بنجاح");
      setSnackBarType("success");
      console.log("Data sent successfully", result);
    } catch (error) {
      console.error("Error:", error);
      setOpenSnackbar(true);
      setSnackbarMessage(
        error.data?.message === "Machine already exists"
          ? "الماكينات موجودة بالفعل"
          : "البيانات غير متوافقة"
      );
      setSnackBarType("error");
    }
  };

  const handleImport = (event) => {
    const uploadedFile = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      console.log("Excel Data:", jsonData);
      sendDataToEndpoint(jsonData);
    };
    reader.readAsArrayBuffer(uploadedFile);
    handleClose();
  };

  const handleExportOnePage = () => {
    // Use initialItems directly as it contains the current page's data
    const currentPageRows = initialItems;

    if (!currentPageRows || currentPageRows.length === 0) {
      setOpenSnackbar(true);
      setSnackbarMessage("لا توجد بيانات في الصفحة الحالية للتصدير");
      setSnackBarType("info");
      console.warn("No data available for the current page");
      return;
    }

    // Flatten data based on type
    let exportData = [];
    if (type === "items") {
      // For items, flatten locations
      exportData = currentPageRows.flatMap((item) =>
        item.locations && Array.isArray(item.locations)
          ? item.locations.map((location) => ({
              id: item.id,
              item_name: item.item_name,
              item_bar: item.item_bar,
              location: location.location,
              price_unit: location.price_unit,
              quantity: location.quantity,
            }))
          : item
      );
    } else {
      // For supplier, machine, mechanism, use the data as is
      exportData = currentPageRows.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
      }));
    }

    // Optional: Filter out hidden columns using columnVisibilityModel
    if (columnVisibilityModel) {
      exportData = exportData.map((item) => {
        const filteredItem = {};
        Object.keys(item).forEach((key) => {
          if (columnVisibilityModel[key] !== false) {
            filteredItem[key] = item[key];
          }
        });
        return filteredItem;
      });
    }

    // Create Excel file
    try {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(
        wb,
        `exported_${type}_page_${paginationModel.page + 1}.xlsx`,
        {
          bookType: "xlsx",
          type: "binary",
        }
      );

      setOpenSnackbar(true);
      setSnackbarMessage("تم تصدير الصفحة الحالية بنجاح");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error exporting current page:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("حدث خطأ أثناء تصدير الصفحة");
      setSnackBarType("error");
    }

    handleClose();
  };

  const handleExportAllPages = async () => {
    try {
      let allData = [];
      setOpenSnackbar(true);
      setSnackbarMessage("جارٍ تحميل البيانات، يرجى الانتظار...");
      setSnackBarType("info");

      // Select the appropriate endpoint based on type
      if (type === "supplier") {
        const { data } = await dispatch(
          supplierApi.endpoints.getSuppliers.initiate({ all: true })
        );
        allData = data?.suppliers || [];
      } else if (type === "machine") {
        const { data } = await dispatch(
          machineApi.endpoints.getMachines.initiate({ all: true })
        );
        allData = data?.machines || [];
      } else if (type === "mechanism") {
        const { data } = await dispatch(
          mechanismApi.endpoints.getMechanisms.initiate({ all: true })
        );
        allData = data?.mechanisms || [];
      } else if (type === "items") {
        allData = initialItems.flatMap((item) =>
          item.locations && Array.isArray(item.locations)
            ? item.locations.map((location) => ({
                id: item.id,
                item_name: item.item_name,
                item_bar: item.item_bar,
                location: location.location,
                price_unit: location.price_unit,
                quantity: location.quantity,
              }))
            : item
        );
      }

      if (!allData.length) {
        setOpenSnackbar(true);
        setSnackbarMessage("لا توجد بيانات للتصدير");
        setSnackBarType("info");
        return;
      }

      // Optional: Filter out hidden columns using columnVisibilityModel
      if (columnVisibilityModel) {
        allData = allData.map((item) => {
          const filteredItem = {};
          Object.keys(item).forEach((key) => {
            if (columnVisibilityModel[key] !== false) {
              filteredItem[key] = item[key];
            }
          });
          return filteredItem;
        });
      }

      // Export to Excel
      const ws = XLSX.utils.json_to_sheet(allData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `exported_${type}_all_data.xlsx`, {
        bookType: "xlsx",
        type: "binary",
      });

      setOpenSnackbar(true);
      setSnackbarMessage("تم تصدير جميع البيانات بنجاح");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error exporting all data:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("حدث خطأ أثناء تصدير البيانات");
      setSnackBarType("error");
    }

    handleClose();
  };

  return (
    <GridToolbarContainer>
      <Box
        sx={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        {/* Add New Item */}
        <Box sx={{ alignItems: "center", display: "flex" }}>
          <IconButton
            sx={{
              color: primaryColor,
              padding: "8px",
              borderRadius: "50%",
              cursor: "pointer",
            }}
            onClick={() => {
              if (addPermissions) {
                setOpenDialog(true);
              } else {
                setOpenSnackbar(true);
                setSnackbarMessage("ليس لديك صلاحيات لإضافة عنصر");
                setSnackBarType("info");
              }
            }}
          >
            <AddCircleIcon sx={{ fontSize: "50px" }} fontSize="large" />
          </IconButton>
        </Box>

        {/* Quick Filter */}
        <GridToolbarQuickFilter
          sx={{
            direction: "rtl",
            "& .MuiInputBase-root": {
              padding: "8px",
              backgroundColor: "white",
              width: "500px",
            },
            "& .MuiSvgIcon-root": {
              color: primaryColor,
              fontSize: "2rem",
            },
            "& .MuiInputBase-input": {
              color: "black",
              fontSize: "1.2rem",
              marginRight: "0.5rem",
            },
            "& .MuiInputBase-input::placeholder": {
              fontSize: "1rem",
              color: primaryColor,
            },
            overflow: "hidden",
          }}
          placeholder="ابحث هنا..."
        />

        {/* Export/Import Menu */}
        <Box sx={{ alignItems: "center", display: "flex" }}>
          <IconButton
            onClick={handleExportImport}
            sx={{
              padding: "12px",
              borderRadius: "50%",
              cursor: "pointer",
              color: "white",
            }}
          >
            <ImportExportIcon
              sx={{
                fontSize: "40px",
                backgroundColor: "#4caf50",
                padding: "8px",
                borderRadius: "50%",
              }}
            />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              "aria-labelledby": "export-import-button",
            }}
          >
            <MenuItem>
              <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                Import
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx, .xls"
                style={{ display: "none" }}
                onChange={handleImport}
              />
            </MenuItem>
            <MenuItem onClick={handleExportOnePage}>Export this page</MenuItem>
            <MenuItem onClick={handleExportAllPages}>Export all page</MenuItem>
          </Menu>
        </Box>
      </Box>
      {/* Snackbar */}
      <SnackBar
        open={openSnackbar}
        message={snackbarMessage}
        type={snackBarType}
        onClose={handleCloseSnackbar}
      />
    </GridToolbarContainer>
  );
};

export default CustomToolbar;

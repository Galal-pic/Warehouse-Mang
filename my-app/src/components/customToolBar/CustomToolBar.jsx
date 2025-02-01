import React, { useState } from "react";
import { GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import { Box, IconButton, Menu, MenuItem } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import * as XLSX from "xlsx";
import SnackBar from "../../components/snackBar/SnackBar";

const CustomToolbar = ({
  initialItems,
  primaryColor,
  setOpenDialog,
  API_BASE_URL,
  excelURL,
  fetchItemsData,
}) => {
  // snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  // Handle close snack
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

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
    const accessToken = localStorage.getItem("access_token");
    try {
      const response = await fetch(`${API_BASE_URL}/${excelURL}/excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ data }),
      });
      if (response.ok) {
        await fetchItemsData();
        console.error("Failed to send data");
        setOpenSnackbar(true);
        setSnackbarMessage("تم إضافة البيانات بنجاح");
        setSnackBarType("success");
        console.log("Data sent successfully");
      } else {
        console.error("Failed to send data");
        setOpenSnackbar(true);
        setSnackbarMessage("البيانات غير متوافقه");
        setSnackBarType("error");
      }
    } catch (error) {
      console.error("Error:", error);
      setOpenSnackbar(true);
      setSnackbarMessage(
        "حدث خطأ الرجاء اعادة تحميل الصفحة والمحاوله مره اخرى"
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

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(initialItems || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "exported_data.xlsx", {
      bookType: "xlsx",
      type: "binary",
    });
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
            onClick={() => setOpenDialog(true)}
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
            <MenuItem onClick={handleExport}>Export</MenuItem>
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

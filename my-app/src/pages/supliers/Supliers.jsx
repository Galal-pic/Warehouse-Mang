import styles from "./Supliers.module.css";
import React, { useEffect, useState } from "react";
import { GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import SaveIcon from "@mui/icons-material/Save";
import IconButton from "@mui/material/IconButton";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import "../../colors.css";
import SnackBar from "../../components/snackBar/SnackBar";
import DeleteRow from "../../components/deleteItem/DeleteRow";
import * as XLSX from "xlsx";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import { Menu, MenuItem } from "@mui/material";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";
import CustomInput from "../../components/customEditTextField/CustomInput";

export default function Supliers() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // loaders
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMachinesLoading, setIsMachinesLoading] = useState(false);

  const [initialItems, setInitialItems] = useState([]);

  // fetch invoices
  const fetchItemsData = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    setIsMachinesLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/supplier/`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();

      setInitialItems(data);
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setIsMachinesLoading(false);
    }
  };
  useEffect(() => {
    fetchItemsData();
  }, []);

  // collors
  const primaryColor = getComputedStyle(
    document.documentElement
  ).getPropertyValue("--primary-color");

  // snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  // Handle close snack
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // pagination
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const pageCount = Math.ceil(initialItems.length / paginationModel.pageSize);
  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => ({ ...prev, ...newModel }));
  };

  // add dialog
  const [openDialog, setOpenDialog] = useState(false);

  // add item
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const handleAddItem = async () => {
    const newErrors = {};

    if (newItem.name.trim() === "") {
      newErrors.name = "الحقل مطلوب";
      setErrors(newErrors);
      return;
    }
    if (newItem.description.trim() === "") {
      newErrors.description = "الحقل مطلوب";
      setErrors(newErrors);
      return;
    }

    setIsAdding(true);
    try {
      const accessToken = localStorage.getItem("access_token");

      const response = await fetch(`${API_BASE_URL}/supplier/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create invoice");
      }
      await fetchItemsData();
      setNewItem({
        name: "",
      });
      setErrors({});
      setOpenDialog(false);
      setOpenSnackbar(true);
      setSnackbarMessage("تمت اضافة المورد");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error creating invoice:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("اسم المورد موجود بالفعل");
      setSnackBarType("error");
    } finally {
      setIsAdding(false);
    }
  };

  // toolbar
  function CustomToolbar() {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleExportImport = (event) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const sendDataToEndpoint = async (data) => {
      console.log(data);
      try {
        const response = await fetch(`${API_BASE_URL}/machine/excel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data }),
        });
        if (response.ok) {
          console.log("Data sent successfully");
        } else {
          console.error("Failed to send data");
        }
      } catch (error) {
        console.error("Error:", error);
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
      const ws = XLSX.utils.json_to_sheet(initialItems);
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
          <Box
            sx={{
              alignItems: "center",
              display: "flex",
            }}
          >
            <IconButton
              sx={{
                color: primaryColor,
                padding: "8px",
                borderRadius: "50%",
                cursor: "pointer",
              }}
              onClick={() => setOpenDialog(true)}
            >
              <AddCircleIcon
                sx={{
                  fontSize: "50px",
                }}
                fontSize="large"
              />
            </IconButton>
          </Box>

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
          <Box
            sx={{
              alignItems: "center",
              display: "flex",
            }}
          >
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
              </MenuItem>{" "}
              <MenuItem onClick={handleExport}>Export</MenuItem>
            </Menu>
          </Box>
        </Box>
      </GridToolbarContainer>
    );
  }

  // edit
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItem, setEditingItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const handleSave = async () => {
    if (selectedItem === editingItem) {
      setEditingItem(null);
      setIsEditingItem(false);
      return;
    }

    const hasEmptyValues = Object.values(editingItem).some((value) => {
      if (typeof value === "string") {
        return value.trim() === "";
      }
      return !value;
    });

    if (hasEmptyValues) {
      setOpenSnackbar(true);
      setSnackbarMessage("يرجى ملئ جميع الحقول");
      setSnackBarType("info");
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    setIsUpdating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/supplier/${editingItem.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(editingItem),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update user: ${response.status}`);
      }
      await fetchItemsData();

      setSelectedItem(editingItem);
      setEditingItem(null);
      setIsEditingItem(false);
      setOpenSnackbar(true);
      setSnackbarMessage("تم تحديث المورد");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error updating user:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("اسم المورد موجود بالفعل");
      setSnackBarType("error");
    } finally {
      setIsUpdating(false);
    }
  };

  // columns
  const columns = [
    {
      field: "actions",
      headerName: "الإجراءات",
      renderCell: (params) => {
        if (isEditingItem && editingItem.id === params.id) {
          return (
            <>
              <div>
                <button
                  disabled={isUpdating}
                  className={styles.iconBtn}
                  onClick={() => handleSave()}
                >
                  {isUpdating ? <CircularProgress size={24} /> : <SaveIcon />}
                </button>
                <button
                  className={styles.iconBtn}
                  onClick={() => {
                    setIsEditingItem(false);
                    setEditingItem(null);
                  }}
                  style={{ color: "#d32f2f" }}
                >
                  <ClearOutlinedIcon />
                </button>
              </div>
            </>
          );
        }
        return (
          <>
            <div>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  setIsEditingItem(true);
                  setEditingItem(params.row);
                  setSelectedItem(params.row);
                }}
              >
                <EditIcon />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => handleDeleteClick(params.id)}
                style={{ color: "#d32f2f" }}
              >
                <ClearOutlinedIcon />
              </button>
            </div>
          </>
        );
      },
    },
    {
      field: "description",
      headerName: "الباركود",
      width: 200,
      flex: 1,
      renderCell: (params) => {
        if (isEditingItem && editingItem.id === params.id) {
          return (
            <div style={{ direction: "rtl" }}>
              <CustomInput
                value={editingItem.description || ""}
                onChange={(newValue) => {
                  setEditingItem((prev) => ({
                    ...prev,
                    description: newValue,
                  }));
                }}
                style={{
                  width: "100%",
                  outline: "none",
                  fontSize: "15px",
                  textAlign: "right",
                  border: "none",
                  padding: "10px",
                }}
              />
            </div>
          );
        }
        return params.value;
      },
    },
    {
      field: "name",
      headerName: "اسم المورد",
      flex: 1,
      renderCell: (params) => {
        if (isEditingItem && editingItem?.id === params.id) {
          return (
            <div style={{ direction: "rtl" }}>
              <CustomInput
                value={editingItem.name || ""}
                onChange={(newValue) => {
                  setEditingItem({ ...editingItem, name: newValue });
                }}
              />
            </div>
          );
        }
        return params.value;
      },
    },
    {
      field: "id",
      headerName: "#",
      width: 100,
    },
  ];

  // delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const handleDeleteClick = (id) => {
    setSelectedUserId(id);
    setDeleteDialogOpen(true);
    setDeleteConfirmationText("");
  };

  // delete
  const handleDelete = async () => {
    if (deleteConfirmationText.trim().toLowerCase() === "نعم") {
      const accessToken = localStorage.getItem("access_token");
      setIsDeleting(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/supplier/${selectedUserId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete user");
        }

        setInitialItems((prev) =>
          prev.filter((item) => item.id !== selectedUserId)
        );
        setOpenSnackbar(true);
        setSnackbarMessage("تم حذف المورد");
        setSnackBarType("success");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error("Error deleting user:", error);
        setOpenSnackbar(true);
        setSnackbarMessage(
          "خطأ في حذف المورد اذا استمرت المشكلة حاول اعادة تحميل الصفحة"
        );
        setSnackBarType("error");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* title */}
      <div>
        <h1 className={styles.title}>الموردين</h1>
      </div>

      {/* delete dialog */}
      <DeleteRow
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        deleteConfirmationText={deleteConfirmationText}
        setDeleteConfirmationText={setDeleteConfirmationText}
        handleDelete={handleDelete}
        message={"هل أنت متأكد من رغبتك في حذف هذا المورد؟"}
        loader={isDeleting}
      />

      {/* table */}
      <CustomDataGrid
        rows={initialItems}
        columns={columns}
        paginationModel={paginationModel}
        onPageChange={handlePageChange}
        pageCount={pageCount}
        CustomToolbar={CustomToolbar}
        loader={isMachinesLoading}
        onCellKeyDown={(params, event) => {
          if ([" ", "ArrowLeft", "ArrowRight"].includes(event.key)) {
            event.stopPropagation();
            event.preventDefault();
          }
        }}
      />

      {/* add dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setNewItem({
            name: "",
          });
          setErrors({});
        }}
        sx={{
          marginTop: "30px",
          zIndex: "99999",
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
          }}
        >
          إضافة مورد جديد
        </DialogTitle>
        <DialogContent sx={{ width: "500px" }}>
          <div style={{ marginBottom: "10px", marginTop: "10px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                textAlign: "right",
                fontWeight: "bold",
                color: errors.name ? "#d32f2f" : "#555",
              }}
            >
              الاسم
            </label>
            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "1rem",
                border: errors.name ? "1px solid #d32f2f" : "1px solid #ccc",
                borderRadius: "4px",
                direction: "rtl",
                textAlign: "right",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
              onBlur={(e) => (e.target.style.borderColor = "#ccc")}
            />
            {errors.name && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "0.875rem",
                  marginTop: "5px",
                  display: "block",
                  textAlign: "right",
                }}
              >
                {errors.name}
              </span>
            )}
          </div>
          <div style={{ marginBottom: "10px", marginTop: "10px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                textAlign: "right",
                fontWeight: "bold",
                color: errors.description ? "#d32f2f" : "#555",
              }}
            >
              الباركود
            </label>
            <input
              type="text"
              value={newItem.description}
              onChange={(e) =>
                setNewItem({ ...newItem, description: e.target.value })
              }
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "1rem",
                border: errors.description
                  ? "1px solid #d32f2f"
                  : "1px solid #ccc",
                borderRadius: "4px",
                direction: "rtl",
                textAlign: "right",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
              onBlur={(e) => (e.target.style.borderColor = "#ccc")}
            />
            {errors.description && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "0.875rem",
                  marginTop: "5px",
                  display: "block",
                  textAlign: "right",
                }}
              >
                {errors.description}
              </span>
            )}
          </div>
          <DialogActions
            sx={{
              display: "flex",
              justifyContent: "space-around",
            }}
          >
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                setOpenDialog(false);
                setNewItem({
                  name: "",
                  description: "",
                });
                setErrors({});
              }}
              className={`${styles.cancelCommentButton} ${styles.infoBtn}`}
            >
              الغاء
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddItem}
              className={`${styles.saveButton} ${styles.infoBtn}`}
              disabled={isAdding}
            >
              {isAdding ? <CircularProgress size={24} /> : "إضافة"}
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <SnackBar
        open={openSnackbar}
        message={snackbarMessage}
        type={snackBarType}
        onClose={handleCloseSnackbar}
      />
    </div>
  );
}

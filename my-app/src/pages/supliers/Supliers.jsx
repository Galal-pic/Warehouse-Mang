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


export default function Supliers() {
  const [initialItems, setInitialItems] = useState([]);

  // fetch invoices
  const fetchItemsData = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      const response = await fetch("http://127.0.0.1:5000/machine/", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();

      setInitialItems(data);
    } catch (err) {
      console.error("Error fetching user data:", err);
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
    // description: "",
  });
  const [errors, setErrors] = useState({});
  const handleAddItem = async () => {
    const newErrors = {};

    if (newItem.name.trim() === "") {
      newErrors.name = "الحقل مطلوب";
      setErrors(newErrors);
      return;
    }

    // if (newItem.description.trim() === "") {
    //   newErrors.description = "الحقل مطلوب";
    //   setErrors(newErrors);
    //   return;
    // }

    try {
      const accessToken = localStorage.getItem("access_token");

      const response = await fetch("http://127.0.0.1:5000/machine/", {
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
        // description: "",
      });
      setErrors({});
      setOpenDialog(false);
      setOpenSnackbar(true);
      setSnackbarMessage("تمت اضافة المورد");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error creating invoice:", error);
      setOpenSnackbar(true);
      setSnackbarMessage(error.message || "خطأ في إضافة المورد");
      setSnackBarType("error");
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
      // try {
      //   const response = await fetch("https://your-api-endpoint.com/upload", {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({ data }),
      //   });
      //   if (response.ok) {
      //     console.log("Data sent successfully");
      //   } else {
      //     console.error("Failed to send data");
      //   }
      // } catch (error) {
      //   console.error("Error:", error);
      // }
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
      console.log(editingItem);
      if (typeof value === "string") {
        return value.trim() === "";
      }
      return !value;
    });

    if (editingItem.name.trim() === "") {
      setOpenSnackbar(true);
      setSnackbarMessage("يرجى ملئ جميع الحقول");
      setSnackBarType("info");
      return;
    }

    const accessToken = localStorage.getItem("access_token");
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/machine/${editingItem.id}`,
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
      setSnackbarMessage("خطأ في تحديث المورد");
      setSnackBarType("error");
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
                <button className={styles.iconBtn} onClick={() => handleSave()}>
                  <SaveIcon />
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
    // {
    //   field: "description",
    //   headerName: "الوصف",
    //   width: 200,
    //   flex: 1,
    //   renderCell: (params) => {
    //     if (isEditingItem && editingItem.id === params.id) {
    //       return (
    //         <div style={{ direction: "rtl" }}>
    //           <input
    //             type="text"
    //             value={editingItem.description || ""}
    //             onChange={(e) => {
    //               setEditingItem({
    //                 ...editingItem,
    //                 description: e.target.value,
    //               });
    //             }}
    //             style={{
    //               width: "100%",
    //               outline: "none",
    //               fontSize: "15px",
    //               textAlign: "right",
    //               border: "none",
    //               padding: "10px",
    //             }}
    //           />
    //         </div>
    //       );
    //     }
    //     return params.value;
    //   },
    // },
    {
      field: "name",
      headerName: "اسم المورد",
      width: 100,
      flex: 1,
      renderCell: (params) => {
        if (isEditingItem && editingItem.id === params.id) {
          return (
            <div style={{ direction: "rtl" }}>
              <input
                type="text"
                value={editingItem.name || ""}
                onChange={(e) => {
                  setEditingItem({
                    ...editingItem,
                    name: e.target.value,
                  });
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

      try {
        const response = await fetch(
          `http://127.0.0.1:5000/machine/${selectedUserId}`,
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
        setSnackbarMessage("خطأ في حذف المورد");
        setSnackBarType("error");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
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
      />

      {/* table */}
      <CustomDataGrid
        rows={initialItems}
        columns={columns}
        paginationModel={paginationModel}
        onPageChange={handlePageChange}
        pageCount={pageCount}
        CustomToolbar={CustomToolbar}
      />

      {/* add dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setNewItem({
            name: "",
            // description: "",
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
          {/* 
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
              الوصف
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
          </div> */}

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
                  //   description: "",
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
            >
              إضافة
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
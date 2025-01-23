import styles from "./Items.module.css";
import React, { useEffect, useState } from "react";
import { GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  Modal,
  Divider,
  List,
  ListItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import SaveIcon from "@mui/icons-material/Save";
import IconButton from "@mui/material/IconButton";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import LaunchIcon from "@mui/icons-material/Launch";
import "../../colors.css";
import AddIcon from "@mui/icons-material/Add";
import SnackBar from "../../components/snackBar/SnackBar";
import DeleteRow from "../../components/deleteItem/DeleteRow";
import * as XLSX from "xlsx";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import { Menu, MenuItem } from "@mui/material";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";

export default function Items() {
  const [initialItems, setInitialItems] = useState([]);

  // fetch invoices
  const fetchItemsData = async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    try {
      const response = await fetch("http://127.0.0.1:5000/warehouse/", {
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
    item_name: "",
    item_bar: "",
    locations: [
      {
        location: "",
        price_unit: 0,
        quantity: 0,
      },
    ],
  });
  const [errors, setErrors] = useState({});

  const handleAddItem = async () => {
    const newErrors = {};

    if (newItem.item_name.trim() === "") {
      newErrors.item_name = "الحقل مطلوب";
      setErrors(newErrors);
      return;
    }

    if (newItem.item_bar.trim() === "") {
      newErrors.item_bar = "الحقل مطلوب";
      setErrors(newErrors);
      return;
    }

    const location = newItem.locations[0];

    if (!location.location || location.location.trim() === "") {
      newErrors.locations = [
        { ...newErrors.locations?.[0], location: "الموقع مطلوب" },
      ];
      setErrors(newErrors);
      return;
    }

    if (!location.quantity || location.quantity.toString().trim() === "") {
      newErrors.locations = [
        { ...newErrors.locations?.[0], quantity: "الكمية مطلوبة" },
      ];
      setErrors(newErrors);
      return;
    }

    if (!location.price_unit || location.price_unit.toString().trim() === "") {
      newErrors.locations = [
        { ...newErrors.locations?.[0], price_unit: "السعر مطلوب" },
      ];
      setErrors(newErrors);
      return;
    }

    try {
      const accessToken = localStorage.getItem("access_token");

      const response = await fetch("http://127.0.0.1:5000/warehouse/", {
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
        item_name: "",
        item_bar: "",
        locations: [
          {
            location: "",
            price_unit: 0,
            quantity: 0,
          },
        ],
      });
      setErrors({});
      setOpenDialog(false);
      setOpenSnackbar(true);
      setSnackbarMessage("تمت اضافة المنتج");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error creating invoice:", error);
      setOpenSnackbar(true);
      setSnackbarMessage(error.message || "خطأ في إضافة المنتج");
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
      const ws = XLSX.utils.json_to_sheet(filteredAndFormattedData);
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

  // filters invoices
  const filteredAndFormattedData = initialItems.map((item) => ({
    ...item,
    locations: item.locations.map((loc) => loc.location).join(", "),
  }));

  // columns
  const columns = [
    {
      field: "actions",
      headerName: "الإجراءات",
      renderCell: (params) => (
        <div>
          <button
            className={styles.iconBtn}
            onClick={() => openItem(params.id)}
          >
            <LaunchIcon />
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => handleDeleteClick(params.id)}
            style={{ color: "#d32f2f" }}
          >
            <ClearOutlinedIcon />
          </button>
        </div>
      ),
    },
    {
      field: "locations",
      headerName: "الموقع",
      width: 300,
      flex: 1,
    },
    { field: "item_bar", headerName: "الرمز", width: 200, flex: 1 },

    { field: "item_name", headerName: "اسم المنتج", width: 100, flex: 1 },
    { field: "id", headerName: "#", width: 100 },
  ];

  // modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const openItem = (id) => {
    const item = initialItems.find((item) => item.id === id);
    setSelectedItem(item);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditingItem(false);
    setEditingItem(null);
  };

  // edit
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItem, setEditingItem] = useState(false);
  const handleSave = async () => {
    if (selectedItem === editingItem) {
      setEditingItem(null);
      setIsEditingItem(false);
      return;
    }
    const hasEmptyValues = Object.values(editingItem).some((value) => {
      if (Array.isArray(value)) {
        return value.some(
          (location) =>
            !location.location ||
            location.price_unit === null ||
            location.price_unit === undefined ||
            location.quantity === null ||
            location.quantity === undefined
        );
      }
      return value === null || value === undefined || value === "";
    });

    if (hasEmptyValues) {
      setOpenSnackbar(true);
      setSnackbarMessage("يرجى ملئ جميع الحقول");
      setSnackBarType("info");
      return;
    }

    const itemWithoutId = { ...editingItem };
    delete itemWithoutId.id;

    const accessToken = localStorage.getItem("access_token");

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/warehouse/${editingItem.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(itemWithoutId),
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
      setSnackbarMessage("تم تعديل المنتج");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error updating user:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("خطأ في تحديث المنتج");
      setSnackBarType("error");
    }
  };

  // delete dialog item
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const handleDeleteClick = (id) => {
    setSelectedUserId(id);
    setDeleteDialogOpen(true);
    setDeleteConfirmationText("");
  };

  // delete item
  const handleDelete = async () => {
    if (deleteConfirmationText.trim().toLowerCase() === "نعم") {
      const accessToken = localStorage.getItem("access_token");

      try {
        const response = await fetch(
          `http://127.0.0.1:5000/warehouse/${selectedUserId}`,
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
        setSnackbarMessage("تم حذف المنتج");
        setSnackBarType("success");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error("Error deleting user:", error);
        setOpenSnackbar(true);
        setSnackbarMessage("خطأ في حذف العنصر");
        setSnackBarType("error");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      }
    }
  };

  // delete dialog location
  const [deleteDialogLocationOpen, setDeleteDialogLocationOpen] =
    useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(0);
  const [deleteLocationConfirmationText, setDeleteLocationConfirmationText] =
    useState("");
  const handleDeleteLocationClick = async (location, id) => {
    if (!location || location.trim() === "") {
      setSelectedLocationId(id);
      await handleDeleteLocation(id);
      return;
    }
    setSelectedLocationId(id);
    setDeleteDialogLocationOpen(true);
    setDeleteLocationConfirmationText("");
  };

  // delete location
  const handleDeleteLocation = async (id) => {
    const filteredLocations = editingItem.locations.filter((item, idx) => {
      return idx !== id;
    });
    setEditingItem({
      ...editingItem,
      locations: filteredLocations,
    });
    setDeleteLocationConfirmationText("");
    setSelectedLocationId(null);
    setDeleteDialogLocationOpen(false);
  };

  return (
    <div className={styles.container}>
      {/* title */}
      <div>
        <h1 className={styles.title}>المنتجات</h1>
      </div>

      {/* delete dialog item */}
      <DeleteRow
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        deleteConfirmationText={deleteConfirmationText}
        setDeleteConfirmationText={setDeleteConfirmationText}
        handleDelete={handleDelete}
        message={"هل أنت متأكد من رغبتك في حذف هذا العنصر؟"}
      />

      {/* delete dialog location */}
      <DeleteRow
        deleteDialogOpen={deleteDialogLocationOpen}
        setDeleteDialogOpen={setDeleteDialogLocationOpen}
        deleteConfirmationText={deleteLocationConfirmationText}
        setDeleteConfirmationText={setDeleteLocationConfirmationText}
        handleDelete={() => handleDeleteLocation(selectedLocationId)}
        message={"هل أنت متأكد من رغبتك في حذف هذا الموقع؟"}
        isNessary={false}
      />

      {/* table */}
      <CustomDataGrid
        rows={filteredAndFormattedData}
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
            item_name: "",
            item_bar: "",
            locations: [
              {
                location: "",
                price_unit: 0,
                quantity: 0,
              },
            ],
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
          إضافة عنصر جديد
        </DialogTitle>
        <DialogContent sx={{ width: "500px" }}>
          <div style={{ marginBottom: "10px", marginTop: "10px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                textAlign: "right",
                fontWeight: "bold",
                color: errors.item_name ? "#d32f2f" : "#555",
              }}
            >
              الاسم
            </label>
            <input
              type="text"
              value={newItem.item_name}
              onChange={(e) =>
                setNewItem({ ...newItem, item_name: e.target.value })
              }
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "1rem",
                border: errors.item_name
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
            {errors.item_name && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "0.875rem",
                  marginTop: "5px",
                  display: "block",
                  textAlign: "right",
                }}
              >
                {errors.item_name}
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
                color: errors.item_bar ? "#d32f2f" : "#555",
              }}
            >
              الرمز
            </label>
            <input
              type="text"
              value={newItem.item_bar}
              onChange={(e) =>
                setNewItem({ ...newItem, item_bar: e.target.value })
              }
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "1rem",
                border: errors.item_bar
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
            {errors.item_bar && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "0.875rem",
                  marginTop: "5px",
                  display: "block",
                  textAlign: "right",
                }}
              >
                {errors.item_bar}
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
                color: errors?.locations?.[0]?.location ? "#d32f2f" : "#555",
              }}
            >
              الموقع
            </label>
            <input
              type="text"
              value={newItem?.locations?.[0]?.location || ""}
              onChange={(e) => {
                const updatedLocations = [...newItem.locations];
                updatedLocations[0].location = e.target.value;
                setNewItem({ ...newItem, locations: updatedLocations });
              }}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "1rem",
                border: `1px solid ${
                  errors?.locations?.[0]?.location ? "#d32f2f" : "#ccc"
                }`,
                borderRadius: "4px",
                direction: "rtl",
                textAlign: "right",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1976d2")}
              onBlur={(e) => (e.target.style.borderColor = "#ccc")}
            />
            {errors?.locations?.[0]?.location && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "0.875rem",
                  marginTop: "5px",
                  display: "block",
                  textAlign: "right",
                }}
              >
                {errors.locations[0].location}
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
                color: errors?.locations?.[0]?.quantity ? "#d32f2f" : "#555",
              }}
            >
              الكمية
            </label>
            <input
              type="number"
              min="0"
              value={newItem.locations[0]?.quantity ?? ""}
              onChange={(e) => {
                const value =
                  e.target.value === ""
                    ? ""
                    : Math.max(0, Number(e.target.value));
                const updatedLocations = [...newItem.locations];
                updatedLocations[0].quantity = value;
                setNewItem({ ...newItem, locations: updatedLocations });
              }}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "1rem",
                border: errors?.locations?.[0]?.quantity
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

            {errors?.locations?.[0]?.quantity && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "0.875rem",
                  marginTop: "5px",
                  display: "block",
                  textAlign: "right",
                }}
              >
                {errors.locations[0].quantity}
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
                color: errors?.locations?.[0]?.price_unit ? "#d32f2f" : "#555",
              }}
            >
              سعر القطعة
            </label>
            <input
              type="number"
              min="0"
              value={newItem.locations[0]?.price_unit ?? ""}
              onChange={(e) => {
                const value =
                  e.target.value === ""
                    ? ""
                    : Math.max(0, Number(e.target.value));
                const updatedLocations = [...newItem.locations];
                updatedLocations[0].price_unit = value;
                setNewItem({ ...newItem, locations: updatedLocations });
              }}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "1rem",
                border: errors?.locations?.[0]?.price_unit
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

            {errors?.locations?.[0]?.price_unit && (
              <span
                style={{
                  color: "#d32f2f",
                  fontSize: "0.875rem",
                  marginTop: "5px",
                  display: "block",
                  textAlign: "right",
                }}
              >
                {errors.locations[0].price_unit}
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
                  item_name: "",
                  item_bar: "",
                  locations: [
                    {
                      location: "",
                      price_unit: 0,
                      quantity: 0,
                    },
                  ],
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

      {/* invoice data */}
      <Modal
        open={isModalOpen}
        onClose={closeModal}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        sx={{ zIndex: "99999" }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            bgcolor: "#fff",
            boxShadow: 24,
            backgroundColor: "#f6f6f6",
            p: 4,
            borderRadius: 2,
            maxHeight: "75vh",
            overflowY: "auto",
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: primaryColor,
              borderRadius: "10px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: "#145a9c",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "#f0f0f0",
              borderRadius: "10px",
            },
          }}
        >
          <h5
            id="modal-title"
            variant="h6"
            component="h2"
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "1.2rem",
              marginBottom: "16px",
              color: "#1976d2",
              position: "relative",
              margin: "0 0 20px 0",
            }}
          >
            تفاصيل المنتج
            {isEditingItem ? (
              <div>
                <button
                  onClick={() => {
                    setIsEditingItem(false);
                  }}
                  className={styles.iconBtn}
                  style={{
                    position: "absolute",
                    top: "0px",
                    left: "-10px",
                  }}
                >
                  <ClearOutlinedIcon
                    sx={{
                      fontSize: "30px",
                      color: "#d32f2f",
                    }}
                  />
                </button>
                <button
                  onClick={() => {
                    handleSave();
                  }}
                  className={styles.iconBtn}
                  style={{
                    color: "#1976d2",
                    position: "absolute",
                    top: "0px",
                    left: "20px",
                  }}
                >
                  <SaveIcon />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsEditingItem(true);
                  setEditingItem(selectedItem);
                }}
                className={styles.iconBtn}
                style={{
                  color: "#1976d2",
                  position: "absolute",
                  top: "0px",
                  left: "-7px",
                }}
              >
                <EditIcon />
              </button>
            )}
          </h5>
          {selectedItem && (
            <Box id="modal-description" sx={{ direction: "rtl" }}>
              <Box
                style={{
                  display: "flex",
                  m: 1.5,
                }}
              >
                <h5
                  style={{
                    fontWeight: "bold",
                    minWidth: "150px",
                    color: "#717171",
                  }}
                >
                  اسم المنتج:
                </h5>
                <h5 style={{ flex: 1 }}>
                  {isEditingItem ? (
                    <input
                      type="text"
                      value={editingItem.item_name}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          item_name: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        outline: "none",
                        fontSize: "15px",
                        textAlign: "right",
                        border: "none",
                        padding: "10px",
                      }}
                    />
                  ) : (
                    selectedItem.item_name
                  )}
                </h5>
              </Box>
              <Divider />
              <Box
                style={{
                  display: "flex",
                  m: 1.5,
                }}
              >
                <h5
                  style={{
                    fontWeight: "bold",
                    minWidth: "150px",
                    color: "#717171",
                  }}
                >
                  رمز المنتج:
                </h5>
                <h5 style={{ flex: 1 }}>
                  {isEditingItem ? (
                    <input
                      type="text"
                      value={editingItem.item_bar}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          item_bar: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        outline: "none",
                        fontSize: "15px",
                        textAlign: "right",
                        border: "none",
                        padding: "10px",
                      }}
                    />
                  ) : (
                    selectedItem.item_bar
                  )}
                </h5>
              </Box>
              <Divider />

              <List sx={{ marginTop: 1 }}>
                {((isEditingItem && editingItem) || selectedItem).locations.map(
                  (item, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "#fafafa",
                        borderRadius: "5px",
                        marginBottom: "15px",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.42)",
                        position: "relative",
                      }}
                    >
                      {isEditingItem ? (
                        <button
                          onClick={(e) =>
                            handleDeleteLocationClick(item.location, index)
                          }
                          className={styles.iconBtn}
                          style={{
                            position: "absolute",
                            left: "0px",
                            top: "3px",
                          }}
                        >
                          <ClearOutlinedIcon
                            sx={{
                              fontSize: "30px",
                              color: "#d32f2f",
                            }}
                          />
                        </button>
                      ) : (
                        ""
                      )}
                      <Box
                        sx={{
                          display: "flex",
                          width: "100%",
                        }}
                      >
                        <h5
                          style={{
                            width: "100px",
                            fontWeight: "bold",
                            textAlign: "right",
                          }}
                        >
                          الموقع:
                        </h5>
                        <Box>
                          <h5>
                            {isEditingItem ? (
                              <input
                                type="text"
                                value={
                                  editingItem.locations[index]?.location || ""
                                }
                                onChange={(e) => {
                                  const updatedLocations = [
                                    ...editingItem.locations,
                                  ];
                                  updatedLocations[index] = {
                                    ...updatedLocations[index],
                                    location: e.target.value,
                                  };
                                  setEditingItem({
                                    ...editingItem,
                                    locations: updatedLocations,
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
                            ) : (
                              item.location
                            )}
                          </h5>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          width: "100%",
                        }}
                      >
                        <h5
                          style={{
                            width: "100px",
                            fontWeight: "bold",
                            textAlign: "right",
                          }}
                        >
                          الكمية:
                        </h5>
                        <Box>
                          <h5>
                            {isEditingItem ? (
                              <input
                                type="number"
                                min="0"
                                value={
                                  editingItem.locations[index]?.quantity !==
                                  undefined
                                    ? editingItem.locations[index].quantity
                                    : ""
                                }
                                onInput={(e) => {
                                  if (Number(e.target.value) < 0) {
                                    e.target.value = 0;
                                  }
                                }}
                                onChange={(e) => {
                                  const newQuantity = Number(e.target.value);

                                  if (!isNaN(newQuantity) && newQuantity >= 0) {
                                    const updatedLocations = [
                                      ...editingItem.locations,
                                    ];
                                    updatedLocations[index] = {
                                      ...updatedLocations[index],
                                      quantity: newQuantity,
                                    };
                                    setEditingItem({
                                      ...editingItem,
                                      locations: updatedLocations,
                                    });
                                  }
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
                            ) : (
                              item.quantity
                            )}
                          </h5>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          width: "100%",
                        }}
                      >
                        <h5
                          style={{
                            width: "100px",
                            fontWeight: "bold",
                            textAlign: "right",
                          }}
                        >
                          السعر:
                        </h5>
                        <Box>
                          <h5>
                            {isEditingItem ? (
                              <input
                                type="number"
                                min="0"
                                value={
                                  editingItem.locations[index]?.price_unit !==
                                  undefined
                                    ? editingItem.locations[index].price_unit
                                    : ""
                                }
                                onInput={(e) => {
                                  if (Number(e.target.value) < 0) {
                                    e.target.value = 0;
                                  }
                                }}
                                onChange={(e) => {
                                  const newPriceUnit = Number(e.target.value);
                                  if (
                                    !isNaN(newPriceUnit) &&
                                    newPriceUnit >= 0
                                  ) {
                                    const updatedLocations = [
                                      ...editingItem.locations,
                                    ];
                                    updatedLocations[index] = {
                                      ...updatedLocations[index],
                                      price_unit: newPriceUnit,
                                    };
                                    setEditingItem({
                                      ...editingItem,
                                      locations: updatedLocations,
                                    });
                                  }
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
                            ) : (
                              item.price_unit
                            )}
                          </h5>
                        </Box>
                      </Box>
                    </ListItem>
                  )
                )}
                {isEditingItem && (
                  <button
                    onClick={() => {
                      const newItem = {
                        location: "",
                        quantity: 0,
                        price_unit: 0,
                      };
                      setEditingItem({
                        ...editingItem,
                        locations: [...editingItem.locations, newItem],
                      });
                    }}
                    className={styles.iconBtn}
                    style={{
                      padding: "4px",
                      backgroundColor: "#1976d2",
                      color: "white",
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <AddIcon sx={{ fontSize: "30px" }} />
                  </button>
                )}
              </List>
            </Box>
          )}

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Button
              onClick={closeModal}
              variant="contained"
              color="primary"
              sx={{
                borderRadius: "20px",
                padding: "8px 20px",
              }}
            >
              إغلاق
            </Button>
          </Box>
        </Box>
      </Modal>

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

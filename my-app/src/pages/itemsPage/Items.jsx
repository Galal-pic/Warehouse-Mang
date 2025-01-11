import styles from "./Items.module.css";
import React, { useState } from "react";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  PaginationItem,
  Box,
  Modal,
  Divider,
  List,
  ListItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import SaveIcon from "@mui/icons-material/Save";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import IconButton from "@mui/material/IconButton";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import LaunchIcon from "@mui/icons-material/Launch";
import "../../colors.css";
import AddIcon from "@mui/icons-material/Add";
import SnackBar from "../../components/snackBar/SnackBar";

const CustomPagination = ({ page, count, onChange }) => {
  const handlePageChange = (event, value) => {
    onChange({ page: value - 1 });
  };

  return (
    <Stack
      spacing={2}
      sx={{
        margin: "auto",
        direction: "rtl",
      }}
    >
      <Pagination
        count={count}
        page={page + 1}
        onChange={handlePageChange}
        renderItem={(item) => (
          <PaginationItem
            slots={{ previous: ArrowForwardIcon, next: ArrowBackIcon }}
            {...item}
          />
        )}
      />
    </Stack>
  );
};
export default function Items() {
  const [initialItems, setInitialItems] = useState([
    {
      item_name: "العنصر الاول",
      item_bar: "123",
      locations: [
        {
          location: "في المخزن الاول في الرف الثانى العلوى",
          price_unit: 500,
          quantity: 1000,
        },
        {
          location: "في المخزن الثانى في الرف الثانى العلوى",
          price_unit: 600,
          quantity: 800,
        },
        {
          location: "في المخزن الثالث في الرف الثانى العلوى",
          price_unit: 700,
          quantity: 600,
        },
      ],
    },
    {
      item_name: "العنصر الثانى",
      item_bar: "456",
      locations: [
        {
          location: "في المخزن الاول في الرف الثانى العلوى",
          price_unit: 550,
          quantity: 1100,
        },
        {
          location: "في المخزن الثانى في الرف الثانى العلوى",
          price_unit: 650,
          quantity: 850,
        },
        {
          location: "في المخزن الثالث في الرف الثانى العلوى",
          price_unit: 750,
          quantity: 650,
        },
      ],
    },
    {
      item_name: "العنصر الثالث",
      item_bar: "456",
      locations: [
        {
          location: "في المخزن الاول في الرف الثانى العلوى",
          price_unit: 550,
          quantity: 1100,
        },
        {
          location: "في المخزن الثانى في الرف الثانى العلوى",
          price_unit: 650,
          quantity: 850,
        },
        {
          location: "في المخزن الثالث في الرف الثانى العلوى",
          price_unit: 750,
          quantity: 650,
        },
      ],
    },
    {
      item_name: "العنصر الرابع",
      item_bar: "456",
      locations: [
        {
          location: "في المخزن الاول في الرف الثانى العلوى",
          price_unit: 550,
          quantity: 1100,
        },
        {
          location: "في المخزن الثانى في الرف الثانى العلوى",
          price_unit: 650,
          quantity: 850,
        },
        {
          location: "في المخزن الثالث في الرف الثانى العلوى",
          price_unit: 750,
          quantity: 650,
        },
      ],
    },
  ]);

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

  // dialog
  const [openDialog, setOpenDialog] = useState(false);

  // create id
  initialItems.forEach((row) => {
    row.id = row.item_name;
  });

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
  const handleAddItem = () => {
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

    setInitialItems([...initialItems, newItem]);
    const itemWithoutId = { ...newItem };
    delete itemWithoutId.id;
    console.log(itemWithoutId);
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
  };

  // toolbar
  function CustomToolbar() {
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
              },
              "& .MuiSvgIcon-root": {
                color: primaryColor,
                fontSize: "2rem",
              },
              "& .MuiInputBase-input": {
                color: primaryColor,
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
            onClick={() => handleDelete(params.id)}
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
  ];

  // delete
  const handleDelete = (id) => {
    setInitialItems((prev) => prev.filter((item) => item.id !== id));
    setOpenSnackbar(true);
    setSnackbarMessage("تم حذف المنتج");
    setSnackBarType("success");
  };

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
  const handleSave = () => {
    const hasEmptyValues = Object.values(editingItem).some((value) => {
      if (Array.isArray(value)) {
        return value.some(
          (location) =>
            !location.location || !location.price_unit || !location.quantity
        );
      }
      return !value;
    });

    if (hasEmptyValues) {
      setOpenSnackbar(true);
      setSnackbarMessage("يرجى ملئ جميع الحقول");
      setSnackBarType("info");
      return;
    }

    if (selectedItem === editingItem) {
      setEditingItem(null);
      setIsEditingItem(false);
      return;
    }
    setInitialItems(
      initialItems.map((i) => (i.id === editingItem.id ? editingItem : i))
    );
    setSelectedItem(editingItem);
    setEditingItem(null);
    setIsEditingItem(false);

    const itemWithoutId = { ...editingItem };
    delete itemWithoutId.id;

    setOpenSnackbar(true);
    setSnackbarMessage("تم تعديل المنتج");
    setSnackBarType("success");

    console.log(itemWithoutId);
  };

  return (
    <div className={styles.container}>
      {/* title */}
      <div>
        <h2 className={styles.title}>المنتجات</h2>
      </div>

      {/* table */}
      <DataGrid
        rows={filteredAndFormattedData}
        columns={columns.map((col) => ({
          ...col,
          align: "center",
          headerAlign: "center",
          headerClassName: styles.headerCell,
        }))}
        slots={{
          pagination: CustomPagination,
          toolbar: CustomToolbar,
        }}
        slotProps={{
          pagination: {
            page: paginationModel.page,
            count: pageCount,
            onChange: handlePageChange,
          },
        }}
        pagination
        paginationModel={paginationModel}
        onPaginationModelChange={handlePageChange}
        disableVirtualization={false}
        sx={{
          "& .MuiDataGrid-toolbarContainer": {
            paddingBottom: "10px",
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: "#f7f7f7",
          },
          "& .MuiDataGrid-virtualScroller": {
            borderRadius: "4px",
          },
          "& .MuiDataGrid-cell": {
            border: "1px solid #ddd",
          },
          "&.MuiDataGrid-row:hover": {
            backgroundColor: "#f7f7f7",
          },
          "& .MuiDataGrid-columnSeparator": {},
          "& .MuiDataGrid-cell:focus": {
            outline: "none",
          },
          "& .MuiDataGrid-cell:focus-within": {
            outline: "none",
          },
          backgroundColor: "white",
          border: "none",
          marginTop: "10px",
          // direction: "rtl",
        }}
      />

      {/* dialog */}
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
              value={newItem.locations[0]?.quantity || ""}
              onInput={(e) => {
                if (e.target.value < 0) {
                  e.target.value = 0;
                }
              }}
              onChange={(e) => {
                const newQuantity = Math.max(0, Number(e.target.value));
                const updatedLocations = [...newItem.locations];
                updatedLocations[0].quantity = newQuantity;
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
              value={newItem.locations[0]?.price_unit || ""}
              onChange={(e) => {
                const newPriceUnit = Math.max(0, Number(e.target.value));
                const updatedLocations = [...newItem.locations];
                updatedLocations[0].price_unit = newPriceUnit;
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
                          onClick={(e) => {
                            const filterdLocations =
                              editingItem.locations.filter(
                                (item, idx) => idx !== index
                              );
                            setEditingItem({
                              ...editingItem,
                              locations: filterdLocations,
                            });
                            console.log(filterdLocations);
                          }}
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
                                  editingItem.locations[index]?.quantity || ""
                                }
                                onInput={(e) => {
                                  if (e.target.value < 0) {
                                    e.target.value = 0;
                                  }
                                }}
                                onChange={(e) => {
                                  const newQuantity = Math.max(
                                    0,
                                    Number(e.target.value)
                                  );
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
                                  editingItem.locations[index]?.price_unit || ""
                                }
                                onInput={(e) => {
                                  if (e.target.value < 0) {
                                    e.target.value = 0;
                                  }
                                }}
                                onChange={(e) => {
                                  const newPriceUnit = Math.max(
                                    0,
                                    Number(e.target.value)
                                  );
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
                      console.log(editingItem);
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

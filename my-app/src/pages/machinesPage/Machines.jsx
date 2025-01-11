import styles from "./Machines.module.css";
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
import "../../colors.css";
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
export default function Machines() {
  const [initialItems, setInitialItems] = useState([
    {
      name: "الماكينة الاولى",
      description: "ماكينة A",
    },
    {
      name: "الماكينة الثانية",
      description: "ماكينة B",
    },
    {
      name: "الماكينة الثالثة",
      description: "ماكينة C",
    },
    {
      name: "الماكينة الرابعة",
      description: "ماكينة D",
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
    row.id = row.name;
  });

  // add item
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const handleAddItem = () => {
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

    setInitialItems([...initialItems, newItem]);
    const itemWithoutId = { ...newItem };
    delete itemWithoutId.id;
    console.log(itemWithoutId);
    setNewItem({
      name: "",
      description: "",
    });
    setErrors({});
    setOpenDialog(false);
    setOpenSnackbar(true);
    setSnackbarMessage("تمت اضافة الماكينة");
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

  // edit
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItem, setEditingItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const handleSave = () => {
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
    if (selectedItem === editingItem) {
      setEditingItem(null);
      setIsEditingItem(false);
      return;
    }
    setInitialItems(
      initialItems.map((i) => (i.id === editingItem.id ? editingItem : i))
    );
    console.log(editingItem);
    setSelectedItem(editingItem);
    setEditingItem(null);
    setIsEditingItem(false);
    setOpenSnackbar(true);
    setSnackbarMessage("تم تعديل الماكينة");
    setSnackBarType("success");
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
                onClick={() => handleDelete(params.id)}
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
      headerName: "الوصف",
      width: 200,
      flex: 1,
      renderCell: (params) => {
        if (isEditingItem && editingItem.id === params.id) {
          return (
            <div style={{ direction: "rtl" }}>
              <input
                type="text"
                value={editingItem.description || ""}
                onChange={(e) => {
                  setEditingItem({
                    ...editingItem,
                    description: e.target.value,
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
      field: "name",
      headerName: "اسم الماكينة",
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
  ];

  // delete
  const handleDelete = (id) => {
    setInitialItems((prev) => prev.filter((item) => item.id !== id));
    setOpenSnackbar(true);
    setSnackbarMessage("تم حذف الماكينة");
    setSnackBarType("success");
  };

  return (
    <div className={styles.container}>
      {/* title */}
      <div>
        <h2 className={styles.title}>الماكينات</h2>
      </div>

      {/* table */}
      <DataGrid
        rows={initialItems}
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
        }}
      />

      {/* dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setNewItem({
            name: "",
            description: "",
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
          إضافة ماكينة جديدة
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

import styles from "./Machines.module.css";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import SaveIcon from "@mui/icons-material/Save";
import "../../colors.css";
import SnackBar from "../../components/snackBar/SnackBar";
import DeleteRow from "../../components/deleteItem/DeleteRow";
import CustomDataGrid from "../../components/dataGrid/CustomDataGrid";
import CustomInput from "../../components/customEditTextField/CustomInput";
import {
  useGetMachinesQuery,
  useAddMachineMutation,
  useUpdateMachineMutation,
  useDeleteMachineMutation,
} from "../services/machineApi";
import { useGetUserQuery } from "../services/userApi";

export default function Machines() {
  const { data: user, isLoading: isLoadingUser } = useGetUserQuery();

  // RTK Query Hooks
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => ({ ...prev, ...newModel }));
  };

  const {
    data: machinesData = { machines: [], total_pages: 1 },
    isLoading: isMachinesLoading,
    refetch,
  } = useGetMachinesQuery(
    { page: paginationModel.page, page_size: paginationModel.pageSize },
    { pollingInterval: 300000 }
  );

  useEffect(() => {
    refetch();
  }, []);

  const [addMachine, { isLoading: isAdding }] = useAddMachineMutation();
  const [updateMachine, { isLoading: isUpdating }] = useUpdateMachineMutation();
  const [deleteMachine, { isLoading: isDeleting }] = useDeleteMachineMutation();

  // Snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("");
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // Add dialog
  const [openDialog, setOpenDialog] = useState(false);

  // Add item
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
    try {
      await addMachine(newItem).unwrap();
      await refetch();

      setNewItem({ name: "", description: "" });
      setErrors({});
      setOpenDialog(false);
      setOpenSnackbar(true);
      setSnackbarMessage("تمت اضافة الماكينة");
      setSnackBarType("success");
    } catch (error) {
      if (error.response && error.response.status === "FETCH_ERROR") {
        setOpenSnackbar(true);
        setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
        setSnackBarType("error");
      } else {
        setOpenSnackbar(true);
        setSnackbarMessage("اسم الماكينة موجود بالفعل");
        setSnackBarType("error");
      }
    }
  };

  // Edit
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
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

    try {
      await updateMachine({ id: editingItem.id, ...editingItem }).unwrap();
      await refetch();

      setSelectedItem(editingItem);
      setEditingItem(null);
      setIsEditingItem(false);
      setOpenSnackbar(true);
      setSnackbarMessage("تم تحديث الماكينة");
      setSnackBarType("success");
    } catch (error) {
      if (error.response && error.response.status === "FETCH_ERROR") {
        setOpenSnackbar(true);
        setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
        setSnackBarType("error");
      } else {
        setOpenSnackbar(true);
        setSnackbarMessage("اسم الماكينة موجود بالفعل");
        setSnackBarType("error");
      }
    }
  };

  // Columns
  const columns = [
    {
      field: "actions",
      headerName: "الإجراءات",
      renderCell: (params) => {
        if (isEditingItem && editingItem.id === params.id) {
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
                disabled={isUpdating}
                className={styles.iconBtn}
                onClick={() => handleSave()}
              >
                {isUpdating ? <CircularProgress size={25} /> : <SaveIcon />}
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
          );
        }
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
              className={styles.iconBtn}
              onClick={() => {
                if (user?.machines_can_edit || user?.username === "admin") {
                  setIsEditingItem(true);
                  setEditingItem(params.row);
                  setSelectedItem(params.row);
                } else {
                  setOpenSnackbar(true);
                  setSnackbarMessage("ليس لديك صلاحيات لتعديل عنصر");
                  setSnackBarType("info");
                }
              }}
            >
              <EditIcon />
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => {
                if (user?.machines_can_delete || user?.username === "admin") {
                  handleDeleteClick(params.id);
                } else {
                  setOpenSnackbar(true);
                  setSnackbarMessage("ليس لديك صلاحيات لحذف العنصر");
                  setSnackBarType("info");
                }
              }}
              style={{ color: "#d32f2f" }}
            >
              <ClearOutlinedIcon />
            </button>
          </div>
        );
      },
    },
    {
      field: "description",
      headerName: "الباركود",
      flex: 1,
      renderCell: (params) => {
        if (isEditingItem && editingItem?.id === params.id) {
          return (
            <div style={{ direction: "rtl" }}>
              <CustomInput
                value={editingItem?.description || ""}
                onChange={(newValue) => {
                  setEditingItem((prev) => ({
                    ...prev,
                    description: newValue,
                  }));
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
      flex: 1,
      renderCell: (params) => {
        if (isEditingItem && editingItem?.id === params.id) {
          return (
            <div style={{ direction: "rtl" }}>
              <CustomInput
                value={editingItem?.name || ""}
                onChange={(newValue) => {
                  setEditingItem((prev) => ({
                    ...prev,
                    name: newValue,
                  }));
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

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const handleDeleteClick = (id) => {
    setSelectedUserId(id);
    setDeleteDialogOpen(true);
    setDeleteConfirmationText("");
  };

  // Delete
  const handleDelete = async () => {
    if (deleteConfirmationText.trim().toLowerCase() === "نعم") {
      try {
        await deleteMachine(selectedUserId).unwrap();
        await refetch();

        setOpenSnackbar(true);
        setSnackbarMessage("تم حذف الماكينة");
        setSnackBarType("success");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        if (error.response && error.response.status === "FETCH_ERROR") {
          setOpenSnackbar(true);
          setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
          setSnackBarType("error");
        } else {
          setOpenSnackbar(true);
          setSnackbarMessage(
            "خطأ في حذف الماكينة، قد تكون الماكينة غير موجودة بالفعل، اذا استمرت المشكلة حاول اعادة تحميل الصفحة"
          );
          setSnackBarType("error");
        }
      }
    }
  };

  if (isLoadingUser) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1 className={styles.head}>
          <CircularProgress />
        </h1>
      </div>
    );
  } else {
    if (
      user?.username === "admin" ||
      user?.machines_can_edit ||
      user?.machines_can_add ||
      user?.machines_can_delete
    ) {
      return (
        <div className={styles.container}>
          {/* Title */}
          <div>
            <h1 className={styles.title}>الماكينات</h1>
          </div>

          {/* Delete dialog */}
          <DeleteRow
            deleteDialogOpen={deleteDialogOpen}
            setDeleteDialogOpen={setDeleteDialogOpen}
            deleteConfirmationText={deleteConfirmationText}
            setDeleteConfirmationText={setDeleteConfirmationText}
            handleDelete={handleDelete}
            message={"هل أنت متأكد من رغبتك في حذف هذه الالة؟"}
            loader={isDeleting}
          />

          {/* Table */}
          <CustomDataGrid
            rows={machinesData.machines}
            type="machine"
            columns={columns}
            paginationModel={paginationModel}
            onPageChange={handlePageChange}
            pageCount={machinesData.total_pages}
            setOpenDialog={setOpenDialog}
            loader={isMachinesLoading}
            onCellKeyDown={(params, event) => {
              if ([" ", "ArrowLeft", "ArrowRight"].includes(event.key)) {
                event.stopPropagation();
                event.preventDefault();
              }
            }}
            addPermissions={
              user?.machines_can_add || user?.username === "admin" || false
            }
          />

          {/* Add dialog */}
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
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: "1rem",
                    border: errors.name
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
                  disabled={isAdding}
                  onClick={handleAddItem}
                  className={`${styles.saveButton} ${styles.infoBtn}`}
                >
                  {isAdding ? <CircularProgress size={25} /> : "إضافة"}
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
    } else {
      return (
        <div
          style={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h1 className={styles.head}>هذه الصفحة غير متوفره</h1>
        </div>
      );
    }
  }
}

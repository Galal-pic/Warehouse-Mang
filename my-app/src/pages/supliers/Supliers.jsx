import styles from "./Supliers.module.css";
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
  useGetSuppliersQuery,
  useAddSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from "../services/supplierApi";
import { useGetUserQuery } from "../services/userApi";

export default function Supliers() {
  // RTK Query Hooks
  const {
    data: user,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useGetUserQuery();

  const {
    data: initialItems = [],
    isLoading: isSuppliersLoading,
    refetch,
  } = useGetSuppliersQuery(undefined, { pollingInterval: 300000 });
  useEffect(() => {
    refetch();
    refetchUser();
  }, [refetch, refetchUser]);
  const [addSupplier, { isLoading: isAdding }] = useAddSupplierMutation();
  const [updateSupplier, { isLoading: isUpdating }] =
    useUpdateSupplierMutation();
  const [deleteSupplier, { isLoading: isDeleting }] =
    useDeleteSupplierMutation();

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

    try {
      await addSupplier(newItem).unwrap();
      await refetch();

      setNewItem({ name: "", description: "" });
      setErrors({});
      setOpenDialog(false);
      setOpenSnackbar(true);
      setSnackbarMessage("تمت اضافة المورد");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error creating supplier:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("اسم المورد موجود بالفعل");
      setSnackBarType("error");
    }
  };

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

    try {
      await updateSupplier({ id: editingItem.id, ...editingItem }).unwrap();
      await refetch();

      setSelectedItem(editingItem);
      setEditingItem(null);
      setIsEditingItem(false);
      setOpenSnackbar(true);
      setSnackbarMessage("تم تحديث المورد");
      setSnackBarType("success");
    } catch (error) {
      console.error("Error updating supplier:", error);
      setOpenSnackbar(true);
      setSnackbarMessage("اسم المورد موجود بالفعل");
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
                  if (user?.suppliers?.canEdit || user?.username === "admin") {
                    setIsEditingItem(true);
                    setEditingItem(params.row);
                    setSelectedItem(params.row);
                  } else {
                    setOpenSnackbar(true);
                    setSnackbarMessage("ليس لديك صلاحيات لإضافة عنصر");
                    setSnackBarType("info");
                  }
                }}
              >
                <EditIcon />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  if (
                    user?.suppliers?.canDelete ||
                    user?.username === "admin"
                  ) {
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
      try {
        await deleteSupplier(selectedUserId).unwrap();
        await refetch();

        setOpenSnackbar(true);
        setSnackbarMessage("تم حذف المورد");
        setSnackBarType("success");
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error("Error deleting supplier:", error);
        setOpenSnackbar(true);
        setSnackbarMessage(
          "خطأ في حذف المورد اذا استمرت المشكلة حاول اعادة تحميل الصفحة"
        );
        setSnackBarType("error");
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
          {" "}
          <CircularProgress />
        </h1>
      </div>
    );
  } else {
    if (
      user?.username === "admin" ||
      user?.suppliers?.canEdit ||
      user?.suppliers?.canAdd ||
      user?.suppliers?.canDelete
    ) {
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
            type="supplier"
            columns={columns}
            paginationModel={paginationModel}
            onPageChange={handlePageChange}
            pageCount={pageCount}
            setOpenDialog={setOpenDialog}
            loader={isSuppliersLoading}
            onCellKeyDown={(params, event) => {
              if ([" ", "ArrowLeft", "ArrowRight"].includes(event.key)) {
                event.stopPropagation();
                event.preventDefault();
              }
            }}
            addPermissions={
              user?.suppliers?.canAdd || user?.username === "admin" || false
            }
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

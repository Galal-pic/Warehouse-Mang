// src/features/users/UsersPage.jsx
import React, { useState } from "react";
import styles from "./Users.module.css";
import "../../colors.css";
import CircularProgress from "@mui/material/CircularProgress";
import { Snackbar, Alert } from "@mui/material";

import UsersToolbar from "./UsersToolbar";
import UsersTable from "./UsersTable";

import DeleteRow from "../../components/deleteItem/DeleteRow";
import EditUser from "./components/EditUser";
import ChangePassword from "./components/ChangePassword";

import useUsersData from "./hooks/useUsersData";

export default function UsersPage() {
  // Snackbar
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackBarType, setSnackBarType] = useState("success");

  // Dialog delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Change password modal
  const [changePassOpen, setChangePassOpen] = useState(false);

  // Pagination
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  const {
    user,
    usersData,
    isLoading,
    isLoadingUser,
    refetchUsers,
    deleteUser,
    isDeleting,
  } = useUsersData(paginationModel);

  // Handlers
  const handlePageChange = (newModel) => {
    setPaginationModel((prev) => ({ ...prev, ...newModel }));
  };

  const handleLaunchClick = (id) => {
    const u = usersData.users.find((x) => x.id === id);
    if (u) {
      setSelectedUser(u);
      setIsModalOpen(true);
    } else {
      console.error("User not found");
    }
  };

  const handleDeleteClick = (id) => {
    setSelectedUserId(id);
    setDeleteDialogOpen(true);
    setDeleteConfirmationText("");
  };

  const handleChangePass = (id) => {
    setSelectedUserId(id);
    setChangePassOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmationText.trim().toLowerCase() === "نعم") {
      try {
        await deleteUser(selectedUserId).unwrap();
        setOpenSnackbar(true);
        setSnackbarMessage("تم حذف الموظف بنجاح");
        setSnackBarType("success");
      } catch (error) {
        setOpenSnackbar(true);
        if (error?.response && error?.response?.status === "FETCH_ERROR") {
          setSnackbarMessage("خطأ في الوصول إلى قاعدة البيانات");
        } else {
          setSnackbarMessage("خطأ في حذف الموظف، قد يكون هناك بيانات تتعلق به او انه غير موجود بالفعل");
        }
        setSnackBarType("error");
      } finally {
        setDeleteConfirmationText("");
        setSelectedUserId(null);
        setDeleteDialogOpen(false);
        refetchUsers();
      }
    }
  };

  const handlePasswordChangeSuccess = (message, type) => {
    setOpenSnackbar(true);
    setSnackbarMessage(message);
    setSnackBarType(type);
  };

  // Loading user role
  if (isLoadingUser) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <h1 className={styles.head}><CircularProgress /></h1>
      </div>
    );
  }

  // Only admin can access
  if (user?.username !== "admin") {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <h1 className={styles.head}>هذه الصفحة غير متوفره</h1>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.head}>بيانات الموظفين</h1>

      {/* Delete dialog */}
      <DeleteRow
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        deleteConfirmationText={deleteConfirmationText}
        setDeleteConfirmationText={setDeleteConfirmationText}
        handleDelete={handleDelete}
        message={"هل أنت متأكد من رغبتك في حذف هذا المستخدم؟"}
        loader={isDeleting}
      />

      {/* Table (يمرر التولبار كـ slot للـ DataGrid) */}
      <UsersTable
        rows={usersData.users}
        pageCount={usersData.total_pages}
        paginationModel={paginationModel}
        onPageChange={handlePageChange}
        onLaunch={handleLaunchClick}
        onChangePass={handleChangePass}
        onDelete={handleDeleteClick}
        loading={isLoading}
        CustomToolbarFromComponent={UsersToolbar}
      />

      {/* Edit user modal */}
      {selectedUser && (
        <EditUser open={isModalOpen} onClose={() => setIsModalOpen(false)} user={selectedUser} />
      )}

      {/* Change password modal */}
      <ChangePassword
        open={changePassOpen}
        onClose={() => setChangePassOpen(false)}
        userId={selectedUserId}
        onSuccess={handlePasswordChangeSuccess}
      />

      {/* Snackbar */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={2000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ zIndex: "9999999999999999999999999999999999" }}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity={snackBarType}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
